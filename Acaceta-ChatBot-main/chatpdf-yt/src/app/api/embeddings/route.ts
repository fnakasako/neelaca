import fs from "fs";
import pdfParse from "pdf-parse";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

async function extractTextFromPDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  return pdfData.text;
}

export async function getEmbeddings(text: string): Promise<number[]> {
  try {
    const response = await replicate.run("replicate/llama-3", {
      input: {
        prompt: text.replace(/\n/g, " "),
        max_length: 512, // Adjust as needed
        temperature: 0.7, // Adjust as needed
      },
    });
    return response; // Adjust as needed to extract embeddings
  } catch (error) {
    console.error("Error calling Replicate API", error);
    throw error;
  }
}

export async function processPDF(filePath: string) {
  try {
    const text = await extractTextFromPDF(filePath);
    const embeddings = await getEmbeddings(text);
    console.log("Embeddings:", embeddings);
    return embeddings;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  }
}
