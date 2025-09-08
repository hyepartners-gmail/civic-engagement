import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'hyepartners@gmail.com',
          subject: 'Test Email from Resend Integration',
          body: `<p>Congrats on sending your <strong>first email</strong> with Resend!</p>
                 <p>This is a test email from the Civic Platform admin panel.</p>`,
        }),
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