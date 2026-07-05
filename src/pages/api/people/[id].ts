import {
  getAlbumInfo,
  getAllAlbums,
  getAllPeople,
  getAssetInfo,
  init,
  searchAssets,
  type AssetResponseDto,
  type PersonResponseDto,
} from "@immich/sdk";
import type { APIContext } from "astro";

export async function getStaticPaths() {
  const IMMICH_BASE_URL = import.meta.env.IMMICH_BASE_URL;
  const API_KEY = import.meta.env.API_KEY;

  init({
    baseUrl: `${IMMICH_BASE_URL}/api`,
    apiKey: API_KEY,
  });

  console.debug("getting all albums...");
  const albumsResponse = await getAllAlbums({ isShared: true });

  return albumsResponse.map((album) => ({
    params: { id: album.id.toString() },
    props: { album },
  }));
}

export async function GET({ params }: APIContext): Promise<Response> {
  console.debug("debugging...");
  const id = params.id;
  if (id === undefined) {
    return new Response(
      JSON.stringify({
        error: "Invalid album ID",
      }),
      { status: 400 },
    );
  }

  const IMMICH_BASE_URL = import.meta.env.IMMICH_BASE_URL;
  const API_KEY = import.meta.env.API_KEY;

  init({
    baseUrl: `${IMMICH_BASE_URL}/api`,
    apiKey: API_KEY,
  });

  const albumPeople = await getAlbumPeople(id);

  return new Response(
    JSON.stringify({
      people: Object.fromEntries(albumPeople),
    }),
  );
}

export async function getAlbumPeople(albumId: string) {
  const assets = await searchAssets({
    metadataSearchDto: { albumIds: [albumId], withPeople: true },
  });

  return new Map(
    assets.assets.items
      .flatMap((item) => item.people ?? [])
      .map((person) => [person.id, person]),
  );
}
