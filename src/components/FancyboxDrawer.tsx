import { useEffect, useState } from "react";
import { actions } from "astro:actions";
import type { ActivityResponseDto } from "@immich/sdk";
import { Drawer } from "vaul";

type Actor = { id: string; name: string; personId?: string };
type OpenDetail = { assetId: string; action?: "like" | "comment" };

export function FancyboxDrawer({ albumId }: { albumId: string }) {
  const [assetId, setAssetId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityResponseDto[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [actorId, setActorId] = useState<string | null>(null);
  const [selectingIdentity, setSelectingIdentity] = useState(false);
  const [pendingAction, setPendingAction] = useState<"like" | "comment" | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadActivities() {
    if (!assetId) return;
    const { data, error: actionError } = await actions.getPhotoActivities({
      albumId,
      assetId,
    });
    if (actionError) throw new Error(actionError.message);
    setActivities(data.activities);
  }

  async function loadActors() {
    if (actors.length) return;
    const { data, error: actionError } = await actions.getAlbumActors({ albumId });
    if (actionError) throw new Error(actionError.message);
    setActors(data);
  }

  useEffect(() => {
    const openDrawer = (event: Event) => {
      const detail = (event as CustomEvent<OpenDetail>).detail;
      if (!detail?.assetId) return;
      setAssetId(detail.assetId);
      setPendingAction(detail.action ?? null);
      setSelectingIdentity(Boolean(detail.action && !actorId));
      setOpen(true);
      setError(null);
    };
    const closeDrawer = () => setOpen(false);
    window.addEventListener("open-fancybox-drawer", openDrawer);
    window.addEventListener("close-fancybox-drawer", closeDrawer);
    return () => {
      window.removeEventListener("open-fancybox-drawer", openDrawer);
      window.removeEventListener("close-fancybox-drawer", closeDrawer);
    };
  }, [actorId]);

  useEffect(() => {
    if (!open || !assetId) return;
    void loadActivities().catch((cause: unknown) =>
      setError(
        cause instanceof Error ? cause.message : "Could not load activities",
      ),
    );
  }, [open, assetId]);

  useEffect(() => {
    if (selectingIdentity) void loadActors().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load people"));
  }, [selectingIdentity]);

  useEffect(() => {
    if (open && assetId && actorId && pendingAction === "like" && !selectingIdentity) {
      void createActivity("like");
    }
  }, [open, assetId, actorId, pendingAction, selectingIdentity]);

  async function createActivity(type: "like" | "comment", selectedActorId = actorId) {
    if (!assetId || !selectedActorId) {
      setPendingAction(type);
      setSelectingIdentity(true);
      return;
    }
    const trimmedComment = comment.trim();
    if (type === "comment" && !trimmedComment) return;
    setError(null);
    const { error: actionError } = await actions.createPhotoActivity({
      actorId: selectedActorId,
      albumId,
      assetId,
      type,
      ...(type === "comment" ? { comment: trimmedComment } : {}),
    });
    if (actionError) return setError(actionError.message);
    setComment("");
    setPendingAction(null);
    await loadActivities();
    window.dispatchEvent(new CustomEvent("immich-activity-changed", { detail: { assetId } }));
  }

  async function chooseActor(id: string) {
    setActorId(id);
    setSelectingIdentity(false);
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Overlay style={{ background: "rgba(0, 0, 0, 0.55)", inset: 0, position: "fixed", zIndex: 10000 }} />
        <Drawer.Content style={{ background: "white", borderRadius: "16px 16px 0 0", bottom: 0, left: 0, maxHeight: "70vh", outline: "none", overflowY: "auto", padding: "1rem 1.5rem 2rem", position: "fixed", right: 0, zIndex: 10001 }}>
          <Drawer.Handle />
          <Drawer.Title style={{ margin: "0 0 1rem" }}>Comments</Drawer.Title>
          {activities.filter((activity) => activity.type === "comment").map((activity) => <article key={activity.id} style={{ borderBottom: "1px solid #e5e7eb", padding: "0.75rem 0" }}><strong>{activity.user.name}</strong><p style={{ margin: "0.25rem 0 0" }}>{activity.comment}</p></article>)}
          {!activities.some((activity) => activity.type === "comment") && <p>No comments yet.</p>}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}><input aria-label="Add a comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment" style={{ flex: 1 }} /><button type="button" onClick={() => void createActivity("comment")}>Send</button></div>
          {error && <p role="alert">{error}</p>}
          {selectingIdentity && <section aria-label="Choose who you are" style={{ background: "white", border: "1px solid #d1d5db", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,.2)", inset: "1rem", padding: "1rem", position: "absolute", zIndex: 1 }}><h2 style={{ marginTop: 0 }}>Who are you?</h2><div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))" }}>{actors.map((actor) => <button key={actor.id} type="button" onClick={() => void chooseActor(actor.id)} style={{ minHeight: "5rem" }}>{actor.personId && <img alt="" src={`/api/people/${encodeURIComponent(actor.personId)}/thumbnail`} style={{ borderRadius: "50%", display: "block", height: "2.5rem", margin: "0 auto .25rem", objectFit: "cover", width: "2.5rem" }} />}{actor.name}</button>)}</div></section>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
