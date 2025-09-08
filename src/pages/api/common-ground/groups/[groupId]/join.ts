import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Group, GroupMember } from '@/types/common-ground';
import { nowIso } from '@/lib/common-ground/time';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'You must be logged in.' });
  }
  const userId = session.user.id;

  const { groupId } = req.query;
  if (typeof groupId !== 'string') {
    return res.status(400).json({ message: 'Invalid group ID.' });
  }

  if (req.method === 'POST') {
    const { groupCode } = req.body;
    if (!groupCode) {
      return res.status(400).json({ message: 'Group code is required.' });
    }

    const transaction = datastore.transaction();
    try {
      await transaction.run();
      
      // Convert the string ID from the URL to a number for the Datastore key
      const numericGroupId = parseInt(groupId, 10);
      if (isNaN(numericGroupId)) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Group ID must be a valid number.' });
      }
      
      const groupKey = datastore.key(['Group', numericGroupId]);
      const [groupEntity] = await datastore.get(groupKey);
      
      console.log(`Attempting to join group ${numericGroupId} with code ${groupCode}`);
      console.log('Group entity found:', !!groupEntity);
      if (groupEntity) {
        console.log('Group code in DB:', groupEntity.groupCode);
        console.log('Provided code:', groupCode);
        console.log('Codes match:', groupEntity.groupCode === groupCode);
      }

      if (!groupEntity) {
        await transaction.rollback();
        console.error(`Group ${numericGroupId} not found in database`);
        return res.status(404).json({ message: 'Group not found.' });
      }
      
      if (groupEntity.groupCode !== groupCode) {
        await transaction.rollback();
        console.error(`Group code mismatch. Expected: ${groupEntity.groupCode}, Got: ${groupCode}`);
        return res.status(400).json({ message: 'Invalid group code.' });
      }

      const memberKey = datastore.key(['Group', numericGroupId, 'GroupMember', userId]);
      const [memberEntity] = await transaction.get(memberKey);

      if (memberEntity) {
        await transaction.rollback();
        return res.status(409).json({ message: 'You are already a member of this group.' });
      }

      const memberData: Omit<GroupMember, 'id'> = {
        role: 'member',
        alias: session.user.name || `Member #${Math.floor(Math.random() * 1000)}`,
        joinedAt: nowIso(),
      };
      transaction.save({ key: memberKey, data: memberData });

      await transaction.commit();
      res.status(200).json({ message: 'Successfully joined group.' });
    } catch (error) {
      await transaction.rollback();
      console.error(`Error joining group ${groupId}:`, error);
      res.status(500).json({ message: 'Failed to join group.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}