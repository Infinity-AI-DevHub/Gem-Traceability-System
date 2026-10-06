"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="friendly-error-page">
      <div>
        <span>Something went wrong</span>
        <h1>We could not open this page.</h1>
        <p>Your information is safe. Please try opening the page again.</p>
        <button onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
