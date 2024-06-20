// embeddings.ts

import { Replicate } from 'replicate';
import { convertToAscii } from './utils';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function getEmbeddings(text: string): Promise<number[]> {
  try {
    const model = process.env.REPLICATE_MODEL!;
    const input = { text: convertToAscii(text) };
    
    console.log("Sending text to Replicate API for embeddings:", input);

    const response = await replicate.predict(model, { input });
    
    console.log("Received response from Replicate API:", response);

    if (!Array.isArray(response)) {
      throw new Error("Response is not an array");
    }

    response.forEach((item, index) => {
      if (typeof item !== 'number') {
        throw new Error(`Embedding item at index ${index} is not a number: ${item}`);
      }
    });

    return response;
  } catch (error) {
    console.error("Error in getEmbeddings:", error);
    throw error;
  }
}
