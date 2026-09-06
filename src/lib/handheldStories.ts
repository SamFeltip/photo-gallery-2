import type { GalleryTag } from "@/lib/galleryTags";
import { prefetchImage } from "@/lib/imagePrefetch";
import type { AssetStack } from "@/types/assets";

const STORY_DURATION_MS = 7_000;
const STORY_TICK_MS = 100;

export type HandheldStory = {
  assetId: string;
  description: string;
  fullUrl: string;
  thumbnailUrl: string;
};

export function getHandheldAssets(
  displayAssets: AssetStack[],
  tags: GalleryTag[],
  tagIdsByAssetId: Record<string, string[]>,
) {
  const handheldTagIds = new Set(
    tags
      .filter((tag) => [tag.name, tag.value].some((value) => value.toLowerCase() === "handheld"))
      .map(({ id }) => id),
  );

  return displayAssets
    .flatMap(({ bestItem, stackItems }) => [bestItem, ...(stackItems ?? [])])
    .filter((asset) =>
      (tagIdsByAssetId[asset.id] ?? []).some((tagId) => handheldTagIds.has(tagId)),
    )
    .sort((left, right) =>
      Date.parse(left.localDateTime ?? left.fileCreatedAt) -
      Date.parse(right.localDateTime ?? right.fileCreatedAt),
    );
}

type StoryElements = {
  assetId: string;
  description: string;
  fullUrl: string;
};

