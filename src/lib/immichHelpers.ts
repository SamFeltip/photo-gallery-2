export async function getShareLinks(IMMICH_BASE_URL: string, API_KEY: string) {
  let links = [];
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

  return links.filter(
    (link) => link.expiresAt == null && link.album?.id != null,
  );
}
