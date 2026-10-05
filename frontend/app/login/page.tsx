import OriginApp from "../page";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const destination =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";
  return <OriginApp loginPage postLoginPath={destination} />;
}
