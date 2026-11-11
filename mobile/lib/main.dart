import 'dart:collection';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:share_plus/share_plus.dart';

final _site = Uri.https('inventory.1ctstore.com', '/dashboard');

bool _isGemTrack(Uri uri) =>
    uri.scheme == _site.scheme &&
    uri.host == _site.host &&
    uri.port == _site.port;

// Gem Track exports CSV and SVG files as in-page blobs.
const _captureExports = r'''
if (location.origin === 'https://inventory.1ctstore.com') {
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!this.download || !this.href.startsWith('blob:' + location.origin + '/')) {
      return click.call(this);
    }
    const filename = this.download;
    fetch(this.href)
      .then(response => response.blob())
      .then(blob => {
        if (blob.size > 20 * 1024 * 1024) throw new Error('Export exceeds 20 MB');
        const reader = new FileReader();
        reader.onload = () => window.flutter_inappwebview.callHandler(
          'shareExport', filename, reader.result.split(',')[1]
        );
        reader.readAsDataURL(blob);
      })
      .catch(() => window.flutter_inappwebview.callHandler('shareExport'));
  };
}
''';

void main() {
  runApp(
    MaterialApp(
      title: 'Gem Track',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: const Color(0xFF153D36)),
      home: const GemTrackScreen(),
    ),
  );
}

class GemTrackScreen extends StatefulWidget {
  const GemTrackScreen({super.key});

  @override
  State<GemTrackScreen> createState() => _GemTrackScreenState();
}

class _GemTrackScreenState extends State<GemTrackScreen> {
  InAppWebViewController? _webView;
  double _progress = 0;
  bool _loadFailed = false;
  bool _canGoBack = false;

  Future<void> _updateHistory(InAppWebViewController controller) async {
    final canGoBack = await controller.canGoBack();
    if (mounted) setState(() => _canGoBack = canGoBack);
  }

  void _retry() {
    setState(() {
      _loadFailed = false;
      _progress = 0;
    });
    _webView?.reload();
  }

  Future<PermissionResponse> _requestCamera(
    InAppWebViewController controller,
    PermissionRequest request,
  ) async {
    final cameraOnly =
        request.resources.isNotEmpty &&
        request.resources.every(
          (resource) => resource == PermissionResourceType.CAMERA,
        );
    final allowed =
        _isGemTrack(request.origin) &&
        cameraOnly &&
        (!Platform.isAndroid || (await Permission.camera.request()).isGranted);
    return PermissionResponse(
      resources: request.resources,
      action: allowed
          ? PermissionResponseAction.GRANT
          : PermissionResponseAction.DENY,
    );
  }

  Future<void> _shareExport(
    InAppWebViewController controller,
    List<dynamic> args,
  ) async {
    final url = await controller.getUrl();
    if (!mounted || url == null || !_isGemTrack(url)) return;
    try {
      if (args.length != 2 || args[0] is! String || args[1] is! String) {
        throw const FormatException('Missing export');
      }
      final filename = (args[0] as String).replaceAll(
        RegExp(r'[^a-zA-Z0-9._-]'),
        '_',
      );
      final mimeType = switch (filename.split('.').last.toLowerCase()) {
        'csv' => 'text/csv',
        'svg' => 'image/svg+xml',
        _ => throw const FormatException('Unknown export format'),
      };
      final encoded = args[1] as String;
      if (encoded.length > 28 * 1024 * 1024) {
        throw const FormatException('Export too large');
      }
      final box = context.findRenderObject() as RenderBox;
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile.fromData(base64Decode(encoded), mimeType: mimeType)],
          fileNameOverrides: [filename],
          sharePositionOrigin: box.localToGlobal(Offset.zero) & box.size,
        ),
      );
    } on Exception {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not share the export.')),
        );
      }
    }
  }

  bool _openPrintWindow(CreateWindowAction action) {
    final url = action.request.url;
    if (url != null && url.toString() != 'about:blank') return false;
    showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog.fullscreen(
        child: SafeArea(
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: CloseButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                ),
              ),
              Expanded(
                child: InAppWebView(
                  windowId: action.windowId,
                  initialSettings: InAppWebViewSettings(
                    useShouldOverrideUrlLoading: true,
                    allowFileAccess: false,
                  ),
                  shouldOverrideUrlLoading: (_, navigation) async =>
                      navigation.request.url.toString() == 'about:blank'
                      ? NavigationActionPolicy.ALLOW
                      : NavigationActionPolicy.CANCEL,
                  onCloseWindow: (_) {
                    if (dialogContext.mounted &&
                        ModalRoute.of(dialogContext)?.isCurrent == true) {
                      Navigator.of(dialogContext).pop();
                    }
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_canGoBack,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _canGoBack) _webView?.goBack();
      },
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              InAppWebView(
                initialUrlRequest: URLRequest(url: WebUri.uri(_site)),
                initialUserScripts: UnmodifiableListView([
                  UserScript(
                    source: _captureExports,
                    injectionTime: UserScriptInjectionTime.AT_DOCUMENT_START,
                    forMainFrameOnly: true,
                  ),
                ]),
                initialSettings: InAppWebViewSettings(
                  useShouldOverrideUrlLoading: true,
                  supportMultipleWindows: true,
                  allowsBackForwardNavigationGestures: true,
                  allowsInlineMediaPlayback: true,
                  mixedContentMode: MixedContentMode.MIXED_CONTENT_NEVER_ALLOW,
                  allowFileAccess: false,
                  allowContentAccess: false,
                  isInspectable: false,
                ),
                onWebViewCreated: (controller) {
                  _webView = controller;
                  controller.addJavaScriptHandler(
                    handlerName: 'shareExport',
                    callback: (args) => _shareExport(controller, args),
                  );
                },
                onCreateWindow: (_, action) async => _openPrintWindow(action),
                shouldOverrideUrlLoading: (controller, navigation) async {
                  final url = navigation.request.url;
                  return !navigation.isForMainFrame ||
                          (url != null && _isGemTrack(url))
                      ? NavigationActionPolicy.ALLOW
                      : NavigationActionPolicy.CANCEL;
                },
                onPermissionRequest: _requestCamera,
                onUpdateVisitedHistory: (controller, _, _) =>
                    _updateHistory(controller),
                onProgressChanged: (_, progress) {
                  if (mounted) setState(() => _progress = progress / 100);
                },
                onReceivedError: (_, request, _) {
                  if (mounted && request.isForMainFrame == true) {
                    setState(() => _loadFailed = true);
                  }
                },
              ),
              if (!_loadFailed && _progress < 1)
                LinearProgressIndicator(
                  value: _progress == 0 ? null : _progress,
                ),
              if (_loadFailed)
                ColoredBox(
                  color: Theme.of(context).colorScheme.surface,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'Could not open Gem Track. Check your connection.',
                          ),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: _retry,
                            child: const Text('Try again'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
