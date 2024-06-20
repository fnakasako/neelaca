"use client";
import { uploadToS3 } from "@/lib/s3";
import { useMutation } from "@tanstack/react-query";
import { Inbox, Loader2 } from "lucide-react";
import React from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

const FileUpload = () => {
  const router = useRouter();
  const [uploading, setUploading] = React.useState(false);
  const { mutate, isLoading } = useMutation({
    mutationFn: async ({
      file_keys,
      file_names,
    }: {
      file_keys: string[];
      file_names: string[];
    }) => {
      const response = await axios.post("/api/create-chat", {
        file_keys,
        file_names,
      });
      return response.data;
    },
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 10, // Allow multiple files
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.some(file => file.size > 10 * 1024 * 1024)) {
        toast.error("One or more files are too large");
        return;
      }

      try {
        setUploading(true);
        const uploadPromises = acceptedFiles.map(file => uploadToS3(file));
        const uploadResults = await Promise.all(uploadPromises);

        const file_keys = uploadResults.map(result => result.file_key);
        const file_names = uploadResults.map(result => result.file_name);

        if (!file_keys.length || !file_names.length) {
          toast.error("Something went wrong");
          return;
        }

        console.log('Sending file_keys:', file_keys);
        console.log('Sending file_names:', file_names);

        mutate({ file_keys, file_names }, {
          onSuccess: ({ chat_ids }) => {
            toast.success("Chat created!");
            router.push(`/chat/${chat_ids[0]}`); // Redirect to the first chat id for simplicity
          },
          onError: (err) => {
            toast.error("Error creating chat");
            console.error(err);
          },
        });
      } catch (error) {
        console.log(error);
      } finally {
        setUploading(false);
      }
    },
  });

  return (
    <div className="p-2 bg-white rounded-xl">
      <div
        {...getRootProps({
          className:
            "border-dashed border-2 rounded-xl cursor-pointer bg-gray-50 py-8 flex justify-center items-center flex-col",
        })}
      >
        <input {...getInputProps()} multiple />
        {uploading || isLoading ? (
          <>
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            <p className="mt-2 text-sm text-slate-400">Spilling Tea to GPT...</p>
          </>
        ) : (
          <>
            <Inbox className="w-10 h-10 text-blue-500" />
            <p className="mt-2 text-sm text-slate-400">Drop PDFs Here</p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
