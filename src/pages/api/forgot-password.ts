import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { User } from '@/types';
import { v4 as uuidv4 } from 'uuid'; // For generating unique tokens

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Missing email address.' });
  }

  try {
    const query = datastore.createQuery('User').filter('email', '=', email).limit(1);
    const [entities] = await datastore.runQuery(query);
    let user: User | null = null;

    if (entities.length > 0) {
      user = fromDatastore<User>(entities[0]);

      // Generate a unique token and set expiry (e.g., 1 hour from now)
      const resetToken = uuidv4();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

      user.resetToken = resetToken;
      user.resetTokenExpiry = resetTokenExpiry;

      // Save updated user with token to Datastore
      // Removed datastore.int() as Datastore.key can handle string IDs directly
      const userKey = datastore.key(['User', user.id!]);
      await datastore.save({ key: userKey, data: { ...user, id: undefined } });

      // Simulate sending email with the reset link
      const resetLink = `${process.env.NEXTAUTH_URL}/auth?mode=reset-password&token=${resetToken}&userId=${user.id}`;
      await fetch(`${process.env.NEXTAUTH_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: 'Civic Platform Password Reset Request',
          body: `You have requested a password reset for your Civic Platform account. Please click the following link to reset your password: <a href="${resetLink}">${resetLink}</a><br/><br/>This link will expire in 1 hour. If you did not request this, please ignore this email.`,
        }),
      });
      console.log(`Simulated password reset email sent to ${user.email} with token: ${resetToken}`);
    } else {
      console.log(`Password reset requested for non-existent email: ${email}`);
    }

    // Always return a generic success message for security reasons
    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error: any) {
    console.error('Error during forgot password process:', error);
    res.status(500).json({ message: 'Failed to process password reset request.', error: error.message });
  }
}