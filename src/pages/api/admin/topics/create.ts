import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore } from '@/lib/datastoreServer';
import { Topic } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
  }

  const { title, preview, region, problemStatement, videoUrl, changeType, amendmentText, amendmentNumber } = req.body; // Added new fields

  if (!title || !preview || !region || !problemStatement) {
    return res.status(400).json({ message: 'Missing required topic fields.' });
  }

  // Declare variables once at the top of the function scope
  let finalAmendmentText: string | undefined = undefined;
  let finalAmendmentTextContinued: string | undefined = undefined;
  let finalAmendmentTextContinued2: string | undefined = undefined;
  let finalAmendmentNumber: number | undefined = undefined;

  // Validate amendment-specific fields if changeType is 'amendment'
  if (changeType === 'amendment') {
    if (!amendmentText || amendmentNumber === undefined || isNaN(Number(amendmentNumber))) {
      return res.status(400).json({ message: 'Amendment topics require amendmentText and a valid amendmentNumber.' });
    }
    
    finalAmendmentNumber = Number(amendmentNumber);

    // Split amendmentText into chunks if it's too long for Datastore (1500 bytes each)
    if (typeof amendmentText === 'string' && amendmentText.length > 1500) {
      finalAmendmentText = amendmentText.substring(0, 1500);
      const remainingText = amendmentText.substring(1500);
      if (remainingText.length > 1500) {
        finalAmendmentTextContinued = remainingText.substring(0, 1500);
        finalAmendmentTextContinued2 = remainingText.substring(1500);
      } else {
        finalAmendmentTextContinued = remainingText;
        finalAmendmentTextContinued2 = undefined;
      }
    } else {
      finalAmendmentText = amendmentText;
    }
  }

  try {
    const kind = 'Topic';
    const topicKey = datastore.key(kind);

    // Get the current topics to determine the next order value
    // We'll set the new topic to have an order after the last topic
    const query = datastore.createQuery('Topic');
    const [entities] = await datastore.runQuery(query);
    
    // Find the highest order value
    let maxOrder = -1;
    entities.forEach(entity => {
      if (entity.order !== undefined && entity.order > maxOrder) {
        maxOrder = entity.order;
      }
    });
    
    // Set the new topic's order to be after the last topic
    const newOrder = maxOrder + 1;

    const newTopic: Topic = {
      id: '', // ID will be set by Datastore
      title,
      preview,
      region,
      problemStatement,
      status: 'approved', // Admin-created topics are approved by default
      upvotes: 0,
      solutions: [],
      flags: 0,
      videoUrl: videoUrl || undefined,
      changeType: changeType || 'law', // Default to 'law' if not provided
      amendmentText: finalAmendmentText,
      amendmentTextContinued: finalAmendmentTextContinued,
      amendmentTextContinued2: finalAmendmentTextContinued2,
      amendmentNumber: finalAmendmentNumber,
      order: newOrder, // Set the order field
      createdAt: new Date().toISOString(), // Add creation date
    };

    await datastore.save({
      key: topicKey,
      data: newTopic,
    });

    if (topicKey.id) {
      newTopic.id = String(topicKey.id); // Set the ID after saving
    }

    res.status(201).json({ message: 'Topic created successfully.', topic: newTopic });
  } catch (error: any) {
    console.error('Error creating topic:', error);
    res.status(500).json({ message: 'Failed to create topic.', error: error.message });
  }
}