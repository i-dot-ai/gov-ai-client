[![build](https://github.com/i-dot-ai/gov-ai-client/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/i-dot-ai/gov-ai-client/actions/workflows/build.yml?query=branch%3Amain)

# Gov AI Client

A thin chat client for connecting to MCP Servers


## Local development

To run the frontend application, use the following command:

```bash
make run_frontend
```


## MCP configuration

Please copy the `.mcp-servers-example.yaml` file to `.mcp-servers.yaml`

By default the app is configured to talk to a local MCP test server.

For this to work, you'll need to run the server yourself:

```bash
cd mcp-server-demo
npm install
npm run start
```

If the correct values are set in `.mcp-servers.yaml`, the app will also attempt to connect to
a Caddy MCP server at that URL.

Additional MCP servers can be added to this file.

An `MCP_SERVERS` env var can also be set that overrides the yaml file. See `.env.example` for an example of this.


## Frontend

The Frontend uses [Astro](https://astro.build/) and [Lit](https://lit.dev/). There is a readme specific to Astro in the frontend directory.

The app is designed to work without JavaScript (for progressive enhancement), and with JavaScript added to provide enhancements such as streaming.


## Tests

End-to-end tests using [Playwright](https://playwright.dev/) are located in the `/tests` directory.

From the `/tests` directory, run: 

```bash
npm install
npx playwright test
```


## Deployment

### Builds

The docker images for the services will be built on every push to any branch by the github actions.

### Releases

- Running `make release env=<env>` to release any commit to `dev` or `preprod`.
- Pushing to main will release to `prod`.
