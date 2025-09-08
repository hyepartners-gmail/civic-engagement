import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { User } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  // Check if user is authenticated and is an admin
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch all users from Datastore
      const query = datastore.createQuery('User');
      const [userEntities] = await datastore.runQuery(query);
      
      const users: User[] = userEntities.map(entity => fromDatastore<User>(entity));
      
      // Sort users by last activity date (most recent first)
      users.sort((a, b) => {
        const dateA = new Date(a.lastActivityDate || '1970-01-01');
        const dateB = new Date(b.lastActivityDate || '1970-01-01');
        return dateB.getTime() - dateA.getTime();
      });

      res.status(200).json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  } else if (req.method === 'PUT') {
    // Update user (for role changes, muting, etc.)
    const { userId, updates } = req.body;

    if (!userId || !updates) {
      return res.status(400).json({ message: 'Missing userId or updates' });
    }

    try {
      // Try both string and numeric keys
      const userKeyString = datastore.key(['User', userId]);
      const userKeyNumeric = datastore.key(['User', parseInt(userId, 10)]);
      
      let [fetchedUser] = await datastore.get(userKeyString);
      let userKey = userKeyString;
      
      if (!fetchedUser) {
        [fetchedUser] = await datastore.get(userKeyNumeric);
        userKey = userKeyNumeric;
      }

      if (!fetchedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = fromDatastore<User>(fetchedUser);
      
      // Apply updates
      const updatedUser = { ...user, ...updates };
      
      // Save updated user
      await datastore.save({ key: userKey, data: { ...updatedUser, id: undefined } });
      
      res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).json({ message: 'Method not allowed' });
  }
}