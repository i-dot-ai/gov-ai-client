import type { APIRoute } from 'astro'
import { getLlmResponse } from '../logic/ai-sdk'

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    console.log('Request body:', body) // Debug log
    
    const { messages, selectedServers, authToken, provider } = body

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format:', messages)
      return new Response('Invalid messages format', { status: 400 })
    }

    const result = await getLlmResponse(messages, selectedServers || [], authToken, provider)
    
    // Return the streaming response directly
    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Error in post-message:', error)
    return new Response(`Internal server error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 })
  }
}
