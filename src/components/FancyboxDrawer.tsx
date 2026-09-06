import { useEffect, useMemo, useState } from "react";
import { actions } from "astro:actions";
import type {
  ActivityResponseDto,
  ActivityStatisticsResponseDto,
} from "@immich/sdk";
import { Drawer } from "vaul";
import { isGuestLoved, toggleGuestLove } from "@/lib/guestActivity";
import "./FancyboxDrawer.css";

type Actor = { id: string; name: string; personId?: string };
type OpenDetail = { assetId: string; action?: "like" | "comment" };

const EMPTY_STATISTICS: ActivityStatisticsResponseDto = { comments: 0, likes: 0 };

export function FancyboxDrawer({ albumId }: { albumId: string }) {
  const identityStorageKey = `activity-identity-${albumId}`;
  const [assetId, setAssetId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityResponseDto[]>([]);
  const [statistics, setStatistics] = useState(EMPTY_STATISTICS);
  const [actors, setActors] = useState<Actor[]>([]);
  const [actorId, setActorId] = useState<string | null>(null);
  const [selectingIdentity, setSelectingIdentity] = useState(false);
  const [pendingAction, setPendingAction] = useState<"like" | "comment" | null>(null);
  const [guestLoved, setGuestLoved] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingActors, setLoadingActors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedActor = useMemo(
    () =>
      actors.find(({ id }) => id === actorId) ??
      (actorId === "guest" ? { id: "guest", name: "Guest" } : null),
    [actorId, actors],
  );
  const comments = activities.filter(({ type }) => type === "comment");
  const totalLoves = statistics.likes + (guestLoved ? 1 : 0);

  async function loadActivities(targetAssetId = assetId) {
    if (!targetAssetId) return;
    setLoadingActivities(true);
    try {
      const { data, error: actionError } = await actions.getPhotoActivities({
        albumId,
        assetId: targetAssetId,
      });
      if (actionError) throw new Error(actionError.message);
      setActivities(data.activities);
      setStatistics(data.statistics);
    } finally {
      setLoadingActivities(false);
    }
  }

  async function loadActors() {
    if (actors.length || loadingActors) return;
    setLoadingActors(true);
    try {
      const { data, error: actionError } = await actions.getAlbumActors({ albumId });
      if (actionError) throw new Error(actionError.message);
      setActors(data);
    } finally {
      setLoadingActors(false);
    }
  }

  async function createActivity(
    type: "like" | "comment",
    selectedActorId = actorId,
    targetAssetId = assetId,
  ) {
    if (!targetAssetId) return;
    if (!selectedActorId) {
      setPendingAction(type);
      setSelectingIdentity(true);
      return;
    }

    if (selectedActorId === "guest") {
      if (type === "comment") {
        setError("Guests can love photos, but comments need a named identity.");
        return;
      }
      const loved = toggleGuestLove(albumId, targetAssetId);
      setGuestLoved(loved);
      setPendingAction(null);
      window.dispatchEvent(
        new CustomEvent("immich-activity-changed", {
          detail: { assetId: targetAssetId },
        }),
      );
      return;
    }

    const trimmedComment = comment.trim();
    if (type === "comment" && !trimmedComment) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: actionError } = await actions.createPhotoActivity({
        actorId: selectedActorId,
        albumId,
        assetId: targetAssetId,
        type,
        ...(type === "comment" ? { comment: trimmedComment } : {}),
      });
      if (actionError) {
        setError(actionError.message);
        return;
      }
      setComment("");
      setPendingAction(null);
      await loadActivities(targetAssetId);
      window.dispatchEvent(
        new CustomEvent("immich-activity-changed", {
          detail: { assetId: targetAssetId },
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function chooseActor(id: string) {
    const action = pendingAction;
    setActorId(id);
    localStorage.setItem(identityStorageKey, id);
    setSelectingIdentity(false);
    if (action) await createActivity(action, id);
  }

  useEffect(() => {
    setActorId(localStorage.getItem(identityStorageKey));
  }, [identityStorageKey]);

  useEffect(() => {
    const openDrawer = (event: Event) => {
      const detail = (event as CustomEvent<OpenDetail>).detail;
      if (!detail?.assetId) return;

      setAssetId(detail.assetId);
      setGuestLoved(isGuestLoved(albumId, detail.assetId));
      setPendingAction(detail.action ?? null);
      setOpen(true);
      setError(null);

      if (!detail.action) return;
      if (actorId) void createActivity(detail.action, actorId, detail.assetId);
      else setSelectingIdentity(true);
    };
    const closeDrawer = () => setOpen(false);
    window.addEventListener("open-fancybox-drawer", openDrawer);
    window.addEventListener("close-fancybox-drawer", closeDrawer);
    return () => {
      window.removeEventListener("open-fancybox-drawer", openDrawer);
      window.removeEventListener("close-fancybox-drawer", closeDrawer);
    };
  }, [actorId, albumId]);

  useEffect(() => {
    if (!open || !assetId) return;
    void loadActivities().catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : "Could not load activities"),
    );
  }, [open, assetId]);

  useEffect(() => {
    if (!selectingIdentity) return;
    void loadActors().catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : "Could not load people"),
    );
  }, [selectingIdentity]);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="activity-drawer__overlay" />
        <Drawer.Content
          className="activity-drawer"
          aria-describedby="activity-drawer-description"
        >
          <Drawer.Handle className="activity-drawer__handle" />
          <header className="activity-drawer__header">
            <div>
              <Drawer.Title>Comments</Drawer.Title>
              <Drawer.Description id="activity-drawer-description">
                {totalLoves} {totalLoves === 1 ? "love" : "loves"} · {statistics.comments}{" "}
                {statistics.comments === 1 ? "comment" : "comments"}
              </Drawer.Description>
            </div>
            <Drawer.Close className="activity-icon-button" aria-label="Close comments">
              ×
            </Drawer.Close>
          </header>

          <div className="activity-drawer__identity-bar">
            <span>
              {selectedActor
                ? `Posting as ${selectedActor.name}`
                : "Choose who you are before posting"}
            </span>
            <button type="button" onClick={() => setSelectingIdentity(true)}>
              {selectedActor ? "Change" : "Choose identity"}
            </button>
          </div>

          <section
            className="activity-comments"
            aria-live="polite"
            aria-busy={loadingActivities}
          >
            {loadingActivities && <p className="activity-state">Loading comments…</p>}
            {!loadingActivities && comments.length === 0 && (
              <div className="activity-empty">
                <span aria-hidden="true">💬</span>
                <strong>Start the conversation</strong>
                <p>Be the first person to leave a comment on this photo.</p>
              </div>
            )}
            {!loadingActivities &&
              comments.map((activity) => (
                <article className="activity-comment" key={activity.id}>
                  <span className="activity-comment__avatar" aria-hidden="true">
                    {activity.user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <div className="activity-comment__meta">
                      <strong>{activity.user.name}</strong>
                      <time dateTime={activity.createdAt}>
                        {formatActivityDate(activity.createdAt)}
                      </time>
                    </div>
                    <p>{activity.comment}</p>
                  </div>
                </article>
              ))}
          </section>

          {error && (
            <p className="activity-error" role="alert">
              {error}
            </p>
          )}

          <footer className="activity-composer">
            {actorId === "guest" && (
              <p className="activity-composer__guest-note">
                Guest loves stay on this device. Choose a named face to comment.
              </p>
            )}
            <div className="activity-composer__row">
              <input
                aria-label="Add a comment"
                disabled={submitting || actorId === "guest"}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    void createActivity("comment");
                  }
                }}
                placeholder={actorId === "guest" ? "Guests cannot comment" : "Add a comment…"}
              />
              <button
                type="button"
                disabled={submitting || !comment.trim() || actorId === "guest"}
                onClick={() => void createActivity("comment")}
              >
                {submitting ? "Sending…" : "Send"}
              </button>
            </div>
          </footer>

          {selectingIdentity && (
            <section className="identity-picker" aria-label="Choose who you are">
              <div className="identity-picker__heading">
                <div>
                  <h2>Who are you?</h2>
                  <p>Pick your face so your activity appears under your name.</p>
                </div>
                {!pendingAction && (
                  <button
                    className="activity-icon-button"
                    type="button"
                    aria-label="Close identity picker"
                    onClick={() => setSelectingIdentity(false)}
                  >
                    ×
                  </button>
                )}
              </div>
              {loadingActors && <p className="activity-state">Finding faces…</p>}
              {!loadingActors && (
                <div className="identity-picker__grid">
                  {actors.map((actor) => (
                    <button
                      className={`identity-card${actor.id === actorId ? " identity-card--selected" : ""}`}
                      key={actor.id}
                      type="button"
                      onClick={() => void chooseActor(actor.id)}
                    >
                      {actor.personId ? (
                        <img
                          alt=""
                          src={`/api/people/${encodeURIComponent(actor.personId)}/thumbnail`}
                        />
                      ) : (
                        <span className="identity-card__guest" aria-hidden="true">
                          ?
                        </span>
                      )}
                      <span>{actor.name}</span>
                      {actor.id === "guest" && <small>Local loves only</small>}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
}
