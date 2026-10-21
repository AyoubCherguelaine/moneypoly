import SessionRoom from "@/components/session-room";
export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ username?: string }>;
}) {
  const { id } = await params;
  const { username } = await searchParams;
  return (
    <SessionRoom
      id={id}
      suggestedName={typeof username === "string" ? username : ""}
    />
  );
}
