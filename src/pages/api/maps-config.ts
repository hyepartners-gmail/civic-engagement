import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  
  console.log('Maps config API called');
  console.log('API key exists:', !!apiKey);
  console.log('API key length:', apiKey?.length || 0);

  if (!apiKey) {
    console.error('GOOGLE_CIVIC_API_KEY environment variable not set');
    return res.status(500).json({ error: 'Google API key not configured' });
  }

  // Return the API key for client-side use
  res.status(200).json({ apiKey });
}