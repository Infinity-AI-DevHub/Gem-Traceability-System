"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="friendly-error-page">
          <div>
            <span>We need a moment</span>
            <h1>The app could not open correctly.</h1>
            <p>Your information is safe. Tap below to try again.</p>
            <button onClick={reset}>Open the app again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
