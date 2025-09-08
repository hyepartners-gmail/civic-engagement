import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Notification } from '@/types/common-ground';
import { sendEmail } from '@/lib/common-ground/email';
import { nowIso } from '@/lib/common-ground/time';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // This endpoint should be secured (e.g., with a cron job secret)
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const query = datastore.createQuery('Notification').filter('sentAt', '=', null);
    const [entities] = await datastore.runQuery(query);
    const notifications = entities.map(e => fromDatastore<Notification>(e));

    let sentCount = 0;
    for (const notification of notifications) {
      // In a real app, you'd fetch the recipient's email and sender's name
      const recipientEmail = "user@example.com"; // Placeholder
      const senderName = notification.payload.senderName || "A group member";

      let subject = '';
      let body = '';

      if (notification.type === 'pairwise_ready') {
        subject = `New Common Ground report with ${senderName}`;
        body = `You can now see your pairwise comparison with ${senderName}. See your results: <a href="${notification.payload.url}">View Report</a>`;
      } else if (notification.type === 'nudge_to_survey') {
        subject = `${senderName} wants to find common ground with you`;
        body = `${senderName} has completed the survey and wants to compare results with you. Take the 2-minute survey now: <a href="${notification.payload.url}">Take Survey</a>`;
      }

      await sendEmail({ to: recipientEmail, subject, body });

      // Mark as sent
      const notificationKey = datastore.key(['Notification', notification.id]);
      await datastore.save({
        key: notificationKey,
        data: { ...notification, sentAt: nowIso(), id: undefined },
      });
      sentCount++;
    }

    res.status(200).json({ message: `Dispatched ${sentCount} notifications.` });
  } catch (error) {
    console.error('Error dispatching notifications:', error);
    res.status(500).json({ message: 'Failed to dispatch notifications.' });
  }
}