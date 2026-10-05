import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-error">
      <h1>Page not found</h1>
      <p>The requested workspace page does not exist.</p>
      <Link href="/dashboard">Return to command centre</Link>
    </main>
  );
}
