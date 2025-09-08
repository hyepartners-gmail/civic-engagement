import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ message: 'Missing recipient, subject, or content for email.' });
    }

    // Log the payload for debugging
    const payload = {
      to,
      from: 'onboarding@resend.dev', // TEMPORARY: Using Resend's test email for easier debugging
      subject,
      html,
    };
    
    console.log('Sending test email with payload:', payload);

    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (response.ok) {
        res.status(200).json({ message: 'Test email sent successfully!', result });
      } else {
        res.status(response.status).json({ message: 'Failed to send test email', error: result });
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      res.status(500).json({ message: 'Error sending test email', error: error?.message || 'Unknown error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}