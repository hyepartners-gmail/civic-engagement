import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { datastore } from '@/lib/datastoreServer';
import { Group, GroupMember } from '@/types/common-ground';
import { generateGroupCode } from '@/lib/common-ground/ids';
import { nowIso } from '@/lib/common-ground/time';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'You must be logged in.' });
  }
  const userId = session.user.id;

  if (req.method === 'POST') {
    const { nickname, version } = req.body;

    try {
      console.log(`[GROUP_CREATE] Starting group creation for user ${userId}`);
      
      const transaction = datastore.transaction();
      await transaction.run();

      // Create group with incomplete key (let datastore assign ID)
      const groupKey = datastore.key('Group');

      const groupData: Omit<Group, 'id'> = {
        ownerUserId: userId,
        nickname: nickname || 'My Group',
        version: version || 'v1',
        groupCode: generateGroupCode(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      // Save the group first
      transaction.save({ key: groupKey, data: groupData });
      
      // Commit to get the group ID
      await transaction.commit();
      
      const groupId = groupKey.id;
      console.log(`[GROUP_CREATE] Created group with ID: ${groupId}`);

      if (!groupId) {
        throw new Error("Failed to get group ID after creation.");
      }

      // Now create the owner as a group member in a separate transaction
      const memberTransaction = datastore.transaction();
      await memberTransaction.run();

      const memberKey = datastore.key(['Group', groupId, 'GroupMember', userId]);

      const memberData: Omit<GroupMember, 'id'> = {
        role: 'owner',
        alias: session.user.name || 'Owner',
        joinedAt: nowIso(),
      };
      
      console.log(`[GROUP_CREATE] Creating member with key: Group/${groupId}/GroupMember/${userId}`);
      
      memberTransaction.save({ key: memberKey, data: memberData });
      await memberTransaction.commit();

      console.log(`[GROUP_CREATE] Successfully created group ${groupId} with owner member ${userId}`);

      const responseBody = { groupId: String(groupId), groupCode: groupData.groupCode };
      res.status(201).json(responseBody);

    } catch (error) {
      console.error('Failed to create group:', error);
      res.status(500).json({ message: 'Failed to create group. Please check your database connection.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}