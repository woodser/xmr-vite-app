import { copyFileSync, mkdirSync } from "fs";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

mkdirSync("public", { recursive: true });
[
  {
    src: "node_modules/monero-ts/dist/monero_wallet_keys.wasm",
    dest: "public/monero_wallet_keys.wasm",
  },
  {
    src: "node_modules/monero-ts/dist/monero_wallet_full.wasm",
    dest: "public/monero_wallet_full.wasm",
  },
  {
    src: "node_modules/monero-ts/dist/monero_web_worker.js",
    dest: "public/monero_web_worker.js",
  },
].forEach(({ src, dest }) => copyFileSync(src, dest))

export default defineConfig({
  plugins: [
    nodePolyfills({ include: ["http", "https", "fs", "stream", "util", "path"] }),
    {
      name: "copy-files",
      writeBundle: () =>
        [
          {
            src: "node_modules/monero-ts/dist/monero_wallet_keys.wasm",
            dest: "dist/monero_wallet_keys.wasm",
          },
          {
            src: "node_modules/monero-ts/dist/monero_wallet_full.wasm",
            dest: "dist/monero_wallet_full.wasm",
          },
          {
            src: "node_modules/monero-ts/dist/monero_web_worker.js",
            dest: "dist/monero_web_worker.js",
          },
        ].forEach(({ src, dest }) => copyFileSync(src, dest)),
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    commonjsOptions: { transformMixedEsModules: true },
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        format: "es",
      },
    },
  },
  publicDir: "public",
});
