"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="friendly-error-page">
      <div>
        <span>This page stopped loading</span>
        <h1>We could not finish opening this screen.</h1>
        <p>
          Any changes that already showed a success message are saved. Unsaved
          changes may need to be entered again. Try opening the screen once more.
        </p>
        <button onClick={reset}>Open this screen again</button>
      </div>
    </main>
  );
}
