import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== TEST AUTH ENDPOINT ===');
  console.log('Request headers:', req.headers);
  console.log('Request cookies:', req.cookies);
  
  try {
    const session = await getServerSession(req, res, authOptions);
    console.log('Session from getServerSession:', session);
    
    return res.status(200).json({
      hasSession: !!session,
      session: session,
      cookies: req.cookies,
      userAgent: req.headers['user-agent'],
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer
    });
  } catch (error) {
    console.error('Error getting session:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}