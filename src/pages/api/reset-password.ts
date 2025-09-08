import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { User } from '@/types';
import { isValidPassword } from '@/utils/validation'; // Import validation utility

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { userId, token, newPassword } = req.body;

  if (!userId || !token || !newPassword) {
    return res.status(400).json({ message: 'Missing userId, token, or newPassword.' });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ message: 'New password does not meet complexity requirements.' });
  }

  try {
    // Removed datastore.int() as Datastore.key can handle string IDs directly
    const userKey = datastore.key(['User', userId]);
    const [fetchedUser] = await datastore.get(userKey);

    if (!fetchedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = fromDatastore<User>(fetchedUser);

    // Validate token and expiry
    if (user.resetToken !== token || user.resetTokenExpiry === undefined || new Date(user.resetTokenExpiry) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    // Simulate updating the password (in a real app, this would be a hashed password)
    // For demonstration, we'll just log it and assume it's updated.
    console.log(`User ${user.displayName} (ID: ${userId}) password reset to: ${newPassword}`);

    // Clear the reset token fields
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    // Save updated user back to Datastore
    await datastore.save({ key: userKey, data: { ...user, id: undefined } });

    res.status(200).json({ message: 'Your password has been successfully reset.' });

  } catch (error: any) {
    console.error('Error during password reset:', error);
    res.status(500).json({ message: 'Failed to reset password.', error: error.message });
  }
}