self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Origin", body: "You have a new update." };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Origin", {
      body: data.body || "You have a new update.",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: data.tag || "origin-update",
      renotify: data.severity === "URGENT",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
