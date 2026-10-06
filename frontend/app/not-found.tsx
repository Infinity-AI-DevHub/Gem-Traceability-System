import Link from "next/link";

export default function NotFound() {
  return (
    <main className="friendly-error-page">
      <div>
        <span>Page not found</span>
        <h1>We could not find this page.</h1>
        <p>It may have moved or no longer exists.</p>
        <Link href="/dashboard">Go to the home page</Link>
      </div>
    </main>
  );
}
