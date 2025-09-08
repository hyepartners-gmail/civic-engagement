import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { DUMMY_TOPICS } from '@/lib/dummy-data';
import { Topic } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
  }

  let topicsCreated = 0;
  let topicsUpdated = 0;
  let errorsEncountered = 0;

  try {
    for (const dummyTopic of DUMMY_TOPICS) {
      // Handle both string and numeric IDs properly
      const topicId = !isNaN(Number(dummyTopic.id)) ? Number(dummyTopic.id) : dummyTopic.id;
      const topicKey = datastore.key(['Topic', topicId]);
      const [existingTopicEntity] = await datastore.get(topicKey);

      if (existingTopicEntity) {
        // Topic exists, update it
        const existingTopic = fromDatastore<Topic>(existingTopicEntity);
        const updatedTopicData = { ...existingTopic, ...dummyTopic, id: undefined }; // Merge and remove ID for saving
        // Split amendmentText into chunks if it's too long for Datastore (1500 bytes each)
        if (typeof updatedTopicData.amendmentText === 'string') {
          const fullText = updatedTopicData.amendmentText;
          if (fullText.length > 1500) {
            updatedTopicData.amendmentText = fullText.substring(0, 1500);
            const remainingText = fullText.substring(1500);
            if (remainingText.length > 1500) {
              updatedTopicData.amendmentTextContinued = remainingText.substring(0, 1500);
              updatedTopicData.amendmentTextContinued2 = remainingText.substring(1500);
            } else {
              updatedTopicData.amendmentTextContinued = remainingText;
              updatedTopicData.amendmentTextContinued2 = undefined;
            }
          } else {
            // If amendmentText is short enough, ensure continuation fields are undefined
            updatedTopicData.amendmentTextContinued = undefined;
            updatedTopicData.amendmentTextContinued2 = undefined;
          }
        }
        await datastore.save({ key: topicKey, data: updatedTopicData });
        topicsUpdated++;
        console.log(`Updated topic: ${dummyTopic.title} (ID: ${dummyTopic.id})`);
      } else {
        // Topic does not exist, create it
        const newTopicData = { ...dummyTopic, id: undefined }; // Remove ID for saving, Datastore will use key ID
        // Split amendmentText into chunks if it's too long for Datastore (1500 bytes each)
        if (typeof newTopicData.amendmentText === 'string') {
          const fullText = newTopicData.amendmentText;
          if (fullText.length > 1500) {
            newTopicData.amendmentText = fullText.substring(0, 1500);
            const remainingText = fullText.substring(1500);
            if (remainingText.length > 1500) {
              newTopicData.amendmentTextContinued = remainingText.substring(0, 1500);
              newTopicData.amendmentTextContinued2 = remainingText.substring(1500);
            } else {
              newTopicData.amendmentTextContinued = remainingText;
              newTopicData.amendmentTextContinued2 = undefined;
            }
          } else {
            // If amendmentText is short enough, ensure continuation fields are undefined
            newTopicData.amendmentTextContinued = undefined;
            newTopicData.amendmentTextContinued2 = undefined;
          }
        }
        await datastore.save({ key: topicKey, data: newTopicData });
        topicsCreated++;
        console.log(`Created new topic: ${dummyTopic.title} (ID: ${dummyTopic.id})`);
      }
    }

    res.status(200).json({
      message: 'Topic seeding completed.',
      topicsCreated,
      topicsUpdated,
      errorsEncountered,
    });
  } catch (error: any) {
    console.error('Error during topic seeding:', error);
    res.status(500).json({
      message: 'Failed to seed topics.',
      error: error.message,
      topicsCreated,
      topicsUpdated,
      errorsEncountered: errorsEncountered + 1,
    });
  }
}