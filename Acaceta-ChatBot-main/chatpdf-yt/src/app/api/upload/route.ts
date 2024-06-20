import { NextApiRequest, NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import multer from 'multer';
import { processPDF } from '@/lib/embeddings'; // Adjust the path as necessary

// Configure multer storage
const upload = multer({ dest: '/tmp/uploads/' });

const apiRoute = nextConnect({
  onError(error, req: NextApiRequest, res: NextApiResponse) {
    res.status(500).json({ error: `Something went wrong: ${error.message}` });
  },
  onNoMatch(req: NextApiRequest, res: NextApiResponse) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.use(upload.single('file'));

apiRoute.post(async (req: NextApiRequest & { file: any }, res: NextApiResponse) => {
  try {
    const filePath = req.file.path;
    const embeddings = await processPDF(filePath);
    res.status(200).json({ embeddings });
  } catch (error) {
    res.status(500).json({ error: `Error processing file: ${error.message}` });
  }
});

export default apiRoute;

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, as we're handling file uploads
  },
};
