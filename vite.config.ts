import { copyFileSync } from "fs";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ["http", "https", "fs"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // protocolImports: true,
    }),
    {
      name: "copy-files",
      writeBundle: () =>
        [
          {
            src: "node_modules/monero-ts/dist/monero_wallet_keys.wasm",
            dest: "dist/monero_wallet_keys.wasm",
          },
          {
            src: "node_modules/monero-ts/dist/monero_web_worker.js",
            dest: "dist/monero_web_worker.js",
          },
        ].forEach(({ src, dest }) => copyFileSync(src, dest)),
    },
    {
      name: "replace",
      transform: (src) =>
        src.includes("require.cache")
          ? src.replaceAll("require.cache", "null")
          : src,
    },
    {
      name: 'request-promise-polyfill',
      config() {
        return {
          resolve: {
            alias: {
              'request-promise': 'virtual:request-promise-polyfill',
            },
          },
        };
      },
      resolveId(id: string) {
        if (id === 'virtual:request-promise-polyfill') {
          return id;
        }
      },
      load(id: string) {
        if (id === 'virtual:request-promise-polyfill') {
          return `
            import axios from 'axios';
            import { URL } from 'url';

            const normalizeOptions = (input) => {
              let opts = typeof input === 'string' ? { url: input } : { ...input };
              
              if (opts.uri) {
                opts.url = opts.uri;
                delete opts.uri;
              }

              if (!opts.url && opts.baseUrl) {
                opts.url = opts.baseUrl;
                delete opts.baseUrl;
              }

              if (opts.qs) {
                const url = new URL(opts.url);
                Object.entries(opts.qs).forEach(([key, value]) => {
                  url.searchParams.append(key, value);
                });
                opts.url = url.toString();
                delete opts.qs;
              }

              if (opts.form) {
                opts.data = opts.form;
                opts.headers = opts.headers || {};
                opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                delete opts.form;
              }

              if (opts.body) {
                opts.data = opts.body;
                delete opts.body;
              }

              return opts;
            };

            const Request = function(opts) {
        const normalizedOpts = normalizeOptions(opts);
        return axios(normalizedOpts)
          .then(response => {
            if (opts.resolveWithFullResponse) {
              // If full response is requested, return a response-like object
              return {
                statusCode: response.status,
                headers: response.headers,
                body: JSON.stringify(response.data)
              };
            }
            // Otherwise, just return the response data as text
            return JSON.stringify(response.data);
          });
      };

            const methodFactory = (method) => {
              return (url, opts = {}) => Request({ ...opts, method, url });
            };

            Request.get = methodFactory('get');
            Request.post = methodFactory('post');
            Request.put = methodFactory('put');
            Request.patch = methodFactory('patch');
            Request.delete = methodFactory('delete');
            Request.head = methodFactory('head');
            Request.options = methodFactory('options');

            export default Request;
          `;
        }
      },
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
  optimizeDeps: {
    include: ["axios"],
  },
});
