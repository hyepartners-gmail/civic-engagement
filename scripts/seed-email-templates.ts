import { datastore } from '../src/lib/datastoreServer';

interface EmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
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

async function seedEmailTemplates() {
  console.log('Seeding email templates...');
  
  try {
    for (const template of defaultTemplates) {
      // Check if template already exists
      const query = datastore.createQuery('EmailTemplate').filter('name', '=', template.name);
      const [entities] = await datastore.runQuery(query);
      
      if (entities.length === 0) {
        // Template doesn't exist, create it
        const templateKey = datastore.key('EmailTemplate');
        const now = new Date().toISOString();
        
        await datastore.save({
          key: templateKey,
          data: {
            ...template,
            createdAt: now,
            updatedAt: now,
          },
        });
        
        console.log(`Created template: ${template.name}`);
      } else {
        console.log(`Template already exists: ${template.name}`);
      }
    }
    
    console.log('Email templates seeding completed.');
  } catch (error) {
    console.error('Error seeding email templates:', error);
  }
}

// Run the seed function
seedEmailTemplates().catch(console.error);