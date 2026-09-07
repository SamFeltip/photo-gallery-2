import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installGallerySelection, writeSelectionToUrl } from "./gallerySelection";

function renderSelection() {
  document.body.innerHTML = `
    <section data-gallery-selection>
      <button data-selection-start>Select photos</button>
      <div data-selection-toolbar hidden><strong data-selection-count></strong>
        <button data-selection-download-full>Full</button><button data-selection-download-small>Small</button>
        <button data-selection-share>Share</button><button data-selection-clear>Clear</button><button data-selection-done>Done</button>
      </div><p data-selection-status></p>
    </section>
    <div id="gallery-filter">
      <span class="asset-wrapper" data-selection-id="one" data-filename="one.jpg" data-download-full="/one/full" data-download-small="/one/small"><a class="thumbhash-img" href="#one"></a><button data-photo-select></button></span>
      <span class="asset-wrapper" data-selection-id="two" data-filename="two.jpg" data-download-full="/two/full" data-download-small="/two/small"><a class="thumbhash-img" href="#two"></a><button data-photo-select></button></span>
    </div>`;
}

beforeEach(() => {
  history.replaceState(null, "", "/album");
  renderSelection();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("gallery selection", () => {
  it("enters from the keyboard control, selects multiple cards, and exits", () => {
    const cleanup = installGallerySelection();
    document.querySelector<HTMLButtonElement>("[data-selection-start]")!.click();
    const toggles = document.querySelectorAll<HTMLButtonElement>("[data-photo-select]");
    expect(toggles[0]).toHaveFocus();
    toggles[0].click();
    fireEvent.click(document.querySelectorAll("a")[1]);
    expect(document.querySelector("[data-selection-count]")).toHaveTextContent("2 selected");
    expect(location.search).toContain("selected=one");
    expect(location.search).toContain("selected=two");
    document.querySelector<HTMLButtonElement>("[data-selection-done]")!.click();
    expect(document.body).not.toHaveClass("gallery-selection-mode");
    expect(document.querySelector("[data-selection-start]")).toHaveFocus();
    cleanup();
  });

  it("restores valid visible selections from the URL", () => {
    document.querySelector<HTMLElement>('[data-selection-id="two"]')!.hidden = true;
    history.replaceState(null, "", "/album?tag=one&selected=one&selected=two&selected=missing");

    const cleanup = installGallerySelection();

    expect(document.body).toHaveClass("gallery-selection-mode");
    expect(document.querySelector("[data-selection-count]")).toHaveTextContent("1 selected");
    expect(document.querySelector('[data-selection-id="one"]')).toHaveClass("asset-wrapper--selected");
    expect(document.querySelector('[data-selection-id="two"]')).not.toHaveClass("asset-wrapper--selected");
    expect(location.search).toContain("tag=one");
    expect(location.search).not.toContain("selected=two");
    expect(location.search).not.toContain("selected=missing");
    cleanup();
  });

  it("selects on long press, suppresses its click, and cancels after movement", () => {
    vi.useFakeTimers();
    const cleanup = installGallerySelection();
    const anchors = document.querySelectorAll<HTMLAnchorElement>("a");
    fireEvent.pointerDown(anchors[0], { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(600);
    fireEvent.pointerUp(anchors[0], { pointerId: 1 });
    expect(document.querySelector("[data-selection-count]")).toHaveTextContent("1 selected");
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    expect(anchors[0].dispatchEvent(click)).toBe(false);
    expect(document.querySelector("[data-selection-count]")).toHaveTextContent("1 selected");

    fireEvent.pointerDown(anchors[1], { button: 0, pointerId: 2, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(anchors[1], { pointerId: 2, clientX: 40, clientY: 10 });
    vi.advanceTimersByTime(600);
    expect(document.querySelector("[data-selection-count]")).toHaveTextContent("1 selected");
    cleanup();
  });

  it("downloads both sizes and removes a selected card hidden by filtering", () => {
    vi.useFakeTimers();
    const download = vi.fn();
    const cleanup = installGallerySelection(document, { download });
    const toggles = document.querySelectorAll<HTMLButtonElement>("[data-photo-select]");
    toggles[0].click();
    toggles[1].click();
    document.querySelector<HTMLButtonElement>("[data-selection-download-small]")!.click();
    vi.runAllTimers();
    expect(download).toHaveBeenCalledWith("/one/small", "one.jpg");
    expect(download).toHaveBeenCalledWith("/two/small", "two.jpg");

    document.querySelector<HTMLElement>('[data-selection-id="two"]')!.hidden = true;
    document.querySelector("#gallery-filter")!.dispatchEvent(new Event("gallery-filter-changed"));
    expect(document.querySelector("[data-selection-count]")).toHaveTextContent("1 selected");
    cleanup();
  });

  it("uses native sharing and falls back to copying a restorable URL", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    let cleanup = installGallerySelection(document, { share });
    document.querySelector<HTMLButtonElement>("[data-photo-select]")!.click();
    document.querySelector<HTMLButtonElement>("[data-selection-share]")!.click();
    await vi.waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining("selected=one") })));
    cleanup();

    history.replaceState(null, "", "/album");
    renderSelection();
    const copy = vi.fn().mockResolvedValue(undefined);
    cleanup = installGallerySelection(document, { copy });
    document.querySelector<HTMLButtonElement>("[data-photo-select]")!.click();
    document.querySelector<HTMLButtonElement>("[data-selection-share]")!.click();
    await vi.waitFor(() => expect(copy).toHaveBeenCalledWith(expect.stringContaining("selected=one")));
    expect(document.querySelector("[data-selection-status]")).toHaveTextContent("copied");
    cleanup();
  });
});

describe("writeSelectionToUrl", () => {
  it("preserves filters while replacing the selected asset list", () => {
    expect(writeSelectionToUrl("?tag=lake&selected=old", ["one", "two"]))
      .toBe("?tag=lake&selected=one&selected=two");
  });
});
