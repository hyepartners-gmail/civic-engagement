// Utility functions for handling email templates

interface TemplateVariables {
  [key: string]: string;
}

/**
 * Replace template variables in HTML content
 * @param htmlContent The HTML template with variables in {{variable}} format
 * @param variables Object containing variable values
 * @returns HTML content with variables replaced
 */
export function renderEmailTemplate(htmlContent: string, variables: TemplateVariables): string {
  let result = htmlContent;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Get the default verification email template
 */
export function getVerificationEmailTemplate(): { subject: string; html: string } {
  return {
    subject: 'Verify your Civic Platform account',
    html: `<p>Thank you for signing up for the Civic Platform!</p>
<p>Please click the link below to verify your email address and activate your account:</p>
<p><a href="{{verificationLink}}" style="background-color: #4a006e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a></p>
<p>If you signed up through Common Ground, you'll be directed to complete the survey after verification.</p>
<p>If you didn't create an account, you can safely ignore this email.</p>`
  };
}

/**
 * Get the default welcome email template
 */
export function getWelcomeEmailTemplate(): { subject: string; html: string } {
  return {
    subject: 'Welcome to the Civic Platform!',
    html: `<p>Welcome to the Civic Platform!</p>
<p>Your account has been successfully verified. You can now participate in discussions and explore civic data.</p>
<p><a href="{{homepageLink}}" style="background-color: #4a006e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Go to Homepage</a></p>`
  };
}

/**
 * Get the default notification email template
 */
export function getNotificationEmailTemplate(): { subject: string; html: string } {
  return {
    subject: 'You have a new notification',
    html: `<p>Hello {{userName}},</p>
<p>You have received a new notification on the Civic Platform:</p>
<p>{{notificationContent}}</p>
<p><a href="{{notificationLink}}" style="background-color: #4a006e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Notification</a></p>`
  };
}