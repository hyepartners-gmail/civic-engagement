import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]'; // Import authOptions

interface EmailTemplate {
  id?: string; // ID is optional for seeding
  name: string;
  subject: string;
  htmlContent: string;
  createdAt?: string;
  updatedAt?: string;
}

const defaultTemplates: EmailTemplate[] = [
  {
    name: 'Email Verification',
    subject: 'Verify your Civic Platform account',
    htmlContent: `<p>Thank you for signing up for the Civic Platform!</p>
<p>Please click the link below to verify your email address and activate your account:</p>
<p><a href="{{verificationLink}}" style="background-color: #4a006e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a></p>
<p>If you signed up through Common Ground, you'll be directed to complete the survey after verification.</p>
<p>If you didn't create an account, you can safely ignore this email.</p>`
  },
  {
    name: 'Welcome Email',
    subject: 'Welcome to the Civic Platform!',
    htmlContent: `<p>Welcome to the Civic Platform!</p>
<p>Your account has been successfully verified. You can now participate in discussions and explore civic data.</p>
<p><a href="{{homepageLink}}" style="background-color: #4a006e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Go to Homepage</a></p>`
  },
  {
    name: 'Notification Email',
    subject: 'You have a new notification',
    htmlContent: `<p>Hello {{userName}},</p>
<p>You have received a new notification on the Civic Platform:</p>
<p>{{notificationContent}}</p>
<p><a href="{{notificationLink}}" style="background-color: #4a006e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Notification</a></p>`
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Check for admin authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  try {
    console.log('Seeding email templates...');
    
    // First, get all existing templates
    const query = datastore.createQuery('EmailTemplate');
    const [allEntities] = await datastore.runQuery(query);
    const existingTemplates = allEntities.map(entity => fromDatastore<EmailTemplate>(entity));
    
    // Create a map of existing templates by name for quick lookup
    const existingTemplatesMap = new Map<string, EmailTemplate>();
    existingTemplates.forEach(template => {
      existingTemplatesMap.set(template.name, template);
    });
    
    // Process each default template
    for (const template of defaultTemplates) {
      const now = new Date().toISOString();
      let templateKey;

      if (existingTemplatesMap.has(template.name)) {
        // Template exists, update it
        const existingTemplate = existingTemplatesMap.get(template.name)!;
        templateKey = datastore.key(['EmailTemplate', existingTemplate.id!]); // Use existing ID for key
        
        await datastore.save({
          key: templateKey,
          data: {
            name: template.name,
            subject: template.subject,
            htmlContent: template.htmlContent,
            createdAt: existingTemplate.createdAt || now, // Keep original createdAt
            updatedAt: now,
          },
        });
        console.log(`Updated template: ${template.name}`);
      } else {
        // Template doesn't exist, create it
        templateKey = datastore.key('EmailTemplate'); // Datastore will generate ID
        
        await datastore.save({
          key: templateKey,
          data: {
            name: template.name,
            subject: template.subject,
            htmlContent: template.htmlContent,
            createdAt: now,
            updatedAt: now,
          },
        });
        
        console.log(`Created template: ${template.name}`);
      }
    }
    
    res.status(200).json({ message: 'Email templates seeded successfully.' });
  } catch (error: any) {
    console.error('Error seeding email templates:', error);
    res.status(500).json({ message: 'Failed to seed email templates.', error: error.message });
  }
}