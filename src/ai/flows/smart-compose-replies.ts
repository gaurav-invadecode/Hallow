'use server';

/**
 * @fileOverview AI-powered suggestions for quick replies in chats.
 *
 * - smartComposeReplies - A function that generates reply suggestions for a given chat message.
 * - SmartComposeRepliesInput - The input type for the smartComposeReplies function.
 * - SmartComposeRepliesOutput - The return type for the smartComposeReplies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartComposeRepliesInputSchema = z.object({
  message: z.string().describe('The chat message to generate reply suggestions for.'),
  context: z.string().optional().describe('Context of the current conversation.'),
});
export type SmartComposeRepliesInput = z.infer<typeof SmartComposeRepliesInputSchema>;

const SmartComposeRepliesOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of suggested replies.'),
});
export type SmartComposeRepliesOutput = z.infer<typeof SmartComposeRepliesOutputSchema>;

export async function smartComposeReplies(input: SmartComposeRepliesInput): Promise<SmartComposeRepliesOutput> {
  return smartComposeRepliesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartComposeRepliesPrompt',
  input: {schema: SmartComposeRepliesInputSchema},
  output: {schema: SmartComposeRepliesOutputSchema},
  prompt: `You are a helpful assistant that generates suggested replies for chat messages.

  Given the following message and context, generate three diverse reply suggestions.

  Message: {{{message}}}
  Context: {{{context}}}

  Suggestions:`,
});

const smartComposeRepliesFlow = ai.defineFlow(
  {
    name: 'smartComposeRepliesFlow',
    inputSchema: SmartComposeRepliesInputSchema,
    outputSchema: SmartComposeRepliesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
