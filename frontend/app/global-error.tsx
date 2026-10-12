"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="friendly-error-page">
          <div>
            <span>The app did not finish loading</span>
            <h1>Origin could not start this screen.</h1>
            <p>
              Check your internet connection, then try again. Any action that
              already showed a success message remains saved.
            </p>
            <button onClick={reset}>Open the app again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
