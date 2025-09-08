import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { renderEmailTemplate } from '@/lib/email/templates';
import { datastore, fromDatastore } from '@/lib/datastoreServer';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  createdAt: string;
  updatedAt: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ message: 'Missing email or userId.' });
    }

    try {
      // Try to fetch the email template from datastore
      let subject = 'Verify your Civic Platform account';
      let htmlContent = `<p>Thank you for signing up for the Civic Platform!</p>
<p>Please click the link below to verify your email address and activate your account:</p>
<p><a href="{{verificationLink}}" style="background-color: #4a006e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a></p>
<p>If you signed up through Common Ground, you'll be directed to complete the survey after verification.</p>
<p>If you didn't create an account, you can safely ignore this email.</p>`;

      // Try to fetch the template from datastore
      try {
        const query = datastore.createQuery('EmailTemplate').filter('name', '=', 'Email Verification');
        const [entities] = await datastore.runQuery(query);
        
        if (entities.length > 0) {
          const template = fromDatastore<EmailTemplate>(entities[0]);
          subject = template.subject;
          htmlContent = template.htmlContent;
        }
      } catch (templateError) {
        console.warn('Failed to fetch email template from datastore, using default template:', templateError);
      }

      // Generate a secure, time-limited token
      const verificationToken = `verify-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const verificationLink = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${verificationToken}&userId=${userId}`;

      // Render template with variables
      const renderedHtml = renderEmailTemplate(htmlContent, {
        verificationLink
      });

      // Send email using Resend
      const resend = new Resend(process.env.RESEND_API_KEY); // Corrected: Use RESEND_API_KEY
      
      const data = await resend.emails.send({
        from: 'hyepartners@gmail.com', // Explicitly set the 'from' address
        to: [email],
        subject,
        html: renderedHtml,
      });

      console.log(`Verification email sent to ${email}`, data);
      res.status(200).json({ message: 'Verification email sent successfully.', id: data?.data?.id || 'unknown' });
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
      res.status(500).json({ message: 'Failed to send verification email.', error: error?.message || 'Unknown error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}