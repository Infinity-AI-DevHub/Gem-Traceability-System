import OriginApp from "../../../page";

export default async function EditStonePage({
  params,
}: PageProps<"/stones/[id]/edit">) {
  const { id } = await params;
  return (
    <OriginApp initialPage="intake" initialStoneId={id} initialEditing={id} />
  );
}
