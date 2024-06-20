import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { loadS3IntoPinecone } from "@/lib/pinecone";
import { getS3Url } from "@/lib/s3";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function POST(req: Request, res: Response) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    let { file_keys, file_names } = body; // Expecting arrays of file keys and names

    console.log("Received file_keys:", file_keys);
    console.log("Received file_names:", file_names);

    if (!Array.isArray(file_keys)) {
      file_keys = [file_keys];
    }
    if (!Array.isArray(file_names)) {
      file_names = [file_names];
    }

    console.log("Validated file_keys:", file_keys);
    console.log("Validated file_names:", file_names);

    const fileDataPromises = file_keys.map(async (file_key, index) => {
      const file_name = file_names[index];
      await loadS3IntoPinecone(file_key);
      const pdfUrl = getS3Url(file_key);
      return { fileKey: file_key, pdfName: file_name, pdfUrl, userId };
    });

    const fileData = await Promise.all(fileDataPromises);
    const chatEntries = await db
      .insert(chats)
      .values(fileData)
      .returning({
        insertedId: chats.id,
      });

    const chatIds = chatEntries.map(entry => entry.insertedId);

    return NextResponse.json(
      {
        chat_ids: chatIds,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}
