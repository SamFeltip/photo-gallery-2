import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function faceFixture(): Plugin {
  return {
    name: "face-fixture",
    configureServer(server) {
      server.middlewares.use("/api/people/sam/thumbnail", (_request, response) => {
        response.setHeader("content-type", "image/svg+xml");
        response.end(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#8b5cf6"/><circle cx="50" cy="38" r="18" fill="white"/><path d="M20 94c3-24 15-36 30-36s27 12 30 36" fill="white"/></svg>',
        );
      });
      server.middlewares.use("/prefetch/photo-1.jpg", (_request, response) => {
        response.setHeader("content-type", "image/svg+xml");
        response.end('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
      });
    },
  };
}

export default defineConfig({
  root: path.resolve(import.meta.dirname, "fixture"),
  plugins: [react(), faceFixture()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "../../src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});
