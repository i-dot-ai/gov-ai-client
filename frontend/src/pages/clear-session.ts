import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  context.session?.destroy();
  return context.redirect(context.url.searchParams.get('return') || '/');
}
