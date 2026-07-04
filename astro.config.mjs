import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Unbounded",
      cssVariable: "--font-unbounded",
    },
  ],
});
