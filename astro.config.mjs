import { defineConfig, envField, fontProviders } from "astro/config";
import icon from "astro-icon";
import cloudflare from "@astrojs/cloudflare";

import react from "@astrojs/react";

function optimizeWorkerDependencies() {
  return {
    name: "optimize-worker-dependencies",
    configEnvironment(environment) {
      if (environment === "client") return;

      return {
        optimizeDeps: {
          include: [
            "@immich/sdk",
            "astro/assets/services/noop",
            "astro-icon/components",
            "react",
            "react-dom",
            "react-dom/server",
            "thumbhash",
            "vaul",
          ],
        },
      };
    },
  };
}

export default defineConfig({
  adapter: cloudflare({ imageService: "passthrough" }),
  output: "server",
  integrations: [icon(), react()],
  vite: {
    plugins: [optimizeWorkerDependencies()],
  },
  env: {
    schema: {
      API_KEY: envField.string({ context: "server", access: "secret" }),
      IMMICH_ACTIVITY_ACTORS: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      IMMICH_BASE_URL: envField.string({ context: "server", access: "secret" }),
    },
  },

  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Unbounded",
      cssVariable: "--font-unbounded",
    },
    {
      provider: fontProviders.fontsource(),
      name: "Overpass",
      cssVariable: "--font-overpass",
      weights: [400, 500, 700],
    },
  ],
});
