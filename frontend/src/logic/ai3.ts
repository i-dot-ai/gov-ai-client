/*
 * Using Langchain for the MCP and LLM calls
 * Same as ai2.ts but uses streaming
 */

import 'dotenv/config';

import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { AzureChatOpenAI, ChatOpenAI } from '@langchain/openai';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { sendMessage } from '../pages/api/sse';
import { getMcpServers, type Tool } from './get-servers';
import { CallbackManager } from '@langchain/core/callbacks/manager';
import { CallbackHandler as LangfuseHandler } from 'langfuse-langchain';


const langfuseHandler = new LangfuseHandler({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});
const callbackManager = CallbackManager.fromHandlers(langfuseHandler);


export type Message = {
  type: 'user' | 'llm',
  response: {
    content: string,
    tools?: object[],
    tool_calls: [],
  },
};


export const getLlmResponse = async(messages: Message[], selectedServers: FormDataEntryValue[], selectedTools: FormDataEntryValue[], selectedModel: string, authToken: string, sessionToken: string) => {

  const MODEL = selectedModel === 'Fast' ? 'bedrock-claude-3-haiku' : 'azure/o4-mini';

  let agentModel;
  if (process.env['USE_LITE_LLM'] === 'true') {
    console.log('Using Lite LLM');
    agentModel = new ChatOpenAI({
      openAIApiKey: process.env['LITELLM_GOVAI_CLIENT_OPENAI_API_KEY'],
      configuration: {
        baseURL: process.env['LLM_GATEWAY_URL'],
      },
      modelName: `${MODEL}`,
      callbackManager,
    });
  } else {
    agentModel = new AzureChatOpenAI({
      openAIApiKey: process.env['AZURE_OPENAI_API_KEY'],
      openAIApiVersion: process.env['OPENAI_API_VERSION'],
      openAIBasePath: process.env['AZURE_OPENAI_ENDPOINT'],
      deploymentName: MODEL.replace('azure/', ''),
    });
  }

  // filter out any unselected MCP servers
  const mcpTools: Tool[] = [];
  const mcpServers = await getMcpServers(authToken);
  mcpServers.filter((server: { name: string }) => selectedServers.includes(server.name)).forEach((server) => {
    server.tools.forEach((tool) => {
      if (selectedTools.includes(tool.name)) {
        mcpTools.push(tool);
      }
    });
  });

  const agent = createReactAgent({
    llm: agentModel,
    tools: mcpTools,
  });

  const currentTime = new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const s3_link_example = '[mydocument.pdf](https://my-example-bucket.s3.eu-west-2.amazonaws.com/path/to/mydocument.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20250827%2Feu-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250827T153045Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEGMaCXVzLWV&X-Amz-Signature=5d41402abc4b2a76b9719d911017c592)'; // pragma: allowlist secret

  let systemMessageText: string = `
    You are a UK civil servant. The current time is ${currentTime}.
    Where appropriate cite any responses from tools to support answer, e.g. provide:
    - source, i.e. link or title (this should be verbatim, do not modify, or invent this. Use concise but descriptive names for links so each unique link text describes the destination. Ensure all links are rendered as proper markdown links).
    - quotes
    - etc
    If the source link is an s3 presigned url for downloading the file, obfuscate the link behind the document name, e.g. 
    ${s3_link_example}
    - do not adjust the link or lose any original information from it
    - do not remove the query string or edit it
    Reply in British English.
    Use semantic markdown in your response, but do not display anything as footnotes.
  `;
  if (mcpTools.length === 1) {
    systemMessageText += `You must use the ${mcpTools[0].name} tool.`;
  } else if (mcpTools.length > 1) {
    systemMessageText += 'You should use one or more MCP tools. If you see a word starting with "@" search for a tool by that name and use it.';
  }

  const agentMessages: (HumanMessage | AIMessage)[] = [new SystemMessage(systemMessageText)];
  messages.forEach((message) => {
    if (message.type === 'user') {
      agentMessages.push(new HumanMessage(message.response.content));
    } else if (message.type === 'llm') {
      agentMessages.push(new AIMessage(message.response.content));
    }
  });

  // Set up streaming
  let finalMessage: string = '';
  const toolCalls: object[] = [];
  agent.streamMode = ['messages', 'updates'];

  let agentStream;
  try {
    agentStream = await agent.stream(
      { messages: agentMessages },
      { callbacks: [langfuseHandler] },
    );
  } catch(err) {
    console.error('Error connecting to LLM. Check your env vars.');
    console.log(err);
    const msg = 'There is a problem connecting to the LLM. Please try again.';
    sendMessage(JSON.stringify({
      type: 'content',
      data: msg,
    }), sessionToken);
    sendMessage(JSON.stringify({
      type: 'end',
    }), sessionToken);
    return {
      content: msg,
    };
  }

  for await (const chunk of agentStream) {

    // 'messages' stream
    if (chunk[0] && chunk[0].content && !chunk[0].tool_call_id) {
      // tool_call_id shows the response from the tool (in case we want it in future)
      sendMessage(JSON.stringify({
        type: 'content',
        data: chunk[0].content,
      }), sessionToken);
    }

    // 'updates' stream
    if (!chunk.length) {
      const response = chunk.agent?.messages ? chunk.agent.messages[0] : {};
      if (response.tool_calls?.length) {
        const toolCall = response.tool_calls.map((tool: { name: string; args: { request?: string } }) => {
          return {
            name: tool.name,
            server: mcpTools.filter((item) => item.name === tool.name)[0].serverName,
            args: tool.args.request || tool.args,
          };
        });
        toolCalls.push(...toolCall);
        sendMessage(JSON.stringify({
          type: 'tool',
          data: toolCall,
        }), sessionToken);
      } else if (response.content) {
        finalMessage = response.content;
      }
    }
  }

  return {
    content: finalMessage,
    tool_calls: toolCalls,
  };

};
