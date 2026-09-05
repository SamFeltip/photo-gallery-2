import type { APIRoute } from "astro";
import { getAssetActivityStatistics, listAssetActivities } from "@/lib/server/immich";

const encoder = new TextEncoder();

export const GET: APIRoute = ({ params }) => {
  if (!params.albumId || !params.assetId) return new Response("Album and asset are required", { status: 400 });

  let timer: number | undefined;
  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const [activities, statistics] = await Promise.all([
            listAssetActivities(params.albumId!, params.assetId!),
            getAssetActivityStatistics(params.albumId!, params.assetId!),
          ]);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ activities, statistics })}\n\n`));
        } catch (error) {
          console.error("Unable to stream activities", error);
        }
      };
      await send();
      timer = setInterval(() => void send(), 2_000) as unknown as number;
    },
    cancel() {
      if (timer !== undefined) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/event-stream",
      connection: "keep-alive",
    },
  });
};
