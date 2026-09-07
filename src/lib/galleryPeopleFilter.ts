import { PersonCustomEvent } from "../types/events";

export function initializePeopleSelectors(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".avatar-wrap").forEach((wrap) => {
    wrap.addEventListener("click", () => {
      const personId = wrap.dataset.person;
      if (!personId) throw new Error("data-person was missing");

      const willActivate = !wrap.classList.contains("active");
      wrap.dispatchEvent(
        new PersonCustomEvent(personId, willActivate ? "active" : "disable"),
      );

      wrap.classList.remove("animate", "reverse");
      void wrap.offsetWidth;
      wrap.classList.add("animate");
      if (!willActivate) wrap.classList.add("reverse");
      wrap.classList.toggle("active", willActivate);
    });

    wrap.addEventListener("animationend", () => {
      wrap.classList.remove("animate", "reverse");
    });
  });
}

export function initializeGalleryPeopleFilter(
  galleryFilter: HTMLElement | null = document.querySelector("#gallery-filter"),
) {
  if (!galleryFilter) return;
  const filteredPeople = new Set<string>();

  galleryFilter.addEventListener("person", (event) => {
    const { personId, toggleMode } = (event as PersonCustomEvent).detail;
    if (toggleMode === "active") filteredPeople.add(personId);
    else filteredPeople.delete(personId);

    const allPersonImages = galleryFilter.querySelectorAll("a.thumbhash-img");
    allPersonImages.forEach((anchor) => anchor.classList.remove("show"));

    let query = "a.thumbhash-img";
    filteredPeople.forEach((id) => {
      query += `:has(span[data-person='${CSS.escape(id)}'])`;
    });
    galleryFilter
      .querySelectorAll(query)
      .forEach((anchor) => anchor.classList.add("show"));

    const photoList = galleryFilter.querySelector("#photoswipe");
    photoList?.classList.toggle("filtered", filteredPeople.size > 0);
  });
}
