export type GalleryFilterState = {
  people: Set<string>;
  tags: Set<string>;
};

function readIds(value: string | undefined) {
  return new Set((value ?? "").split(",").filter(Boolean));
}

export function matchesGalleryFilters(
  asset: { people?: string; tags?: string },
  filters: GalleryFilterState,
) {
  const people = readIds(asset.people);
  const tags = readIds(asset.tags);
  const matchesPeople = [...filters.people].every((id) => people.has(id));
  const matchesTags = filters.tags.size === 0 || [...filters.tags].some((id) => tags.has(id));
  return matchesPeople && matchesTags;
}

export function readTagsFromUrl(search: string, availableTagIds: ReadonlySet<string>) {
  return new Set(
    new URLSearchParams(search)
      .getAll("tag")
      .filter((tagId) => availableTagIds.has(tagId)),
  );
}

export function writeTagsToUrl(search: string, tagIds: Iterable<string>) {
  const params = new URLSearchParams(search);
  params.delete("tag");
  for (const tagId of [...tagIds].sort()) params.append("tag", tagId);
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function installGalleryFiltering(root: ParentNode = document) {
  const gallery = root.querySelector<HTMLElement>("#gallery-filter")!;
  if (!gallery) return () => {};

  const assets = [...gallery.querySelectorAll<HTMLElement>("#photoswipe a.thumbhash-img")];
  const tagButtons = [...gallery.querySelectorAll<HTMLButtonElement>("[data-gallery-tag]")];
  const availableTagIds = new Set(tagButtons.flatMap((button) => button.dataset.galleryTag ?? []));
  const filters: GalleryFilterState = {
    people: new Set<string>(),
    tags: readTagsFromUrl(window.location.search, availableTagIds),
  };
  const count = gallery.querySelector<HTMLElement>("[data-gallery-result-count]");
  const empty = gallery.querySelector<HTMLElement>("[data-gallery-empty]");
  const clear = gallery.querySelector<HTMLButtonElement>("[data-gallery-tags-clear]");

  function apply() {
    let visible = 0;
    for (const asset of assets) {
      const show = matchesGalleryFilters(asset.dataset, filters);
      const card = asset.closest<HTMLElement>(".asset-wrapper") ?? asset;
      card.hidden = !show;
      card.classList.toggle("gallery-filter-hidden", !show);
      if (show) visible += 1;
    }

    for (const button of tagButtons) {
      const active = filters.tags.has(button.dataset.galleryTag ?? "");
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("active", active);
    }
    if (count) count.textContent = `${visible} of ${assets.length} photos`;
    if (empty) empty.hidden = visible !== 0;
    if (clear) clear.hidden = filters.tags.size === 0;
    gallery.dispatchEvent(new Event("gallery-filter-changed"));
  }

  function syncUrl() {
    const search = writeTagsToUrl(window.location.search, filters.tags);
    history.replaceState(null, "", `${window.location.pathname}${search}${window.location.hash}`);
  }

  function onTagClick(event: Event) {
    const button = event.currentTarget as HTMLButtonElement;
    const tagId = button.dataset.galleryTag;
    if (!tagId) return;
    if (filters.tags.has(tagId)) filters.tags.delete(tagId);
    else filters.tags.add(tagId);
    syncUrl();
    apply();
  }

  function onClear() {
    filters.tags.clear();
    syncUrl();
    apply();
  }

  function onPerson(event: Event) {
    const detail = (event as CustomEvent<{ personId?: string; toggleMode?: string }>).detail;
    if (!detail?.personId) return;
    if (detail.toggleMode === "active") filters.people.add(detail.personId);
    else filters.people.delete(detail.personId);
    apply();
  }

  function onPopState() {
    filters.tags.clear();
    for (const tagId of readTagsFromUrl(window.location.search, availableTagIds)) {
      filters.tags.add(tagId);
    }
    apply();
  }

  tagButtons.forEach((button) => button.addEventListener("click", onTagClick));
  clear?.addEventListener("click", onClear);
  gallery.addEventListener("person", onPerson);
  window.addEventListener("popstate", onPopState);
  apply();

  return () => {
    tagButtons.forEach((button) => button.removeEventListener("click", onTagClick));
    clear?.removeEventListener("click", onClear);
    gallery.removeEventListener("person", onPerson);
    window.removeEventListener("popstate", onPopState);
  };
}
