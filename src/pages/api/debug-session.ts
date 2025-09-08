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
    
    if (!session) {
      return res.status(401).json({ message: 'No session found' });
    }

    const userId = session.user?.id;
    
    let userFromDatastore = null;
    if (userId) {
      try {
        // Try both string and numeric keys
        const userKeyString = datastore.key(['User', userId]);
        const userKeyNumeric = datastore.key(['User', parseInt(userId, 10)]);
        
        let [fetchedUser] = await datastore.get(userKeyString);
        if (!fetchedUser) {
          [fetchedUser] = await datastore.get(userKeyNumeric);
        }
        
        if (fetchedUser) {
          userFromDatastore = fromDatastore<User>(fetchedUser);
        }
      } catch (error) {
        console.error('Error fetching user from datastore:', error);
      }
    }

    return res.status(200).json({
      session: {
        user: session.user,
        expires: session.expires
      },
      userFromDatastore,
      userId,
      userIdType: typeof userId,
      datastoreAttempts: {
        stringKey: `User/${userId}`,
        numericKey: `User/${parseInt(userId || '0', 10)}`
      }
    });
  } catch (error) {
    console.error('Debug session error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ message: 'Internal server error', error: errorMessage });
  }
}