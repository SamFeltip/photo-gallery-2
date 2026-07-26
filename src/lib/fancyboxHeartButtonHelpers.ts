import type { CarouselInstance } from "@fancyapps/ui";

export function clickHeartButton(instance: CarouselInstance) {
  const initSlide = instance.getPage().slides[0];
  if ("assetId" in initSlide && typeof initSlide.assetId === "string") {
    const assetId = initSlide.assetId;

    let hearts: string[] = JSON.parse(localStorage.getItem("hearts") ?? "[]");
    if (hearts.includes(assetId)) {
      hearts = hearts.filter((item) => item !== assetId);
    } else {
      hearts.push(assetId);
    }
    localStorage.setItem("hearts", JSON.stringify(hearts));

    console.debug({ assetId });

    refreshHearts(hearts);
  }

  let button = instance
    .getContainer()
    ?.querySelector("button.heart-carosel") as HTMLButtonElement;

  toggleButton(button);
}

export function initHeartButtonIcon(api: CarouselInstance) {
  console.debug("init!");
  console.debug({ page: api.getPageIndex() });

  let button = api
    .getContainer()
    ?.querySelector("button.heart-carosel") as HTMLButtonElement;

  if (!button) {
    console.debug("thing not found", { button });
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

  const activeAssetId = activeSlide.assetId;
  let hearts: string[] = JSON.parse(localStorage.getItem("hearts") ?? "[]");

  if (hearts.includes(activeAssetId) === false) {
    setButton(button, false);
    return;
  }

  setButton(button, true);
}

export function refreshHearts(setHearts?: string[]) {
  const hearts: string[] =
    setHearts ?? JSON.parse(localStorage.getItem("hearts") ?? "[]");

  const template: HTMLTemplateElement | null =
    document.querySelector("template#heart");

  if (!template) return;

  hearts.forEach((assetId) => {
    const albumWrapper = document
      .querySelector(`span.album-wrapper a[data-asset-id="${assetId}"]`)
      ?.closest("span.album-wrapper");

    if (!albumWrapper) return;

    const heartWrapper = albumWrapper.querySelector(".heart-wrapper");

    if (!heartWrapper) return;

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
