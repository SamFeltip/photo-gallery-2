import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ReactionType, UserAvatarColor, type ActivityResponseDto } from "@immich/sdk";
import {
  FancyboxDrawer,
  type ActivityClient,
} from "@/components/FancyboxDrawer";
import { installIntentPrefetch } from "@/lib/imagePrefetch";
import { installGalleryFiltering } from "@/lib/galleryFiltering";
import { installHandheldStories } from "@/lib/handheldStories";
import "@/components/HandheldStories.css";
import "./fixture.css";

const activities: ActivityResponseDto[] = [];
let likes = 0;

const storyImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='900'%3E%3Crect width='600' height='900' fill='%232a536d'/%3E%3Ccircle cx='430' cy='220' r='100' fill='%23f5c879'/%3E%3Cpath d='M0 640L220 360l160 210 100-100 120 170v260H0z' fill='%23152e36'/%3E%3C/svg%3E";
const storyFixtures = [
  { assetId: "story-1", description: "A mountain at sunset", fullUrl: storyImage, thumbnailUrl: storyImage },
  { assetId: "story-2", description: "A walk beside the lake", fullUrl: storyImage, thumbnailUrl: storyImage },
  { assetId: "story-3", description: "The evening sky", fullUrl: storyImage, thumbnailUrl: storyImage },
];

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
    const removePrefetch = installIntentPrefetch();
    const removeFiltering = installGalleryFiltering();
    const removeStories = installHandheldStories();
    return () => {
      removePrefetch();
      removeFiltering();
      removeStories();
    };
  }, []);

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

      <section className="stories" data-handheld-stories aria-labelledby="stories-heading">
        <h2 id="stories-heading">Handheld stories</h2>
        <div className="stories__rail">
          {storyFixtures.map((story, index) => (
            <button key={story.assetId} type="button" className="stories__card" data-story-open data-asset-id={story.assetId} data-description={story.description} data-full-url={story.fullUrl} aria-label={`Open story ${index + 1}: ${story.description}`}>
              <img src={story.thumbnailUrl} alt="" /><span>{index + 1}</span>
            </button>
          ))}
        </div>
        <div className="story-viewer" data-story-viewer role="dialog" aria-modal="true" hidden>
          <div className="story-viewer__progress" aria-hidden="true">{storyFixtures.map(({ assetId }) => <span key={assetId}><i data-story-progress /></span>)}</div>
          <div className="story-viewer__topbar"><div><strong>Handheld</strong><span data-story-current aria-live="polite" /></div><button data-story-pause aria-label="Pause story">Ⅱ</button><button data-story-close aria-label="Close stories">×</button></div>
          <img className="story-viewer__image" data-story-image alt="" />
          <div className="story-viewer__scrim" />
          <button className="story-viewer__previous" data-story-previous aria-label="Previous story" />
          <button className="story-viewer__next" data-story-next aria-label="Next story" />
          <div className="story-viewer__actions"><button data-story-love aria-label="Love this story">Love</button><button data-story-comment aria-label="Comment on this story">Comment</button></div>
          <p className="story-viewer__caption" data-story-caption />
        </div>
      </section>

      <section id="gallery-filter" aria-label="Filter fixture">
        <div className="tag-filter-fixture" aria-label="Photo tags">
          <button type="button" data-gallery-tag="lake" aria-pressed="false">Lake</button>
          <button type="button" data-gallery-tag="city" aria-pressed="false">City</button>
          <button type="button" data-gallery-tags-clear hidden>Clear tags</button>
        </div>
        <p data-gallery-result-count aria-live="polite" />
        <div id="photoswipe">
          <a className="thumbhash-img" href="#lake" data-tags="lake" data-people="sam">Lake photo</a>
          <a className="thumbhash-img" href="#city" data-tags="city" data-people="alex">City photo</a>
          <a className="thumbhash-img" href="#both" data-tags="lake,city" data-people="sam,alex">Lake and city photo</a>
        </div>
        <div data-gallery-empty hidden>No matching photos</div>
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
