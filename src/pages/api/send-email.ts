import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { renderEmailTemplate } from '@/lib/email/templates';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { to, from, subject, html, body, templateVariables } = req.body;

    console.log('Received email request with payload:', req.body);

    if (!to || !subject || (!html && !body)) {
      return res.status(400).json({ message: 'Missing recipient, subject, or content for email.' });
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY); // Corrected: Use RESEND_API_KEY
      
      // Render template if variables are provided
      const htmlContent = templateVariables ? renderEmailTemplate(html || body, templateVariables) : (html || body);
      
      // Use provided from address or default to hyepartners@gmail.com
      const fromAddress = from || 'hyepartners@gmail.com';
      
      console.log('Attempting to send email with:', {
        from: fromAddress,
        to: [to],
        subject: subject,
        html: htmlContent,
      });
      
      const data = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: subject,
        html: htmlContent,
      });

      console.log(`Full Resend API response for email to ${to}:`, data); // Added full response logging
      
      if (data?.data?.id) { // Check for actual ID from Resend
        res.status(200).json({ message: 'Email sent successfully!', id: data.data.id });
      } else {
        // If no ID, it means Resend didn't fully process it, even if HTTP status was 200
        console.error('Resend API did not return an email ID, indicating a potential issue:', data);
        res.status(500).json({ message: 'Email sent, but Resend did not confirm with an ID. Check Resend dashboard for errors.', id: 'unknown', resendResponse: data });
      }
    } catch (error: any) {
      console.error('Failed to send email:', error);
      res.status(500).json({ message: 'Failed to send email.', error: error?.message || 'Unknown error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}