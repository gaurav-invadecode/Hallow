
'use server';

/**
 * @fileOverview A weather and location information AI agent.
 *
 * - getWeather - A function that returns weather and location details for given coordinates.
 * - GetWeatherInput - The input type for the getWeather function.
 * - GetWeatherOutput - The return type for the getWeather function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetWeatherInputSchema = z.object({
  latitude: z.number().describe('The latitude for the location.'),
  longitude: z.number().describe('The longitude for the location.'),
});
export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

const GetWeatherOutputSchema = z.object({
  city: z.string().describe('The city name of the provided coordinates.'),
  countryCode: z.string().describe('The two-letter country code for the location.'),
  temperature: z.number().describe('The current temperature in Celsius.'),
  condition: z.string().describe('A brief description of the current weather condition (e.g., "Partly cloudy").'),
  locationQuote: z.string().describe('A creative and short quote or phrase about the identified city or country.'),
});
export type GetWeatherOutput = z.infer<typeof GetWeatherOutputSchema>;

export async function getWeather(input: GetWeatherInput): Promise<GetWeatherOutput> {
  return getWeatherFlow(input);
}

// Mock implementation of a tool to get weather data.
// In a real application, this would call a real weather API.
const getCurrentWeather = ai.defineTool(
  {
    name: 'getCurrentWeather',
    description: 'Get the current weather in a given location',
    inputSchema: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    outputSchema: z.object({
      temperature: z.number(),
      condition: z.string(),
      city: z.string(),
      countryCode: z.string(),
    }),
  },
  async ({ latitude, longitude }) => {
    // Mock data based on a known location (e.g., Mountain View, CA)
    if (Math.round(latitude) === 37 && Math.round(longitude) === -122) {
      return {
        city: 'Mountain View',
        countryCode: 'US',
        temperature: 18.5,
        condition: 'Sunny',
      };
    }
    // Generic mock data
    return {
      city: 'Somewhere',
      countryCode: 'XX',
      temperature: 24.6,
      condition: 'Partly cloudy',
    };
  }
);


const prompt = ai.definePrompt({
  name: 'getWeatherPrompt',
  input: { schema: GetWeatherInputSchema },
  output: { schema: GetWeatherOutputSchema },
  tools: [getCurrentWeather],
  prompt: `Based on the user's location, first call the \`getCurrentWeather\` tool. 
  Then, using the location information (city and country) from the tool's output, generate a creative and short quote or phrase about that place.
  For example, if the city is Paris, a quote could be "The city of lights and love." or for New Delhi, "The heart of India.".
  Finally, return all the information, including the generated quote, in the specified output format.`,
});

const getWeatherFlow = ai.defineFlow(
  {
    name: 'getWeatherFlow',
    inputSchema: GetWeatherInputSchema,
    outputSchema: GetWeatherOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
