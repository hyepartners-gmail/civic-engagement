import type { NextApiRequest, NextApiResponse } from 'next';

// Access the same cache instance
const civicInfoCache = new Map<string, { data: any; timestamp: number }>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { action } = req.query;

  if (action === 'clear') {
    civicInfoCache.clear();
    return res.status(200).json({ message: 'Cache cleared', size: 0 });
  }

  // Return cache contents
  const cacheEntries = Array.from(civicInfoCache.entries()).map(([key, value]) => ({
    key: key.substring(0, 16) + '...', // Show first 16 chars of hash
    timestamp: new Date(value.timestamp).toISOString(),
    hasData: !!value.data,
    electionName: value.data?.summary?.election?.name || 'No election'
  }));

  res.status(200).json({
    cacheSize: civicInfoCache.size,
    entries: cacheEntries
  });
}