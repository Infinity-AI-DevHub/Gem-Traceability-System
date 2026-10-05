"use client";

import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="route-error">
      <AlertTriangle size={30} />
      <h1>We couldn’t open this page</h1>
      <p>Your records are safe. Try loading the page again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
