const LONG_PRESS_MS = 550;
const MOVE_TOLERANCE_PX = 12;

export type GallerySelectionDependencies = {
  download?: (url: string, filename: string) => void;
  share?: (data: ShareData) => Promise<void>;
  copy?: (text: string) => Promise<void>;
};

export function writeSelectionToUrl(search: string, assetIds: Iterable<string>) {
  const params = new URLSearchParams(search);
  params.delete("selected");
  for (const assetId of assetIds) params.append("selected", assetId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function defaultDownload(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export function installGallerySelection(
  root: ParentNode = document,
  dependencies: GallerySelectionDependencies = {},
) {
  const controls = root.querySelector<HTMLElement>("[data-gallery-selection]");
  const gallery = root.querySelector<HTMLElement>("#gallery-filter");
  if (!controls || !gallery) return () => {};

  const cards = [...gallery.querySelectorAll<HTMLElement>(".asset-wrapper[data-selection-id]")];
  const cardsById = new Map(cards.map((card) => [card.dataset.selectionId ?? "", card]));
  const selected = new Set(
    new URLSearchParams(window.location.search)
      .getAll("selected")
      .filter((id) => {
        const card = cardsById.get(id);
        return Boolean(card && !card.hidden);
      }),
  );
  const startButton = controls.querySelector<HTMLButtonElement>("[data-selection-start]");
  const toolbar = controls.querySelector<HTMLElement>("[data-selection-toolbar]");
  const count = controls.querySelector<HTMLElement>("[data-selection-count]");
  const status = controls.querySelector<HTMLElement>("[data-selection-status]");
  const clearButton = controls.querySelector<HTMLButtonElement>("[data-selection-clear]");
  const doneButton = controls.querySelector<HTMLButtonElement>("[data-selection-done]");
  const fullButton = controls.querySelector<HTMLButtonElement>("[data-selection-download-full]");
  const smallButton = controls.querySelector<HTMLButtonElement>("[data-selection-download-small]");
  const shareButton = controls.querySelector<HTMLButtonElement>("[data-selection-share]");
  let selectionMode = selected.size > 0;
  let longPressTimer: number | null = null;
  let pointerStart: { x: number; y: number; id: number; anchor: HTMLAnchorElement } | null = null;
  const suppressClick = new WeakSet<HTMLAnchorElement>();

  function setStatus(message: string) {
    if (status) status.textContent = message;
  }

  function syncUrl() {
    const search = writeSelectionToUrl(window.location.search, selected);
    history.replaceState(null, "", `${location.pathname}${search}${location.hash}`);
  }

  function update() {
    document.body.classList.toggle("gallery-selection-mode", selectionMode);
    toolbar?.toggleAttribute("hidden", !selectionMode);
    startButton?.toggleAttribute("hidden", selectionMode);
    for (const card of cards) {
      const active = selected.has(card.dataset.selectionId ?? "");
      card.classList.toggle("asset-wrapper--selected", active);
      const button = card.querySelector<HTMLButtonElement>("[data-photo-select]");
      button?.setAttribute("aria-pressed", String(active));
      if (button) button.ariaLabel = `${active ? "Deselect" : "Select"} ${card.dataset.filename ?? "photo"}`;
    }
    if (count) count.textContent = `${selected.size} selected`;
    for (const button of [clearButton, fullButton, smallButton, shareButton]) {
      if (button) button.disabled = selected.size === 0;
    }
  }

  function enterSelection(focusFirst = false) {
    selectionMode = true;
    update();
    if (focusFirst) {
      cards.find((card) => !card.hidden)
        ?.querySelector<HTMLButtonElement>("[data-photo-select]")?.focus();
    }
  }

  function toggleCard(card: HTMLElement) {
    const id = card.dataset.selectionId;
    if (!id) return;
    enterSelection();
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    syncUrl();
    setStatus(selected.size ? `${selected.size} photos ready to download or share.` : "No photos selected.");
    update();
  }

  function clearSelection() {
    selected.clear();
    syncUrl();
    setStatus("Selection cleared.");
    update();
  }

  function exitSelection() {
    clearSelection();
    selectionMode = false;
    update();
    startButton?.focus();
  }

  function cancelLongPress() {
    if (longPressTimer !== null) window.clearTimeout(longPressTimer);
    longPressTimer = null;
    pointerStart = null;
  }

  function selectedCards() {
    return cards.filter((card) => selected.has(card.dataset.selectionId ?? ""));
  }

  function download(size: "full" | "small") {
    const downloadFile = dependencies.download ?? defaultDownload;
    selectedCards().forEach((card, index) => {
      const url = size === "full" ? card.dataset.downloadFull : card.dataset.downloadSmall;
      if (url) window.setTimeout(() => downloadFile(url, card.dataset.filename ?? "photo"), index * 120);
    });
    setStatus(`Preparing ${selected.size} ${size === "full" ? "full-resolution" : "smaller"} download${selected.size === 1 ? "" : "s"}.`);
  }

  async function shareSelection() {
    const url = new URL(window.location.href);
    url.search = writeSelectionToUrl(url.search, selected);
    const data: ShareData = {
      title: document.title,
      text: `${selected.size} selected photo${selected.size === 1 ? "" : "s"}`,
      url: url.toString(),
    };
    try {
      const share = dependencies.share ?? navigator.share?.bind(navigator);
      if (share) {
        await share(data);
        setStatus("Selection shared.");
      } else {
        const copy = dependencies.copy ?? navigator.clipboard?.writeText.bind(navigator.clipboard);
        if (!copy) throw new Error("Sharing is not supported by this browser.");
        await copy(data.url!);
        setStatus("A link to the selected photos was copied.");
      }
    } catch (cause) {
      setStatus(cause instanceof DOMException && cause.name === "AbortError"
        ? "Sharing cancelled."
        : cause instanceof Error ? cause.message : "Could not share this selection.");
    }
  }

  const cleanups: Array<() => void> = [];
  function listen(target: EventTarget | null | undefined, type: string, handler: EventListener, options?: AddEventListenerOptions | boolean) {
    target?.addEventListener(type, handler, options);
    cleanups.push(() => target?.removeEventListener(type, handler, options));
  }

  listen(startButton, "click", () => enterSelection(true));
  listen(clearButton, "click", clearSelection);
  listen(doneButton, "click", exitSelection);
  listen(fullButton, "click", () => download("full"));
  listen(smallButton, "click", () => download("small"));
  listen(shareButton, "click", () => void shareSelection());

  for (const card of cards) {
    const anchor = card.querySelector<HTMLAnchorElement>("a.thumbhash-img");
    const selectButton = card.querySelector<HTMLButtonElement>("[data-photo-select]");
    listen(selectButton, "click", (event) => { event.preventDefault(); toggleCard(card); });
    listen(anchor, "click", (event) => {
      if (suppressClick.has(anchor!)) {
        suppressClick.delete(anchor!);
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (selectionMode) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleCard(card);
      }
    }, true);
    listen(anchor, "pointerdown", (event) => {
      const pointer = event as PointerEvent;
      if (pointer.button !== 0) return;
      pointerStart = { x: pointer.clientX, y: pointer.clientY, id: pointer.pointerId, anchor: anchor! };
      longPressTimer = window.setTimeout(() => {
        if (!pointerStart) return;
        suppressClick.add(anchor!);
        toggleCard(card);
        navigator.vibrate?.(20);
        longPressTimer = null;
      }, LONG_PRESS_MS);
    });
    listen(anchor, "pointermove", (event) => {
      if (!pointerStart) return;
      const pointer = event as PointerEvent;
      if (pointer.pointerId !== pointerStart.id || Math.hypot(pointer.clientX - pointerStart.x, pointer.clientY - pointerStart.y) > MOVE_TOLERANCE_PX) cancelLongPress();
    });
    listen(anchor, "pointerup", cancelLongPress);
    listen(anchor, "pointercancel", cancelLongPress);
    listen(anchor, "contextmenu", (event) => {
      if (selectionMode || suppressClick.has(anchor!)) event.preventDefault();
    });
  }

  listen(gallery, "gallery-filter-changed", () => {
    let changed = false;
    for (const card of cards) {
      if (card.hidden && selected.delete(card.dataset.selectionId ?? "")) changed = true;
    }
    if (changed) {
      syncUrl();
      setStatus("Hidden photos were removed from the selection.");
      update();
    }
  });
  listen(window, "keydown", (event) => {
    const keyboard = event as KeyboardEvent;
    if (keyboard.key === "Escape" && selectionMode && !document.querySelector('[role="dialog"]:not([hidden])')) exitSelection();
  });

  syncUrl();
  update();
  return () => {
    cancelLongPress();
    cleanups.forEach((cleanup) => cleanup());
    document.body.classList.remove("gallery-selection-mode");
  };
}
