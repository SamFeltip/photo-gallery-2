import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ReactionType, UserAvatarColor, type ActivityResponseDto } from "@immich/sdk";
import {
  FancyboxDrawer,
  type ActivityClient,
} from "@/components/FancyboxDrawer";
import {
  initializeGalleryPeopleFilter,
  initializePeopleSelectors,
} from "@/lib/galleryPeopleFilter";
import "./fixture.css";

const activities: ActivityResponseDto[] = [];
let likes = 0;

const activityClient: ActivityClient = {
  async getActors() {
    return [
      { id: "guest", name: "Guest" },
      { id: "person-sam", name: "Sam Felton", personId: "sam" },
    ];
  },
  async getActivities() {
    return {
      activities: [...activities],
      statistics: {
        comments: activities.filter(({ type }) => type === ReactionType.Comment).length,
        likes,
      },
    };
  },
  async createActivity(input) {
    if (input.type === "like") {
      likes += 1;
      return;
    }
    activities.push({
      assetId: input.assetId,
      comment: input.comment,
      createdAt: new Date().toISOString(),
      id: `comment-${activities.length + 1}`,
      type: ReactionType.Comment,
      user: {
        avatarColor: UserAvatarColor.Primary,
        email: "sam@example.test",
        id: "user-sam",
        name: "Sam Felton",
        profileChangedAt: new Date().toISOString(),
        profileImagePath: "",
      },
    });
  },
};

function dispatchDrawer(action?: "like" | "comment") {
  window.dispatchEvent(
    new CustomEvent("open-fancybox-drawer", {
      detail: { action, assetId: "photo-1" },
    }),
  );
}

function App() {
  const [photoOpen, setPhotoOpen] = useState(false);
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    initializeGalleryPeopleFilter(document.querySelector("#gallery-filter"));
    initializePeopleSelectors(document.querySelector("#gallery-filter")!);
  }, []);

  return (
    <main>
      <h1>Activity browser fixture</h1>
      <button type="button" onClick={() => setPhotoOpen(true)}>Open photo</button>
      <button type="button" onClick={() => setClicks((value) => value + 1)}>
        Page remains clickable: {clicks}
      </button>

      <section id="gallery-filter" aria-label="Gallery fixture">
        <div aria-label="People filters">
          <button className="avatar-wrap" data-person="sam" type="button">Sam</button>
          <button className="avatar-wrap" data-person="alex" type="button">Alex</button>
        </div>
        <div id="photoswipe">
          <a className="thumbhash-img" href="#sam-photo">Sam photo<span data-person="sam" /></a>
          <a className="thumbhash-img" href="#shared-photo">Shared photo<span data-person="sam" /><span data-person="alex" /></a>
          <a className="thumbhash-img" href="#alex-photo">Alex photo<span data-person="alex" /></a>
        </div>
      </section>

      {photoOpen && (
        <section className="photo-fixture" aria-label="Photo viewer">
          <div className="photo-fixture__toolbar">
            <button type="button" onClick={() => dispatchDrawer("like")}>Love</button>
            <button type="button" onClick={() => dispatchDrawer()}>Comments</button>
            <button type="button" onClick={() => setPhotoOpen(false)}>Close photo</button>
          </div>
          <div className="photo-fixture__image" role="img" aria-label="Mountain lake" />
        </section>
      )}

      <FancyboxDrawer
        activityClient={activityClient}
        albumId="fixture-album"
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
