import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(file: File): Promise<{ file_key: string; file_name: string }> {
  const file_key = "uploads/" + Date.now().toString() + file.name.replace(" ", "-");

  const params = {
    Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
    Key: file_key,
    Body: file,
  };

  try {
    console.log("Uploading file to S3 with key:", file_key);
    await s3.send(new PutObjectCommand(params));
    console.log("Upload successful:", file_key);
    return {
      file_key,
      file_name: file.name,
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

export function getS3Url(file_key: string) {
  return `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.us-east-2.amazonaws.com/${file_key}`;
}
