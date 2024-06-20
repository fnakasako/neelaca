import { S3 } from "@aws-sdk/client-s3";
import fs from "fs";
var AWS = require('aws-sdk');
var s3 = new AWS.S3({ endpoint: 'https://acaceta.s3.us-east-2.amazonaws.com' });

export async function downloadFromS3(file_keys: string[]): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Downloading file_keys:', file_keys);

      if (!Array.isArray(file_keys)) {
        file_keys = [file_keys];
      }

      const s3 = new S3({
        region: "us-east-2",
        credentials: {
          accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
        },
      });

      const downloadPromises = file_keys.map(async (file_key) => {
        const params = {
          Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
          Key: file_key,
        };

        const obj = await s3.getObject(params);
        const file_name = `/tmp/elliott${Date.now().toString()}-${file_key.replace('/', '-')}.pdf`;

        return new Promise<string>((resolveFile, rejectFile) => {
          if (obj.Body instanceof require("stream").Readable) {
            const file = fs.createWriteStream(file_name);
            file.on("open", function (fd) {
              obj.Body?.pipe(file).on("finish", () => {
                resolveFile(file_name);
              }).on("error", (err) => {
                rejectFile(err);
              });
            });
          } else {
            rejectFile(new Error("Invalid file stream"));
          }
        });
      });

      const fileNames = await Promise.all(downloadPromises);
      resolve(fileNames);
    } catch (error) {
      console.error(error);
      reject(error);
    }
  });
}
