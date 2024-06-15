 import React from "react";

type Props = { pdf_url: string };

const PDFViewer = ({ pdf_url }: Props) => {
  return (
    <div className="relative w-full h-screen"> {/* Use h-screen for full height */}
    <iframe
      src={`https://docs.google.com/gview?url=${pdf_url}&embedded=true`}
      className="w-full h-full"
    ></iframe>
    </div>
  );
};

export default PDFViewer;