import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { User } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user?.id) {
      return res.status(401).json({ message: 'No session found' });
    }

    const userId = session.user.id;
    console.log(`Debug: Looking for user with ID: ${userId} (type: ${typeof userId})`);
    
    // Try both string and numeric keys
    let fetchedUser = null;
    let userKey = datastore.key(['User', userId]);
    [fetchedUser] = await datastore.get(userKey);
    
    if (!fetchedUser && !isNaN(Number(userId))) {
      console.log(`Debug: String key failed, trying numeric key: ${parseInt(userId, 10)}`);
      userKey = datastore.key(['User', parseInt(userId, 10)]);
      [fetchedUser] = await datastore.get(userKey);
    }
    
    if (!fetchedUser) {
      return res.status(404).json({ 
        message: 'User not found',
        userId,
        userIdType: typeof userId,
        triedKeys: [
          `User/${userId}`,
          `User/${parseInt(userId, 10)}`
        ]
      });
    }
    
    const user = fromDatastore<User>(fetchedUser);
    
    return res.status(200).json({
      userId,
      userIdType: typeof userId,
      userEmail: user.email,
      votedSolutions: user.votedSolutions || [],
      votedSolutionsCount: (user.votedSolutions || []).length,
      foundWithKey: userKey.path
    });
  } catch (error) {
    console.error('Debug user votes error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ message: 'Internal server error', error: errorMessage });
  }
}