import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { User } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { token, userId } = req.query;

    if (!token || !userId) {
      return res.status(400).json({ message: 'Missing verification token or userId.' });
    }

    try {
      // Removed datastore.int() as Datastore.key can handle string IDs directly
      const userKey = datastore.key(['User', userId as string]);
      const [fetchedUser] = await datastore.get(userKey);

      if (!fetchedUser) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const user = fromDatastore<User>(fetchedUser);

      // In a real application, you would validate the token against a stored token
      // and check its expiry. For this simulation, we just check if it's present.
      if (user.isVerified) {
        console.log(`User ${user.displayName} (ID: ${userId}) already verified.`);
        // Add refetch=true to signal client to refresh session
        return res.redirect('/auth?verified=true&status=already&refetch=true');
      }

      // Mark user as verified
      user.isVerified = true;
      await datastore.save({ key: userKey, data: { ...user, id: undefined } });

      console.log(`User ${user.displayName} (ID: ${userId}) successfully verified.`);
      // Add refetch=true to signal client to refresh session
      res.redirect('/auth?verified=true&status=success&refetch=true');

    } catch (error: any) {
      console.error('Error during email verification:', error);
      res.redirect('/auth?verified=false&status=error');
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}