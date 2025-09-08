import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Group, GroupMember } from '@/types/common-ground';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'You must be logged in.' });
  }

  const { groupId } = req.query;
  if (typeof groupId !== 'string') {
    return res.status(400).json({ message: 'Invalid group ID.' });
  }

  if (req.method === 'GET') {
    try {
      // Convert the string ID from the URL to a number for the Datastore key.
      const numericGroupId = parseInt(groupId, 10);
      if (isNaN(numericGroupId)) {
        return res.status(400).json({ message: 'Group ID must be a valid number.' });
      }

      const groupKey = datastore.key(['Group', numericGroupId]);
      const [groupEntity] = await datastore.get(groupKey);

      if (!groupEntity) {
        console.error(`Group not found in Datastore for numeric ID: ${numericGroupId}`);
        return res.status(404).json({ message: 'Group not found.' });
      }

      const membersQuery = datastore.createQuery('GroupMember').hasAncestor(groupKey);
      const [memberEntities] = await datastore.runQuery(membersQuery);

      const group = fromDatastore<Group>(groupEntity);
      const members = memberEntities.map(e => fromDatastore<GroupMember>(e));

      // In a real app, you'd also check if the current user is a member before returning data.

      res.status(200).json({ ...group, members });
    } catch (error) {
      console.error(`Error fetching group ${groupId}:`, error);
      res.status(500).json({ message: 'Failed to fetch group data.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}