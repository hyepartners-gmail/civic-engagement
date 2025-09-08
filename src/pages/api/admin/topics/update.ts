import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
  }

  const { id, ...updates } = req.body; // isAdmin is now derived from session

  if (!id) {
    return res.status(400).json({ message: 'Missing topic ID for update.' });
  }

  // Validate amendment-specific fields if changeType is 'amendment' in updates
  if (updates.changeType === 'amendment') {
    if (updates.amendmentText === undefined || updates.amendmentNumber === undefined || isNaN(Number(updates.amendmentNumber))) {
      return res.status(400).json({ message: 'Amendment topics require amendmentText and a valid amendmentNumber.' });
    }
    // Split amendmentText into chunks if it's too long for Datastore (1500 bytes each)
    if (typeof updates.amendmentText === 'string') {
      const fullText = updates.amendmentText;
      if (fullText.length > 1500) {
        updates.amendmentText = fullText.substring(0, 1500);
        const remainingText = fullText.substring(1500);
        if (remainingText.length > 1500) {
          updates.amendmentTextContinued = remainingText.substring(0, 1500);
          updates.amendmentTextContinued2 = remainingText.substring(1500);
        } else {
          updates.amendmentTextContinued = remainingText;
          updates.amendmentTextContinued2 = undefined;
        }
      } else {
        // If amendmentText is short enough, ensure continuation fields are undefined
        updates.amendmentTextContinued = undefined;
        updates.amendmentTextContinued2 = undefined;
      }
    }
  }

  try {
    const kind = 'Topic';
    // Handle both string and numeric IDs properly
    const topicId = !isNaN(Number(id)) ? Number(id) : id;
    const topicKey = datastore.key([kind, topicId]);

    const [topicEntity] = await datastore.get(topicKey);

    if (!topicEntity) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const existingTopic = fromDatastore<Topic>(topicEntity);

    // Apply updates, ensuring 'id' is not overwritten
    const updatedTopic: Topic = {
      ...existingTopic,
      ...updates,
      id: existingTopic.id, // Ensure ID remains the original
      // Ensure amendmentNumber is stored as a number if provided
      amendmentNumber: updates.amendmentNumber !== undefined && !isNaN(Number(updates.amendmentNumber)) ? Number(updates.amendmentNumber) : existingTopic.amendmentNumber,
      // Preserve order field if not explicitly updated
      order: updates.order !== undefined ? updates.order : existingTopic.order,
    };

    await datastore.save({
      key: topicKey,
      data: { ...updatedTopic, id: undefined }, // Remove ID from data before saving
    });

    res.status(200).json({ message: 'Topic updated successfully.', topic: updatedTopic });
  } catch (error: any) {
    console.error('Error updating topic:', error);
    res.status(500).json({ message: 'Failed to update topic.', error: error.message });
  }
}