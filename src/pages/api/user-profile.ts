import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { User } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Handle lookup by email (for Google auth users without ID)
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required for user lookup.' });
    }

    try {
      const query = datastore.createQuery('User').filter('email', '=', email).limit(1);
      const [entities] = await datastore.runQuery(query);
      
      if (entities.length > 0) {
        const user = fromDatastore<User>(entities[0]);
        const publicUser: Partial<User> = {
          id: user.id,
          displayName: user.displayName,
          isVerified: user.isVerified,
          votesCast: user.votesCast,
          totalComments: user.totalComments,
          totalSolutionVotes: user.totalSolutionVotes,
          approvedSuggestions: user.approvedSuggestions,
          totalUpvotes: user.totalUpvotes,
          badges: user.badges,
          isMuted: user.isMuted,
          zipCode: user.zipCode,
          city: user.city,
          state: user.state,
          metroArea: user.metroArea,
          congressionalDistrict: user.congressionalDistrict,
          politicalAlignment: user.politicalAlignment,
          partyPreference: user.partyPreference,
          role: user.role,
        };
        return res.status(200).json(publicUser);
      } else {
        return res.status(404).json({ message: 'User not found by email.' });
      }
    } catch (error: any) {
      console.error('Error fetching user by email:', error);
      return res.status(500).json({ message: 'Failed to fetch user by email.', error: error.message });
    }
  } else if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user || !session.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }

    const userId = session.user.id; // Get userId from session

    try {
      let fetchedUser = null;
      let userKey;

      // Try fetching by string ID first
      userKey = datastore.key(['User', userId as string]);
      [fetchedUser] = await datastore.get(userKey);
      
      // If not found with string ID, try by numeric ID
      if (!fetchedUser && !isNaN(Number(userId))) {
        userKey = datastore.key(['User', parseInt(userId as string, 10)]);
        [fetchedUser] = await datastore.get(userKey);
      }

      if (fetchedUser) {
        const user = fromDatastore<User>(fetchedUser);
        const publicUser: Partial<User> = {
          id: user.id,
          displayName: user.displayName,
          isVerified: user.isVerified,
          votesCast: user.votesCast,
          totalComments: user.totalComments,
          totalSolutionVotes: user.totalSolutionVotes,
          approvedSuggestions: user.approvedSuggestions,
          totalUpvotes: user.totalUpvotes,
          badges: user.badges,
          isMuted: user.isMuted,
          zipCode: user.zipCode,
          city: user.city,
          state: user.state,
          metroArea: user.metroArea,
          congressionalDistrict: user.congressionalDistrict,
          politicalAlignment: user.politicalAlignment,
          partyPreference: user.partyPreference,
          role: user.role,
        };
        res.status(200).json(publicUser);
      } else {
        res.status(404).json({ message: 'User not found.' });
      }
    } catch (error: any) {
      console.error('user-profile API: Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}