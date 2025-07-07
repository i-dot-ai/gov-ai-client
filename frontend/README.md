# Gov AI MCP Client - Frontend

A modern AI chat interface that connects to MCP (Model Context Protocol) servers using Vercel AI SDK.

## Features

- **Multiple AI Providers**: Support for Azure OpenAI and Anthropic Claude
- **MCP Integration**: Native support for Model Context Protocol servers
- **Streaming Responses**: Real-time streaming of AI responses
- **Tool Calling**: Seamless integration with external tools and APIs
- **Modern UI**: Built with Astro and GOV.UK Design System

## Setup

### 1. Install Dependencies

```sh
npm install
```

### 2. Environment Configuration

Create a `.env` file in the frontend directory with the following variables:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name

# Anthropic Configuration  
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: Set default provider (azure or anthropic)
DEFAULT_AI_PROVIDER=azure
```

### 3. MCP Server Configuration

Copy `.mcp-servers-example.yaml` to `.mcp-servers.yaml` and configure your MCP servers:

```yaml
servers:
  - name: lex
    description: Research legislation and caselaw
    url: http://localhost:8000/mcp
    accessToken: optional_access_token
```

## 🧞 Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |

## Architecture

This implementation uses **Vercel AI SDK** instead of LangChain for better:
- **Schema Validation**: More robust handling of OpenAI function calling schemas
- **MCP Integration**: Native experimental MCP client support
- **Streaming**: Built-in streaming support with better error handling
- **Provider Flexibility**: Easy switching between AI providers

## Migration from LangChain

This version replaces the previous LangChain implementation to resolve schema validation issues with OpenAI function calling, particularly around array parameters missing the required `items` property.

Key improvements:
- Direct MCP client integration via `experimental_createMCPClient`
- Better error handling and connection management
- Cleaner streaming implementation
- Provider-agnostic architecture

```sh
npm create astro@latest -- --template basics
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://github.com/withastro/astro/assets/2244813/a0a5533c-a856-4198-8470-2d67b1d7c554)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## �� Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
