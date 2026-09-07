const IMMICH_BASE_URL = import.meta.env.IMMICH_BASE_URL;
const API_KEY = import.meta.env.API_KEY;

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
  let links = null;

  if (!id) {
    throw new Error("No album id provided in route.");
  }

  const res = await fetch(`${IMMICH_BASE_URL}/api/shared-links`, {
    headers: {
      "x-api-key": API_KEY,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch album (${res.status} ${res.statusText})`);
  } else {
    links = await res.json();
  }

  if (!Array.isArray(links)) {
    throw new Error("Unexpected response shape for shared links.");
  }

  const link = links.find((link) => isNonExpiringAlbumShareLink(link, id));

  if (!link) {
    throw new Error(`No shared link found for album id ${id}`);
  }

  return link.key;
}
