import type { APIContext } from 'astro';
import { getLlmResponse } from '../logic/ai3.ts';
import type { Message } from '../logic/ai3.ts';

export async function POST(context: APIContext) {

  // get user prompt and selected MCP servers
  let userPrompt = '';
  let selectedServers: FormDataEntryValue[] = [];
  let selectedTools: FormDataEntryValue[] = [];
  let model = '';
  let scope = '';
  try {
    const data = await context.request.formData();
    userPrompt = data.get('prompt')?.toString() || '';
    selectedServers = data.getAll('servers');
    selectedTools = data.getAll('tools');
    model = data.get('model')?.toString() || '';
    scope = data.get('scope')?.toString() || 'all';
  } catch(error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }

  // add user prompt to session data
  let messages: Message[] | undefined = await context.session?.get(`messages-${scope}`);
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
    llmResponse = await getLlmResponse(messages, selectedServers, selectedTools, model, keycloakToken, sessionToken);
  }

  // add LLM response to session data
  if (llmResponse) {
    messages.push({
      type: 'llm', response: llmResponse,
    });
  }

  // save session data
  await context.session?.set(`messages-${scope}`, messages);

  return context.redirect('/');
}
