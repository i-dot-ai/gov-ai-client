import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const scope = context.url.searchParams.get('scope') || 'all';
  console.log('Clearing messages for:', `messages-${scope}`);
  context.session?.set(`messages-${scope}`, [], {ttl: 1});
  return context.redirect( `/${scope}`);
}
