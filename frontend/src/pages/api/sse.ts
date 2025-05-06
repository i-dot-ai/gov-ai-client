const encoder = new TextEncoder()
let controller: ReadableStreamDefaultController<any>

export function sendMessage(message: string) {
  //console.log('sendMessage: ', message)
  try {
    controller.enqueue(encoder.encode(`data: ${message}\n\n`))
  } catch (err) {
    console.log(err)
  }
}


export async function GET() {

  // Create a streaming response
  const customReadable = new ReadableStream({
    async start(_controller) {
      controller = _controller
      /*
      controller.enqueue(encoder.encode(`data: TESTING}\n\n`))
      controller.close()
      */
    },
  })
  // Return the stream response and keep the connection alive
  return new Response(customReadable, {
    // Set the headers for Server-Sent Events (SSE)
    headers: {
      Connection: 'keep-alive',
      'Content-Encoding': 'none',
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': 'text/event-stream; charset=utf-8',
    },
  })

}