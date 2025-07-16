import type { APIContext } from 'astro';
import { getLlmResponse } from '../logic/ai3.ts';
import type { Message } from '../logic/ai3.ts';

export async function POST(context: APIContext) {

  // get user prompt and selected MCP servers
  let userPrompt = '';
  let selectedServers: FormDataEntryValue[] = [];
  let selectedTools: FormDataEntryValue[] = [];
  try {
    const data = await context.request.formData();
    userPrompt = data.get('prompt')?.toString() || '';
    selectedServers = data.getAll('servers');
    selectedTools = data.getAll('tools');
  } catch(error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }

  // add user prompt to session data
  let messages: Message[] | undefined = await context.session?.get('messages');
  if (!messages) {
    messages = [];
  }
  if (userPrompt) {
    messages.push({
      type: 'user', response: {
        content: userPrompt,
        tool_calls: [],
      },
    });
  }

  // get LLM response
  const sessionToken = context.cookies.get('astro-session')?.value || '';
  const keycloakToken = context.request.headers.get('x-amzn-oidc-accesstoken') || '';
  let llmResponse;
  if (userPrompt) {
    llmResponse = await getLlmResponse(messages, selectedServers, selectedTools, keycloakToken, sessionToken);
  }

  // add LLM response to session data
  if (llmResponse) {
    messages.push({
      type: 'llm', response: llmResponse,
    });
  }

  // save session data
  await context.session?.set('messages', messages);

  return context.redirect('/');
}
