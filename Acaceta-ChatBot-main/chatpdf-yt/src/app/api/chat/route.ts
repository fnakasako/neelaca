import Replicate from "replicate";
import { Message } from "ai";
import { getContext } from "@/lib/context";
import { db } from "@/lib/db";
import { chats, messages as _messages } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { processPDF } from "@/lib/embeddings"; // Import the processPDF function

export const runtime = "edge";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, chatIds } = await req.json();
    const _chats = await db.select().from(chats).where(inArray(chats.id, chatIds));
    if (_chats.length !== chatIds.length) {
      return NextResponse.json({ error: "some chats not found" }, { status: 404 });
    }

    const fileKeys = _chats.map(chat => chat.fileKey);
    const lastMessage = messages[messages.length - 1];

    // Process each PDF file and get embeddings
    const contextPromises = fileKeys.map(async (fileKey) => {
      const embeddings = await processPDF(fileKey); // Use processPDF to get embeddings
      return embeddings.join(" ");
    });

    const contexts = await Promise.all(contextPromises);
    const combinedContext = contexts.join("\n");

    const prompt = `
      AI assistant is a brand new, powerful, human-like artificial intelligence.
      The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
      AI is a well-behaved and well-mannered individual.
      AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
      AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
      AI assistant is a big fan of Pinecone and Vercel.
      START CONTEXT BLOCK
      ${combinedContext}
      END OF CONTEXT BLOCK
      AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
      If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer toHere's the modified version of the files to address the issue:

### embedding.ts

Ensure that the embedding function uses `prompt` instead of `text`:

```typescript
import Replicate from 'replicate';
import * as dotenv from 'dotenv';

dotenv.config();  // Load environment variables from .env file

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function getEmbeddings(prompt: string) {
  try {
    const prediction = await replicate.run("meta/meta-llama-3-8b", {
      input: {
        prompt,
      },
    });
    return prediction.embeddings;  // Assuming the response contains the embeddings directly
  } catch (error) {
    console.error("Error calling Replicate API", error);
    throw error;
  }
}
