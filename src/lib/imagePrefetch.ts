const prefetchedUrls = new Set<string>();

export function prefetchImage(url: string) {
  if (!url || prefetchedUrls.has(url)) return;
  prefetchedUrls.add(url);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

export function getNeighborIndexes(currentIndex: number, length: number) {
  if (length < 2) return [];
  return [
    (currentIndex - 1 + length) % length,
    (currentIndex + 1) % length,
  ].filter((index, position, indexes) => indexes.indexOf(index) === position);
}

export function installIntentPrefetch(root: ParentNode = document) {
  const cleanups: Array<() => void> = [];
  for (const element of root.querySelectorAll<HTMLElement>("[data-prefetch-src]")) {
    const prefetch = () => prefetchImage(element.dataset.prefetchSrc ?? "");
    element.addEventListener("pointerenter", prefetch, { passive: true });
    element.addEventListener("focus", prefetch, { passive: true });
    element.addEventListener("touchstart", prefetch, { passive: true });
    cleanups.push(() => {
      element.removeEventListener("pointerenter", prefetch);
      element.removeEventListener("focus", prefetch);
      element.removeEventListener("touchstart", prefetch);
    });
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}
