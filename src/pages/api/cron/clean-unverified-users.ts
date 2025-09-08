import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { User } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // In a real production environment, this endpoint should be secured
  // (e.g., by checking a secret token in the request header or using Cloud Run's
  // built-in authentication with Cloud Scheduler). For this demo, it's open.

  console.log('Starting unverified user cleanup process...');

  let remindersSent = 0;
  let usersDeleted = 0;

  try {
    const query = datastore.createQuery('User').filter('isVerified', '=', false);
    const [unverifiedUsers] = await datastore.runQuery(query);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    for (const entity of unverifiedUsers) {
      const user = fromDatastore<User>(entity);
      const userCreationDate = new Date(user.lastActivityDate || user.lastActivityDate || now.toISOString()); // Use lastActivityDate or creation date

      // Logic for sending reminders
      if (userCreationDate < oneDayAgo && userCreationDate > fortyEightHoursAgo && (user.lastReminderSent === undefined || new Date(user.lastReminderSent) < oneDayAgo)) {
        // Send reminder email
        await fetch(`${process.env.NEXTAUTH_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.email,
            subject: 'Reminder: Verify Your Civic Platform Account',
            body: `Hi ${user.displayName},<br/><br/>This is a friendly reminder to verify your Civic Platform account. Please click the link below to complete your registration:<br/><br/><a href="${process.env.NEXTAUTH_URL}/api/verify-email?token=mock-token-${user.id}-${Date.now()}&userId=${user.id}">Verify Your Account</a><br/><br/>If you do not verify your account within 48 hours of registration, it may be deleted.`,
          }),
        });
        user.lastReminderSent = now.toISOString(); // Update last reminder sent timestamp
        // Removed datastore.int() as Datastore.key can handle string IDs directly
        await datastore.save({ key: datastore.key(['User', user.id!]), data: { ...user, id: undefined } });
        remindersSent++;
        console.log(`Sent verification reminder to ${user.email}`);
      }
      // Logic for deleting old unverified users
      else if (userCreationDate < fortyEightHoursAgo) {
        // Removed datastore.int() as Datastore.key can handle string IDs directly
        await datastore.delete(datastore.key(['User', user.id!]));
        usersDeleted++;
        console.log(`Deleted unverified user: ${user.email} (ID: ${user.id})`);
      }
    }

    res.status(200).json({
      message: 'Unverified user cleanup process completed.',
      remindersSent,
      usersDeleted,
    });

  } catch (error: any) {
    console.error('Error during unverified user cleanup:', error);
    res.status(500).json({
      message: 'Failed to complete unverified user cleanup process.',
      error: error.message,
      remindersSent,
      usersDeleted,
    });
  }
}