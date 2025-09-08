import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '../../lib/datastoreServer';
import { Topic, Comment } from '../../types';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
  }

  const { contentId, contentType } = req.body;

  if (!contentId || !contentType) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    let kind: string;
    if (contentType === 'topic') {
      kind = 'Topic';
    } else if (contentType === 'comment') {
      kind = 'Comment';
    } else {
      return res.status(400).json({ message: 'Invalid content type.' });
    }

    const entityKey = datastore.key([kind, contentId]);
    const [fetchedEntity] = await datastore.get(entityKey);

    if (!fetchedEntity) {
      return res.status(404).json({ message: 'Content not found.' });
    }

    const entity = fromDatastore<Topic | Comment>(fetchedEntity);
    entity.flags = (entity.flags || 0) + 1;

    await datastore.save({ key: entityKey, data: { ...entity, id: undefined } });
    console.log(`${contentType} "${contentId}" flagged. New flag count: ${entity.flags}`);

    res.status(200).json({ message: 'Content flagged successfully.' });

  } catch (error: any) {
    console.error('Error flagging content in Datastore:', error);
    res.status(500).json({ message: 'Failed to flag content.', error: error.message });
  }
}