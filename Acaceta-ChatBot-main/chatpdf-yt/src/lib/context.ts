import { Pinecone } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getEmbeddings } from "./embeddings";

export async function getMatchesFromEmbeddings(embeddings, fileKeys) {
  const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  const pineconeIndex = await client.index("chatpdf-yt");
  const allMatches = [];

  for (const fileKey of fileKeys) {
    try {
      const namespace = pineconeIndex.namespace(convertToAscii(fileKey));
      const queryResult = await namespace.query({
        topK: 5,
        vector: embeddings,
        includeMetadata: true,
      });
      allMatches.push(...(queryResult.matches || []));
    } catch (error) {
      console.log(`Error querying embeddings for fileKey: ${fileKey}`, error);
    }
  }
  return allMatches;
}

export async function getContext(query, fileKeys) {
  const queryEmbeddings = await getEmbeddings(query);
  const matches = await getMatchesFromEmbeddings(queryEmbeddings, fileKeys);

  const qualifyingDocs = matches.filter(
    (match) => match.score && match.score > 0.7
  );

  type Metadata = {
    text: string;
    pageNumber: number;
  };

  let docs = qualifyingDocs.map((match) => (match.metadata as Metadata).text);
  // 5 vectors
  return docs.join("\n").substring(0, 3000);
}
