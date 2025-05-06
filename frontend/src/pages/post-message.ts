import { getLlmResponse } from '../logic/ai3.ts'
import type { Message } from '../logic/ai3.ts'

export async function POST({ request, redirect, session }) {

  // get user prompt
  let userPrompt = '';
  try {
    const data = await request.formData()
    userPrompt = data.get('prompt')?.toString() || ''
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message)
    }
  }

  // add user prompt to session data
  let messages: Message[] | undefined = await session?.get('messages')
  if (!messages) {
    messages = []
  }
  if (userPrompt) {
    messages.push({
      type: 'user', response: {
        content: userPrompt
      }
    })
  }

  // get LLM response
  let llmResponse
  if (userPrompt) {
    llmResponse = await getLlmResponse(messages)
  }

  // add LLM response to session data
  if (llmResponse) {
    messages.push({
      type: 'llm', response: llmResponse
    })
  }

  // save session data
  await session?.set('messages', messages)

  return redirect('/')
}
