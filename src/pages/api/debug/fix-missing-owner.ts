import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore } from '@/lib/datastoreServer';
import { GroupMember } from '@/types/common-ground';
import { nowIso } from '@/lib/common-ground/time';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Add the missing owner as a GroupMember
    const groupId = 5742678146809856; // Existing group
    const ownerId = '5697279470075904'; // Group owner who is missing as member
    
    const memberKey = datastore.key(['Group', groupId, 'GroupMember', ownerId]);

    const memberData: Omit<GroupMember, 'id'> = {
      role: 'owner',
      alias: 'Group Owner',
      joinedAt: nowIso(),
    };
    
    await datastore.save({ key: memberKey, data: memberData });
    
    console.log(`Added missing owner ${ownerId} to group ${groupId}`);
    
    res.status(200).json({ 
      message: 'Successfully added missing group owner as member',
      groupId,
      ownerId
    });
  } catch (error) {
    console.error('Error fixing missing owner:', error);
    res.status(500).json({ message: 'Failed to fix missing owner.' });
  }
}