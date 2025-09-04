import type { APIContext } from 'astro';
import { getLlmResponse } from '../logic/ai3.ts';
import type { Message } from '../logic/ai3.ts';
import { getChat, saveChat } from '../logic/database.ts';
import { sendMessage } from './api/sse.ts';

export async function POST(context: APIContext) {

  // get user prompt and selected MCP servers
  let userPrompt = '';
  let selectedServers: FormDataEntryValue[] = [];
  let selectedTools: FormDataEntryValue[] = [];
  let model = '';
  let scope = '';
  let chatId = '';
  try {
    const data = await context.request.formData();
    userPrompt = data.get('prompt')?.toString() || '';
    selectedServers = data.getAll('servers');
    selectedTools = data.getAll('tools');
    model = data.get('model')?.toString() || '';
    scope = data.get('scope')?.toString() || 'all';
    chatId = data.get('chatid')?.toString() || '-1';
  } catch(error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }

  // add user prompt to session data
  const userEmail = await context.session?.get('user-email');
  let messages: Message[] | undefined = (await getChat(userEmail, chatId))?.messages;
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

  // save chat data
  const data = await saveChat(userEmail, messages, chatId, scope);
  sendMessage(JSON.stringify({
    type: 'end',
    data: data.rows[0].id,
  }), sessionToken);

  return context.redirect(`/?chatid=${data.rows[0].id}`);
}
