import type { NextApiRequest, NextApiResponse } from 'next';
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
  if (req.method === 'GET') {
    try {
      // Fetch all email templates from datastore
      const query = datastore.createQuery('EmailTemplate');
      const [entities] = await datastore.runQuery(query);
      const templates = entities.map(entity => fromDatastore<EmailTemplate>(entity));
      
      res.status(200).json(templates);
    } catch (error: any) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({ message: 'Failed to fetch email templates.', error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { id, name, subject, htmlContent } = req.body;
      
      if (!name || !subject || !htmlContent) {
        return res.status(400).json({ message: 'Missing required fields: name, subject, or htmlContent.' });
      }
      
      const now = new Date().toISOString();
      let templateKey;
      let existingTemplate: any = null;

      if (id) {
        // If ID is provided, it's an update by ID
        templateKey = datastore.key(['EmailTemplate', id]);
        [existingTemplate] = await datastore.get(templateKey);
      } else {
        // If no ID, try to find by name (for upserting named templates)
        const queryByName = datastore.createQuery('EmailTemplate').filter('name', '=', name).limit(1);
        const [entitiesByName] = await datastore.runQuery(queryByName);
        if (entitiesByName.length > 0) {
          existingTemplate = entitiesByName[0];
          templateKey = existingTemplate[datastore.KEY];
        } else {
          // If not found by name, create a new key (Datastore will generate ID)
          templateKey = datastore.key('EmailTemplate');
        }
      }
      
      const templateData = {
        ...existingTemplate, // Preserve existing fields if updating
        name,
        subject,
        htmlContent,
        createdAt: existingTemplate?.createdAt || now, // Keep original createdAt if exists
        updatedAt: now,
      };
      
      await datastore.save({
        key: templateKey,
        data: templateData,
      });
      
      // Get the final ID/name from the key
      const templateId = String(templateKey.id || templateKey.name);
      
      res.status(200).json({ 
        message: 'Email template saved successfully.', 
        id: templateId 
      });
    } catch (error: any) {
      console.error('Error saving email template:', error);
      res.status(500).json({ message: 'Failed to save email template.', error: error.message });
    }
  } else if (req.method === 'GET' && req.query.id) {
    // Get specific template by ID
    try {
      const templateKey = datastore.key(['EmailTemplate', req.query.id as string]);
      const [entity] = await datastore.get(templateKey);
      
      if (!entity) {
        return res.status(404).json({ message: 'Template not found.' });
      }
      
      const template = fromDatastore<EmailTemplate>(entity);
      res.status(200).json(template);
    } catch (error: any) {
      console.error('Error fetching email template:', error);
      res.status(500).json({ message: 'Failed to fetch email template.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}