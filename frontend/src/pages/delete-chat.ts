import type { APIContext } from 'astro';
import { deleteChat } from '../logic/database.ts';


export async function POST(context: APIContext) {

  const chatId = context.url.searchParams.get('chatid');
  const userEmail = await context.session?.get('user-email');

  if (chatId) {
    await deleteChat(userEmail, chatId);
  }

  return context.redirect('/chat-history');

}