export function installHandheldStories(root: ParentNode = document) {
  const section = root.querySelector<HTMLElement>("[data-handheld-stories]");
  if (!section) return () => {};

  const cards = [...section.querySelectorAll<HTMLButtonElement>("[data-story-open]")];
  const viewer = section.querySelector<HTMLElement>("[data-story-viewer]")!;
  if (!viewer) return () => {};
  const image = viewer.querySelector<HTMLImageElement>("[data-story-image]")!;
  const caption = viewer.querySelector<HTMLElement>("[data-story-caption]")!;
  const currentLabel = viewer.querySelector<HTMLElement>("[data-story-current]")!;
  const progressBars = [...viewer.querySelectorAll<HTMLElement>("[data-story-progress]")];
  const closeButton = viewer.querySelector<HTMLButtonElement>("[data-story-close]")!;
  const pauseButton = viewer.querySelector<HTMLButtonElement>("[data-story-pause]")!;
  const previousButton = viewer.querySelector<HTMLButtonElement>("[data-story-previous]");
  const nextButton = viewer.querySelector<HTMLButtonElement>("[data-story-next]");
  const loveButton = viewer.querySelector<HTMLButtonElement>("[data-story-love]");
  const commentButton = viewer.querySelector<HTMLButtonElement>("[data-story-comment]");
  if (!viewer || !image || !caption || !currentLabel || !closeButton || !pauseButton) {
    return () => {};
  }

  const stories: StoryElements[] = cards.map((card) => ({
    assetId: card.dataset.assetId ?? "",
    description: card.dataset.description ?? "Photo story",
    fullUrl: card.dataset.fullUrl ?? "",
  }));
  let activeIndex: number | null = null;
  let paused = false;
  let progress = 0;
  let pointerStartY: number | null = null;
  let restoreFocus: HTMLElement | null = null;
  let activityReturnFocus: HTMLElement | null = null;
  let previousBodyOverflow = "";
  let inertStates = new Map<HTMLElement, boolean>();
  let pointerId: number | null = null;
  let suppressClick = false;
  let imageReady = false;
  const viewerParent = viewer.parentNode;
  const viewerNextSibling = viewer.nextSibling;

  function preloadNeighbors() {
    if (activeIndex === null) return;
    for (const index of [activeIndex - 1, activeIndex + 1]) {
      const url = stories[index]?.fullUrl;
      if (url) prefetchImage(url);
    }
  }

  function renderProgress() {
    progressBars.forEach((bar, index) => {
      const value = index < activeIndex! ? 1 : index === activeIndex ? progress : 0;
      bar.style.transform = `scaleX(${value})`;
    });
  }

  function renderPausedState() {
    pauseButton.textContent = paused ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-label", paused ? "Resume story" : "Pause story");
  }

  function renderStory() {
    if (activeIndex === null) return;
    const story = stories[activeIndex];
    imageReady = false;
    viewer.classList.add("story-viewer--loading");
    image.src = story.fullUrl;
    image.alt = story.description;
    caption.textContent = story.description;
    currentLabel.textContent = `${activeIndex + 1} / ${stories.length}`;
    viewer.setAttribute("aria-label", `Story ${activeIndex + 1} of ${stories.length}: ${story.description}`);
    previousButton?.toggleAttribute("disabled", activeIndex === 0);
    nextButton?.toggleAttribute("disabled", activeIndex === stories.length - 1);
    if (image.complete && image.naturalWidth > 0) {
      imageReady = true;
      viewer.classList.remove("story-viewer--loading");
    }
    renderPausedState();
    renderProgress();
    preloadNeighbors();
  }

  function onImageLoad() {
    imageReady = true;
    viewer.classList.remove("story-viewer--loading", "story-viewer--error");
  }

  function onImageError() {
    imageReady = false;
    paused = true;
    viewer.classList.remove("story-viewer--loading");
    viewer.classList.add("story-viewer--error");
    caption.textContent = "This story could not be loaded.";
    renderPausedState();
  }

  function setBackgroundInert(inert: boolean) {
    if (inert) {
      inertStates = new Map();
      for (const child of document.body.children) {
        if (!(child instanceof HTMLElement) || child === viewer) continue;
        inertStates.set(child, child.inert);
        child.inert = true;
      }
      return;
    }
    for (const [element, wasInert] of inertStates) element.inert = wasInert;
    inertStates.clear();
  }

  function open(index: number, trigger: HTMLElement) {
    restoreFocus = trigger;
    activeIndex = index;
    paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    progress = 0;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.append(viewer);
    setBackgroundInert(true);
    viewer.hidden = false;
    renderStory();
    closeButton.focus();
  }

  function close() {
    viewer.hidden = true;
    activeIndex = null;
    paused = false;
    progress = 0;
    document.body.style.overflow = previousBodyOverflow;
    setBackgroundInert(false);
    if (viewerParent) viewerParent.insertBefore(viewer, viewerNextSibling);
    requestAnimationFrame(() => restoreFocus?.focus());
  }

  function move(direction: 1 | -1) {
    if (activeIndex === null) return;
    const next = activeIndex + direction;
    if (next < 0 || next >= stories.length) return;
    activeIndex = next;
    progress = 0;
    renderStory();
  }

  function togglePaused() {
    paused = !paused;
    renderPausedState();
  }

  function openActivity(action: "like" | "comment") {
    if (activeIndex === null) return;
    paused = true;
    renderPausedState();
    activityReturnFocus = document.activeElement as HTMLElement | null;
    (document.activeElement as HTMLElement | null)?.blur();
    window.dispatchEvent(new CustomEvent("open-fancybox-drawer", {
      detail: { assetId: stories[activeIndex].assetId, action },
    }));
  }

  const cardHandlers = cards.map((card, index) => {
    const handler = () => open(index, card);
    card.addEventListener("click", handler);
    return () => card.removeEventListener("click", handler);
  });
  const handlers: Array<[EventTarget | null | undefined, string, EventListener]> = [
    [closeButton, "click", close],
    [pauseButton, "click", togglePaused],
    [previousButton, "click", () => move(-1)],
    [nextButton, "click", () => move(1)],
    [loveButton, "click", () => openActivity("like")],
    [commentButton, "click", () => openActivity("comment")],
  ];
  handlers.forEach(([target, type, handler]) => target?.addEventListener(type, handler));

  function onKeyDown(event: KeyboardEvent) {
    if (activeIndex === null || event.defaultPrevented) return;
    if (document.querySelector('.activity-drawer[data-state="open"]')) return;
    if (event.key === "Tab") {
      const focusable = [...viewer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hidden);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === "Escape") close();
    else if (event.key === "ArrowDown" || event.key === "ArrowRight") move(1);
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") move(-1);
    else if (event.key === " ") {
      event.preventDefault();
      togglePaused();
    }
  }

  function onPointerDown(event: PointerEvent) {
    if ((event.target as Element).closest(".story-viewer__topbar, .story-viewer__actions")) return;
    pointerId = event.pointerId;
    pointerStartY = event.clientY;
  }

  function onPointerUp(event: PointerEvent) {
    if (pointerStartY === null || event.pointerId !== pointerId) return;
    const distance = event.clientY - pointerStartY;
    pointerStartY = null;
    pointerId = null;
    if (Math.abs(distance) > 50) {
      suppressClick = true;
      move(distance < 0 ? 1 : -1);
      window.setTimeout(() => { suppressClick = false; }, 0);
    }
  }

  function onPointerCancel() {
    pointerStartY = null;
    pointerId = null;
  }

  function onViewerClick(event: MouseEvent) {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function onDrawerState(event: Event) {
    const open = (event as CustomEvent<{ open?: boolean }>).detail?.open;
    if (!open && activeIndex !== null && activityReturnFocus) {
      activityReturnFocus.focus();
      activityReturnFocus = null;
    }
  }

  window.addEventListener("keydown", onKeyDown);
  viewer.addEventListener("pointerdown", onPointerDown);
  viewer.addEventListener("pointerup", onPointerUp);
  viewer.addEventListener("pointercancel", onPointerCancel);
  viewer.addEventListener("click", onViewerClick, true);
  image.addEventListener("load", onImageLoad);
  image.addEventListener("error", onImageError);
  window.addEventListener("fancybox-drawer-state", onDrawerState);
  const interval = window.setInterval(() => {
    if (activeIndex === null || paused || !imageReady || document.hidden) return;
    progress = Math.min(progress + STORY_TICK_MS / STORY_DURATION_MS, 1);
    if (progress >= 1) {
      if (activeIndex < stories.length - 1) move(1);
      else {
        paused = true;
        renderPausedState();
      }
    }
    renderProgress();
  }, STORY_TICK_MS);

  return () => {
    cardHandlers.forEach((cleanup) => cleanup());
    handlers.forEach(([target, type, handler]) => target?.removeEventListener(type, handler));
    window.removeEventListener("keydown", onKeyDown);
    viewer.removeEventListener("pointerdown", onPointerDown);
    viewer.removeEventListener("pointerup", onPointerUp);
    viewer.removeEventListener("pointercancel", onPointerCancel);
    viewer.removeEventListener("click", onViewerClick, true);
    image.removeEventListener("load", onImageLoad);
    image.removeEventListener("error", onImageError);
    window.removeEventListener("fancybox-drawer-state", onDrawerState);
    window.clearInterval(interval);
    if (activeIndex !== null) {
      document.body.style.overflow = previousBodyOverflow;
      setBackgroundInert(false);
    }
  };
}
