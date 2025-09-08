import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '../../../lib/datastoreServer';
import { DUMMY_TOPICS, DUMMY_COMMENTS } from '../../../lib/dummy-data'; // For fallback
import { Topic, Comment } from '../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { contentId, contentType } = req.body;

  if (!contentId || !contentType) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  let kind: string;
  let entity: Topic | Comment | undefined;
  let entityKey;

  try {
    if (contentType === 'topic') {
      kind = 'Topic';
      entityKey = datastore.key([kind, contentId]);
    } else if (contentType === 'comment') {
      kind = 'Comment';
      entityKey = datastore.key([kind, contentId]);
    } else {
      return res.status(400).json({ message: 'Invalid content type.' });
    }

    const [fetchedEntity] = await datastore.get(entityKey);

    if (fetchedEntity) {
      entity = fromDatastore(fetchedEntity);
    } else {
      // Fallback to dummy data if not found in Datastore
      if (contentType === 'topic') {
        entity = DUMMY_TOPICS.find(t => t.id === contentId);
      } else if (contentType === 'comment') {
        entity = DUMMY_COMMENTS.find(c => c.id === contentId);
      }
      if (!entity) {
        return res.status(404).json({ message: 'Content not found.' });
      }
      // If found in dummy, save to Datastore for future use
      await datastore.save({ key: entityKey, data: { ...entity, id: undefined } });
    }

    // Dismiss flags
    if (!entity) {
      return res.status(404).json({ message: 'Content not found.' });
    }
    
    entity.flags = 0;

    // Save updated entity back to Datastore
    await datastore.save({ key: entityKey, data: { ...entity, id: undefined } });
    console.log(`${contentType} "${contentId}" flags dismissed.`);

    res.status(200).json({ message: 'Flags dismissed successfully.' });

  } catch (error: any) {
    console.error('Error dismissing flags in Datastore, falling back to dummy data update:', error);
    // Fallback to updating dummy data
    let itemFound = false;
    if (contentType === 'topic') {
      const topic = DUMMY_TOPICS.find(t => t.id === contentId);
      if (topic) {
        topic.flags = 0;
        itemFound = true;
      }
    } else if (contentType === 'comment') {
      const comment = DUMMY_COMMENTS.find(c => c.id === contentId);
      if (comment) {
        comment.flags = 0;
        itemFound = true;
      }
    }

    if (itemFound) {
      res.status(200).json({ message: 'Flags dismissed successfully (dummy data updated).' });
    } else {
      res.status(500).json({ message: 'Failed to dismiss flags (Datastore error and dummy fallback failed).', error: error.message });
    }
  }
}