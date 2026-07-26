import { defineConfig, fontProviders } from "astro/config";
import icon from "astro-icon";

export default defineConfig({
  integrations: [icon()],

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
