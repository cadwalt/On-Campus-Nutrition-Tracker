// This is our backend file: api/chat.ts
// This code runs on Vercel's server, NOT in the user's browser.

import { verifyAuth } from './auth';

export default async function handler(request: Request) {
  // Authorization check (CWE 862 mitigation)
  try {
    verifyAuth(request);
  } catch (authError) {
    return new Response(
      JSON.stringify({ error: authError instanceof Error ? authError.message : 'Authentication required' }), 
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1. Get the user's prompt and context from the frontend
  const { prompt, systemContext } = await request.json();

  // 2. Get your secret API key from Vercel's *server-side* environment variables (never expose this to the client!)
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server key not configured" }), { status: 500 });
  }

  // 3. Build the message list for OpenAI
  const messages: Array<{ role: string; content: string }> = [];
  if (systemContext) {
    messages.push({ role: 'system', content: systemContext });
  }
  messages.push({ role: 'user', content: prompt });

  // 4. Call the OpenAI API from the server
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages
      })
    });

    const data = await response.json();
    
    // 5. Send *only* the response text back to our React frontend
    const assistantMessage = data.choices[0].message.content;
    return new Response(JSON.stringify({ content: assistantMessage }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to call OpenAI" }), { status: 500 });
  }
}

// Config to tell Vercel this is a fast "Edge Function"
export const config = {
  runtime: 'edge',
};