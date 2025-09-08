import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { User } from '@/types';
// DUMMY_USERS is no longer used for creating new users here, only for initial fallback if Datastore is empty.
// import { DUMMY_USERS } from '@/lib/dummy-users'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { userId, displayName, zipCode, birthYear, city, state, metroArea, congressionalDistrict, politicalAlignment, partyPreference } = req.body; // Added new location fields and birthYear

  if (!userId || !displayName || zipCode === undefined || birthYear === undefined || city === undefined || state === undefined || politicalAlignment === undefined) { // Added birthYear to required
    return res.status(400).json({ message: 'Missing required onboarding fields (userId, displayName, zipCode, birthYear, city, state, politicalAlignment).' });
  }

  // Validate birth year format
  if (!/^\d{4}$/.test(birthYear) || (!birthYear.startsWith('19') && !birthYear.startsWith('20'))) {
    return res.status(400).json({ message: 'Birth year must be a 4-digit year starting with 19 or 20.' });
  }

  try {
    let user: User | null = null;
    // Try fetching by numeric ID first, then by string ID if numeric fails
    const numericUserId = parseInt(userId, 10);
    let userKey;

    if (!isNaN(numericUserId)) {
      userKey = datastore.key(['User', numericUserId]);
      const [fetchedUserByNumericId] = await datastore.get(userKey);
      if (fetchedUserByNumericId) {
        user = fromDatastore<User>(fetchedUserByNumericId);
      }
    }

    // If not found by numeric ID, try by string ID (though less common for auto-generated IDs)
    if (!user) {
      userKey = datastore.key(['User', userId]);
      const [fetchedUserByStringId] = await datastore.get(userKey);
      if (fetchedUserByStringId) {
        user = fromDatastore<User>(fetchedUserByStringId);
      }
    }

    if (!user) {
      // If user not found in Datastore, it means there's an issue in the auth flow.
      // This API should only update existing users.
      console.error(`User ${userId} not found in Datastore for onboarding. This indicates an auth flow issue.`);
      return res.status(404).json({ message: 'User not found for onboarding. Please try signing up again.' });
    }

    // Update user profile with onboarding data
    user.displayName = displayName;
    user.zipCode = zipCode;
    user.birthYear = birthYear; // Save birth year
    user.city = city; // Save new location data
    user.state = state; // Save new location data
    user.metroArea = metroArea || undefined; // Save new location data (optional)
    user.congressionalDistrict = congressionalDistrict || undefined; // Save new location data (optional)
    user.politicalAlignment = politicalAlignment;
    user.partyPreference = partyPreference || undefined; // Optional

    // Save updated user back to Datastore
    // Use the key that successfully fetched the user, or re-create it with numeric ID if possible
    const finalUserKey = !isNaN(numericUserId) ? datastore.key(['User', numericUserId]) : datastore.key(['User', userId]);
    await datastore.save({ key: finalUserKey, data: { ...user, id: undefined } });

    res.status(200).json({ message: 'User profile updated successfully.', user });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Failed to update user profile.', error: error.message });
  }
}