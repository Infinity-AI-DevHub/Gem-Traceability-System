import Home from "../../page";

export default async function JewelleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Home initialPage="jewellery" initialJewelleryId={id} />;
}
