import OriginApp from "../../page";

export default async function StonePage({ params }: PageProps<"/stones/[id]">) {
  const { id } = await params;
  return <OriginApp initialPage="stone" initialStoneId={id} />;
}
