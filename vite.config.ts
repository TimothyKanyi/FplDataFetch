import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "robots.txt"],
      manifest: {
        name: "FPL Data Fetcher",
        short_name: "FPL Data",
        description:
          "Instantly view Fantasy Premier League standings for any mini-league.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/favicon.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores: ["**/og-image.png"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // Network-first for the league data endpoint: always try the
            // network so live-gameweek polling returns genuinely fresh
            // standings, and only fall back to the cached copy when the
            // network is unavailable (a previously-viewed league still works
            // offline). Only GET is cacheable.
            //
            // StaleWhileRevalidate was serving the previous poll's body on
            // every request, which put the live view a full poll interval
            // (60s) behind and could serve a body up to maxAgeSeconds old.
            // Deliberately no networkTimeoutSeconds: a cold cache-miss on the
            // edge function can legitimately take well over 10s, and timing
            // out into the cache would break those loads.
            urlPattern: ({ url }) =>
              url.pathname.includes("/fetch-league-data"),
            handler: "NetworkFirst",
            options: {
              cacheName: "fpl-league-api",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ["recharts"],
          framer: ["framer-motion"],
          lucide: ["lucide-react"],
        },
      },
    },
  },
}));
