import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '../../../lib/datastoreServer';
import { User } from '../../../types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
  }

  const { userId, mute } = req.body;

  if (!userId || typeof mute !== 'boolean') {
    return res.status(400).json({ message: 'Missing userId or mute status.' });
  }

  try {
    const userKey = datastore.key(['User', userId]);
    const [fetchedUser] = await datastore.get(userKey);

    if (!fetchedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = fromDatastore<User>(fetchedUser);
    user.isMuted = mute;

    await datastore.save({ key: userKey, data: { ...user, id: undefined } });
    console.log(`User ${user.displayName} has been ${mute ? 'muted' : 'unmuted'} in Datastore.`);

    res.status(200).json({ message: `User ${mute ? 'muted' : 'unmuted'} successfully.` });

  } catch (error: any) {
    console.error('Error muting user in Datastore:', error);
    res.status(500).json({ message: 'Failed to update user mute status.', error: error.message });
  }
}