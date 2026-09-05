import type { CarouselInstance } from "@fancyapps/ui";

export function clickHeartButton(instance: CarouselInstance) {
  const initSlide = instance.getPage().slides[0];
  if (
    "assetId" in initSlide === false ||
    typeof initSlide.assetId !== "string"
  ) {
    console.error("assetId does not exist");
    return;
  }
  const assetId = initSlide.assetId;
  (document.activeElement as HTMLElement | null)?.blur();
  window.dispatchEvent(
    new CustomEvent("open-fancybox-drawer", {
      detail: { assetId, action: "like" },
    }),
  );
}

export function initHeartButtonIcon(api: CarouselInstance) {
  let button = api
    .getContainer()
    ?.querySelector("button.heart-carosel") as HTMLButtonElement;

  if (!button) {
    console.error("button not found", { button });
    return;
  }

  const pageIndex = api.getPageIndex();
  const activeSlide = api.getOption("slides")[pageIndex];

  if (
    "assetId" in activeSlide === false ||
    typeof activeSlide.assetId !== "string"
  ) {
    setButton(button, false);
    return;
  }

  const albumId = document
    .querySelector("[album-id]")
    ?.getAttribute("album-id");
  if (!albumId) {
    console.error("no album id");
    return;
  }

  const activeAssetId = activeSlide.assetId;
  let hearts: string[] = JSON.parse(
    localStorage.getItem(`hearts-${albumId}`) ?? "[]",
  );

  if (hearts.includes(activeAssetId) === false) {
    setButton(button, false);
    return;
  }

  setButton(button, true);
}

/**
 * run through all "hearted" asset ids and
 * @param setHearts assetIds for assets that have been hearted
 * @returns
 */
export function refreshHearts(setHearts?: string[]) {
  const albumId = document
    .querySelector("[album-id]")
    ?.getAttribute("album-id");
  if (!albumId) {
    console.error("no album id");
    return;
  }

  const hearts: string[] =
    setHearts ?? JSON.parse(localStorage.getItem(`hearts-${albumId}`) ?? "[]");

  const template =
    document.querySelector<HTMLTemplateElement>("template#heart");

  if (!template) {
    console.error("no heart template");
    return;
  }

  const heartWrappers = document.querySelectorAll(
    ".justified-gallery div.heart-wrapper",
  );
  if (!heartWrappers) {
    console.error("no heart wrappers");
    return;
  }

  // remove all hearts
  heartWrappers.forEach((elem) => {
    console.debug("resetting");
    elem.textContent = "";
  });

  // populate valid hearts
  hearts.forEach((assetId) => {
    const albumWrapper =
      document
        .querySelector(`span.asset-wrapper a[data-asset-id="${assetId}"]`)
        ?.closest<HTMLSpanElement>("span.asset-wrapper") ?? null;

    if (!albumWrapper) {
      console.error("no album wrapper for assetId", { assetId });
      return;
    }

    const heartWrapper = albumWrapper.querySelector("div.heart-wrapper");

    if (!heartWrapper) {
      console.error("no heart wrapper for assetId", { assetId });
      return;
    }

    heartWrapper.replaceChildren(template.content.cloneNode(true));
  });
}

function setButton(button: HTMLButtonElement, state: boolean) {
  const heartButtonEmptyIconTemplate: HTMLTemplateElement | null =
    document.querySelector("template#heart-button");
  const heartButtonFilledIconTemplate: HTMLTemplateElement | null =
    document.querySelector("template#heart-button-filled");

  if (!heartButtonEmptyIconTemplate || !heartButtonFilledIconTemplate) {
    throw new Error("templates do not exist");
  }

  if (state) {
    button.replaceChildren(
      heartButtonFilledIconTemplate.content.cloneNode(true),
    );
    button.ariaPressed = "true";
  } else {
    button.replaceChildren(
      heartButtonEmptyIconTemplate.content.cloneNode(true),
    );
    button.ariaPressed = "false";
  }
}

function toggleButton(button: HTMLButtonElement) {
  if (button.ariaPressed === "true") {
    setButton(button, false);
  } else {
    setButton(button, true);
  }
}
