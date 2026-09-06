import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ReactionType, UserAvatarColor, type ActivityResponseDto } from "@immich/sdk";
import {
  FancyboxDrawer,
  type ActivityClient,
} from "@/components/FancyboxDrawer";
import { installIntentPrefetch } from "@/lib/imagePrefetch";
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

  useEffect(() => installIntentPrefetch(), []);

  return (
    <main>
      <h1>Activity browser fixture</h1>
      <button type="button" onClick={() => setPhotoOpen(true)}>Open photo</button>
      <button type="button" onClick={() => setClicks((value) => value + 1)}>
        Page remains clickable: {clicks}
      </button>
      <a
        data-prefetch-src="/prefetch/photo-1.jpg"
        href="/prefetch/photo-1.jpg"
        onClick={(event) => event.preventDefault()}
      >
        Prefetch photo
      </a>

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
