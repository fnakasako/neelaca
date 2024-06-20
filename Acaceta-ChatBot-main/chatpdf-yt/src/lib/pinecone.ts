import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import md5 from "md5";
import { Document, RecursiveCharacterTextSplitter } from "@pinecone-database/doc-splitter";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import stream from "stream";

const pipeline = promisify(stream.pipeline);
const writeFileAsync = promisify(fs.writeFile);

const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
  },
});

export const getPineconeClient = () => {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(fileKey: string) {
  try {
    console.log("Starting loadS3IntoPinecone with fileKey:", fileKey);

    // 1. Download the PDF from S3 and read it
    console.log("Downloading S3 file into file system");
    const filePath = await downloadFromS3(fileKey);
    if (!filePath) {
      throw new Error("Could not download from S3");
    }
    console.log("Loading PDF into memory:", filePath);
    const loader = new PDFLoader(filePath);
    const pages = (await loader.load()) as PDFPage[];

    // 2. Split and segment the PDF
    const documents = await Promise.all(pages.map(prepareDocument));

    // 3. Vectorize and embed individual documents
    const vectors = await Promise.all(documents.flat().map(embedDocument));

    // 4. Upload to Pinecone
    const client = await getPineconeClient();
    const pineconeIndex = await client.index("chatpdf-yt");
    const namespace = pineconeIndex.namespace(convertToAscii(fileKey));

    console.log("Vectors to upsert:", vectors);
    console.log("Inserting vectors into Pinecone");
    await namespace.upsert(vectors);

    console.log("Finished inserting vectors into Pinecone");
    return documents[0];
  } catch (error) {
    console.error("Error in loadS3IntoPinecone:", error);
    throw error;
  }
}

async function embedDocument(doc: Document) {
  try {
    console.log("Embedding document:", doc.metadata.pageNumber);
    const embeddings = await getEmbeddings(doc.pageContent);

    if (!embeddings || embeddings.length === 0) {
      throw new Error("Embeddings are empty or invalid");
    }

    // Ensure all elements in embeddings are numbers
    if (!embeddings.every(item => typeof item === 'number')) {
      throw new Error("Embedding item is not a number");
    }

    const hash = md5(doc.pageContent);

    console.log("Embeddings for document:", embeddings);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    } as PineconeRecord;
  } catch (error) {
    console.log("Error embedding document:", error);
    throw error;
  }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");
  // Split the docs
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}

async function downloadFromS3(fileKey: string): Promise<string> {
  try {
    console.log("Downloading file from S3 with key:", fileKey);
    const command = new GetObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: fileKey,
    });

    const { Body } = await s3.send(command);
    const filePath = path.join("/tmp", fileKey.replace(/\//g, "_"));

    if (Body instanceof stream.Readable) {
      await pipeline(Body, fs.createWriteStream(filePath));
    } else if (Body instanceof Uint8Array) {
      await writeFileAsync(filePath, Buffer.from(Body));
    } else {
      throw new Error("Unsupported body type");
    }

    console.log("Downloaded file to:", filePath);
    return filePath;
  } catch (error) {
    console.error("Error downloading from S3:", error);
    throw error;
  }
}
