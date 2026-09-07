import { actions } from "astro:actions";
import {
  FancyboxDrawer,
  type ActivityClient,
} from "./FancyboxDrawer";

const activityClient: ActivityClient = {
  async getActors(albumId) {
    const { data, error } = await actions.getAlbumActors({ albumId });
    if (error) throw new Error(error.message);
    return data;
  },
  async getActivities(albumId, assetId) {
    const { data, error } = await actions.getPhotoActivities({ albumId, assetId });
    if (error) throw new Error(error.message);
    return data;
  },
  async createActivity(input) {
    const { error } = await actions.createPhotoActivity(input);
    if (error) throw new Error(error.message);
  },
};

export function FancyboxDrawerIsland({ albumId }: { albumId: string }) {
  return <FancyboxDrawer activityClient={activityClient} albumId={albumId} />;
}
