import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "ChamaSmart",
        short_name: "ChamaSmart",
        theme_color: "#11998e",
        background_color: "#ffffff",
        display: "standalone",
      },
    }),
  ],
});