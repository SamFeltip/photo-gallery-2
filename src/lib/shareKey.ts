import { getAllSharedLinks } from "@immich/sdk";

type AlbumShareLink = {
  album?: { id?: string };
  expiresAt?: string | null;
};

export function isNonExpiringAlbumShareLink(
  link: AlbumShareLink,
  albumId: string,
) {
  return (
    link.album?.id === albumId &&
    link.expiresAt == null
  );
}

export async function getShareKey(id: string) {
  if (!id) {
    throw new Error("No album id provided in route.");
  }

  const links = await getAllSharedLinks({ albumId: id });

  const link = links.find((link) => isNonExpiringAlbumShareLink(link, id));

  if (!link) {
    throw new Error(`No shared link found for album id ${id}`);
  }

  return link.key;
}
