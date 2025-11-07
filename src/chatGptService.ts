import OpenAI from 'openai';

// Load the OpenAI API key from the .env file
const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only use this in a secure environment
});

/**
 * Sends a prompt to ChatGPT and returns the response.
 * @param prompt The input prompt for ChatGPT.
 * @returns The response from ChatGPT.
 */
export async function getChatGptResponse(prompt: string, systemContext?: string): Promise<string> {
  try {
    const baseInstructions = 'You are a helpful nutritional assistant to University of Oklahoma students seeking to meet their nutritional goals.';
    const instructions = systemContext
      ? `${baseInstructions}\n\nUser Profile Context (use this to tailor advice):\n${systemContext}\n\nAlways strictly avoid allergens and honor dietary restrictions. Prefer options available on campus and budget-friendly.`
      : baseInstructions;
    const response = await client.responses.create({
      model: 'gpt-3.5-turbo', // Use the desired model (e.g., gpt-4, gpt-3.5-turbo)
      instructions,
      input: prompt,
    });

    // Extract and return the response content
    return response.output_text || 'No response';
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error('Failed to fetch response from ChatGPT');
  }
}