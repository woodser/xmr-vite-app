import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

import { copyFileSync } from "fs";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

interface RequestPromiseOptions extends AxiosRequestConfig {
  simple?: boolean;
  resolve?: (value: any) => void;
  reject?: (reason: any) => void;
}

interface RequestPromiseAPI {
  (options: RequestPromiseOptions): Promise<any>;
  (url: string): Promise<any>;
  get(url: string, options?: RequestPromiseOptions): Promise<any>;
  post(url: string, options?: RequestPromiseOptions): Promise<any>;
  put(url: string, options?: RequestPromiseOptions): Promise<any>;
  patch(url: string, options?: RequestPromiseOptions): Promise<any>;
  del(url: string, options?: RequestPromiseOptions): Promise<any>;
  delete(url: string, options?: RequestPromiseOptions): Promise<any>;
  head(url: string, options?: RequestPromiseOptions): Promise<any>;
  options(url: string, options?: RequestPromiseOptions): Promise<any>;
  default(url: string, options?: RequestPromiseOptions): Promise<any>;

}

const createRequestPromisePolyfill = `
(axios) => {
  const requestPromise = ((options) => {
    let axiosOptions = {};
    
    if (typeof options === 'string') {
      axiosOptions.url = options;
    } else {
      axiosOptions = { ...options };
    }

    return new Promise((resolve, reject) => {
      axios(axiosOptions)
        .then(response => {
          if (options.simple !== false || (response.status >= 200 && response.status < 300)) {
            resolve(response.data);
          } else {
            reject(new Error(\`Request failed with status code \${response.status}\`));
          }
        })
        .catch(error => {
          reject(error);
        });
    });
  });

  const methodFactory = (method) => {
    return (url, options = {}) => {
      return requestPromise({ ...options, url, method });
    };
  };

  requestPromise.get = methodFactory('get');
  requestPromise.post = methodFactory('post');
  requestPromise.put = methodFactory('put');
  requestPromise.patch = methodFactory('patch');
  requestPromise.del = requestPromise.delete = methodFactory('delete');
  requestPromise.head = methodFactory('head');
  requestPromise.options = methodFactory('options');

  return requestPromise;
}`;
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
                    return response;
                  }
                  return response.data;
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
