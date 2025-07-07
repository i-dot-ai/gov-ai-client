// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';

import sentry from '@sentry/astro';

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
  output: 'server',
  integrations: [sentry({
      environment: process.env.ENVIRONMENT,
      dsn: process.env.SENTRY_DSN?.replaceAll('"', ''),
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      sourceMapsUploadOptions: {
        project: "gov-ai-client",
        authToken: process.env.SENTRY_AUTH_TOKEN?.replaceAll('"', ''),
      },
    })],
});