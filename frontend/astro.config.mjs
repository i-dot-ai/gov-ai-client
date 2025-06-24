// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';

let port;

if (!process.env.GOVAI_PORT) {
  port = 4321;
} else {
  port = parseInt(process.env.GOVAI_PORT);
}

// https://astro.build/config
export default defineConfig({
  server: { port: port, host: true },
  adapter: node({
    mode: 'standalone'
  }),
  output: 'server'
});

