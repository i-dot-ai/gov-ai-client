import type { APIContext } from 'astro';
import { getLlmResponse } from '../logic/ai3.ts';
import type { Message } from '../logic/ai3.ts';
import { getChat, saveChat } from '../logic/database.ts';
import { sendMessage } from './api/sse.ts';
import { parseAuthToken } from '../auth.ts';

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

  // get user email from JWT
  const TEST_AUTHORISATION_JWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOiIxNzM5ODk2MTk5IiwiaWF0IjoiMTczOTg5NTg5OSIsImF1dGhfdGltZSI6IjE3Mzk4OTM1MjkiLCJqdGkiOiIyYmVmOGI1ZS0yOGY0LTQ2OWQtYWQ2My1lZjJlNDgxNzliODYiLCJpc3MiOiJodHRwczovL2xvY2FsLXRlc3Rpbmcub2JmdXNjYXRlZC50ZXN0LmRvbWFpbi5nb3YudWsvcmVhbG1zL29iZnVzY2F0ZWQiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiYmMzNzNkZTQtNDAyMi00NmIyLTgxNTEtZjA0NjEzNzhlOWNiIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibWludXRlIiwic2lkIjoiYzM2NmE5ZmUtMDNiNC00MjIxLWI0ZWItOTE0MzMzNWFhNjUyIiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL2xvY2FsLXRlc3Rpbmcub2JmdXNjYXRlZC50ZXN0LmRvbWFpbi5nb3YudWsiXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImxvY2FsLXRlc3RpbmciXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiZW1haWxfdmVyaWZpZWQiOiJ0cnVlIiwicHJlZmVycmVkX3VzZXJuYW1lIjoidGVzdEB0ZXN0LmNvLnVrIiwiZW1haWwiOiJ0ZXN0QHRlc3QuY28udWsifQ.Pmlltl1M0Q9EAkU96J_zkPJUjjh2TGhQGzfi0v2J-IrxUt1KTnGEcnEk09TUJjdCuyIgO9YEH-uGj5MihnGj6PqCQjq17lWP5YUjYyjgrULfgM6jZ_659RK31wZdRg_72yiy-BeVd-c-v7UzRtdTXIMkwn_aWEIp7own__jfZV_E_32KfelgtwzljVGHjGXdz_Irg6_2B4lbRn8ipWAn3SDlM9Cj8aJw7q5qq7XPk9KkXclivi4bMQJ9RNgMxtgitFtdINRF1A9_pkbERM1LliAgvW-FTLwmVECAGDQyoE8xDQuti8JgixvM22WfpdznSLd2gWAWMiyYZJwRxzFSVw'; // pragma: allowlist secret
  let oidcDataToken;
  if (process.env.ENVIRONMENT === 'local') {
    oidcDataToken = TEST_AUTHORISATION_JWT;
  } else {
    oidcDataToken = context.request.headers.get('x-amzn-oidc-data') || '';
  }
  const authResult = await parseAuthToken(oidcDataToken);
  const userEmail = authResult.email;

  if (!userEmail) {
    console.error('No user email found in token');
    return new Response('Unauthorized: No user email in token', { status: 401 });
  }

  // add user prompt to session data
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
