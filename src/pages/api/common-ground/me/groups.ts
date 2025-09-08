import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Group, GroupMember } from '@/types/common-ground';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'You must be logged in.' });
  }
  const userId = session.user.id;

  try {
    // Find all groups where the user is a member
    const memberQuery = datastore.createQuery('GroupMember')
      .hasAncestor(datastore.key(['User', userId]));
    const [memberEntities] = await datastore.runQuery(memberQuery);
    
    if (memberEntities.length === 0) {
      return res.status(200).json([]);
    }

    // Get the group details for each membership
    const groupPromises = memberEntities.map(async (memberEntity) => {
      const member = fromDatastore<GroupMember>(memberEntity);
      
      // Extract group ID from the member entity's key path
      const keyPath = memberEntity[datastore.KEY].path;
      const groupId = keyPath[keyPath.length - 3]; // Group ID is 3 positions back from GroupMember
      
      // Get the group details
      const groupKey = datastore.key(['Group', groupId]);
      const [groupEntity] = await datastore.get(groupKey);
      
      if (groupEntity) {
        const group = fromDatastore<Group>(groupEntity);
        return {
          ...group,
          id: groupId.toString(),
          memberRole: member.role,
          memberAlias: member.alias,
          joinedAt: member.joinedAt,
        };
      }
      return null;
    });

    const groups = (await Promise.all(groupPromises)).filter(Boolean);
    
    res.status(200).json(groups);
  } catch (error) {
    console.error(`Error fetching groups for user ${userId}:`, error);
    res.status(500).json({ message: 'Failed to fetch groups.' });
  }
}