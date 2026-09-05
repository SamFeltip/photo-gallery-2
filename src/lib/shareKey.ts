import { getAllSharedLinks } from "@immich/sdk";

export async function getShareKey(id: string) {
  if (!id) {
    throw new Error("No album id provided in route.");
  }

  const links = await getAllSharedLinks({ albumId: id });

  const link = links.find(
    (link) =>
      link.album?.id === id &&
      (link.expiresAt == null || new Date(link.expiresAt) > new Date()),
  );

  if (!link) {
    throw new Error(`No shared link found for album id ${id}`);
  }

  return link.key;
}
