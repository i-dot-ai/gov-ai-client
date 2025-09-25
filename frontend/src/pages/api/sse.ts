import type { APIContext } from 'astro';

const encoder = new TextEncoder();
const controllers = new Map();


export function sendMessage(message: string, token: string) {
  const controller = controllers.get(token);
  if (!controller) {
    return;
  }
  try {
    controller.enqueue(encoder.encode(`data: ${message}\n\n`));
  } catch(err) {
    console.log('Error streaming message:', err);
  }
}


export async function GET(context: APIContext) {

  const token = context.cookies.get('astro-session')?.value;
  if (!token) {
    throw new Error('Astro session cookie not set');
  }

  // Create a streaming response
  const customReadable = new ReadableStream({
    async start(_controller) {
      controllers.set(token, _controller);
      context.request.signal.addEventListener('abort', () => {
        controllers.delete(token);
      });
    },
  });

  // Return the stream response and keep the connection alive
  return new Response(customReadable, {
    // Set the headers for Server-Sent Events (SSE)
    headers: {
      Connection: 'keep-alive',
      'Content-Encoding': 'none',
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': 'text/event-stream; charset=utf-8',
    },
  });

}
