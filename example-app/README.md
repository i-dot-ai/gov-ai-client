# Example GovAI Client integration

This repo demonstrates how to integrate the GovAI client into an app running an MCP server.

It contains `app.py`, an extremely minimal MCP server.
It also contains a `docker-compose.yml` file showing how to run the client alongside.

## Running this mini app

To set up the client, first populate `.client.env`

```bash
cp .client.env.example .client.env
```

Then run through Docker:

```bash
docker compose up
```

## Incorporating the client into your own application

If you want to incorporate the client into your own application, you will need to:

1. Copy the `gov-ai-client` stanza out of `docker-compose.yml` into your project's `docker-compose.yml`
2. Configure the client's Azure OpenAI connection and MCP servers in a `.client.env` file in your project.


The available MCP servers are listed in the MCP_SERVERS variable in that file.
Out of the box it will configure the client to connect to the server in `app.py`
when they're both running under Docker.

You can add more servers by adding more objects to the `servers` array.
