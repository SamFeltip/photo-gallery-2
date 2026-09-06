const storageKey = (albumId: string) => `guest-loves-${albumId}`;

export function getGuestLovedAssetIds(albumId: string) {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(albumId)) ?? "[]");
    return Array.isArray(value)
      ? value.filter((assetId): assetId is string => typeof assetId === "string")
      : [];
  } catch {
    return [];
  }
}

export function isGuestLoved(albumId: string, assetId: string) {
  return getGuestLovedAssetIds(albumId).includes(assetId);
}

export function toggleGuestLove(albumId: string, assetId: string) {
  const lovedAssets = new Set(getGuestLovedAssetIds(albumId));
  if (lovedAssets.has(assetId)) lovedAssets.delete(assetId);
  else lovedAssets.add(assetId);
  localStorage.setItem(storageKey(albumId), JSON.stringify([...lovedAssets]));
  return lovedAssets.has(assetId);
}
