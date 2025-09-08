import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { datastore, fromDatastore } from '@/lib/datastoreServer'; // Import Datastore client
import { User } from '@/types'; // Import User type
import { DUMMY_USERS } from '@/lib/dummy-users'; // Import DUMMY_USERS for dummy password check
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET, // Use NEXTAUTH_SECRET for security
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const { email, password } = credentials as any;

        console.log('Authorize callback invoked for email:', email);

        if (!email || !password) {
          console.log('Authorize: Missing credentials.');
          return null; // Missing credentials
        }

        try {
          // 1. Try to find user in Datastore by email
          const query = datastore.createQuery('User').filter('email', '=', email).limit(1);
          const [entities] = await datastore.runQuery(query);
          let user: User | null = null;

          if (entities.length > 0) {
            user = fromDatastore<User>(entities[0]);
            console.log('Authorize: Existing user from Datastore:', user);
            // Simulate password check for existing users
            // In a real app, you would compare hashed passwords.
            // For this demo, we'll use a simple check for known dummy users.
            const dummyUser = DUMMY_USERS.find(u => u.email === email);
            if (dummyUser && password === '123') { // Assuming '123' is the dummy password
                console.log('Authorize: Existing dummy user found and password matched:', email);
            } else if (dummyUser && password !== '123') {
                console.log('Authorize: Existing dummy user found but password mismatched:', email);
                return null; // Password mismatch
            } else {
                // For users not in DUMMY_USERS but found in Datastore,
                // we'll assume password is correct for simplicity of this demo.
                console.log('Authorize: Existing Datastore user found (password assumed correct):', email);
            }
          } else {
            // If user not found, it's a new sign-up attempt
            const newUserKey = datastore.key('User');
            const newUserData: Omit<User, 'id'> = {
              email: email,
              displayName: email.split('@')[0], // Default display name
              isVerified: false, // New users require email verification
              votesCast: 0,
              totalComments: 0,
              totalSolutionVotes: 0,
              approvedSuggestions: 0,
              totalUpvotes: 0,
              badges: [],
              badgeProgress: [],
              votedSolutions: [],
              isMuted: false,
              lastActivityDate: new Date().toISOString(),
              currentStreak: 0,
              role: 'user', // Default role for new users
              zipCode: undefined, // Explicitly undefined for incomplete profile
              city: undefined, // New: Explicitly undefined
              state: undefined, // New: Explicitly undefined
              metroArea: undefined, // New: Explicitly undefined
              congressionalDistrict: undefined, // New: Explicitly undefined
              politicalAlignment: undefined, // Explicitly undefined for incomplete profile
              partyPreference: undefined, // Explicitly undefined for incomplete profile
            };
            await datastore.save({ key: newUserKey, data: newUserData });
            console.log('Authorize: New user saved. Generated ID:', newUserKey.id);
            user = { ...newUserData, id: String(newUserKey.id!) }; // Assign the Datastore-generated ID and ensure string
            console.log('Authorize: New user object after ID assignment:', user);
            console.log('Authorize: User ID being returned:', user.id);
            console.log('Authorize: typeof user.id:', typeof user.id);

            // Send verification email
            await fetch(`${process.env.NEXTAUTH_URL}/api/send-verification-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, userId: user.id }),
            });
            console.log(`Authorize: Simulated verification email sent to ${user.email}.`);
          }

          // Ensure admin user always has 'admin' role and persist it
          if (user && user.email === 'admin@civic.com') {
            if (user.role !== 'admin') { // Only update if not already admin
              user.role = 'admin';
              const userKey = datastore.key([
                                'User',
                                user.id!
                              ]);
              await datastore.save({ key: userKey, data: { ...user, id: undefined } });
              console.log(`Authorize: User ${user.email} role updated to admin in Datastore.`);
            }
          }

          // Critical check: user and user.id must be defined before returning
          if (!user || !user.id) {
            console.error('Authorize: User object or ID is undefined after creation/fetch. Returning null.');
            return null;
          }
          console.log('Authorize: User object being returned:', user);
          console.log('Authorize: User ID being returned:', user.id);
          // Return the user object for NextAuth session
          console.log('Authorize: Returning user object for session creation with ID:', user.id);
          return {
            id: String(user.id), // Ensure ID is string here
            name: user.displayName,
            email: user.email,
            role: user.role || 'user',
            isVerified: !!user.isVerified,
            zipCode: user.zipCode || undefined,
            city: user.city || undefined,
            state: user.state || undefined,
            metroArea: user.metroArea || undefined,
            congressionalDistrict: user.congressionalDistrict || undefined,
            politicalAlignment: user.politicalAlignment || undefined,
            partyPreference: user.partyPreference || undefined,
          };

        } catch (error) {
          console.error('Authorize: Error during authentication:', error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/auth',
    signOut: '/',
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }: any) {
      console.log('signIn callback: --- START ---');
      console.log('signIn callback: Incoming user:', user);
      console.log('signIn callback: Incoming account type:', account?.type);

      // If it's a Google sign-in, and the user doesn't exist in our DB, create them.
      if (account?.type === 'oauth' && account.provider === 'google') {
        try {
          const query = datastore.createQuery('User').filter('email', '=', user.email!).limit(1);
          const [entities] = await datastore.runQuery(query);
          let existingUser = entities.length > 0 ? fromDatastore<User>(entities[0]) : null;

          if (!existingUser) {
            const newUserKey = datastore.key('User');
            const newUserData: Omit<User, 'id'> = {
              email: user.email!,
              displayName: user.name || user.email!.split('@')[0],
              isVerified: true, // Google users are pre-verified since Google handles email verification
              votesCast: 0,
              totalComments: 0,
              totalSolutionVotes: 0,
              approvedSuggestions: 0,
              totalUpvotes: 0,
              badges: [],
              badgeProgress: [],
              votedSolutions: [],
              isMuted: false,
              lastActivityDate: new Date().toISOString(),
              currentStreak: 0,
              role: 'user',
              zipCode: undefined,
              city: undefined,
              state: undefined,
              metroArea: undefined,
              congressionalDistrict: undefined,
              politicalAlignment: undefined,
              partyPreference: undefined,
            };
            await datastore.save({ key: newUserKey, data: newUserData });
            console.log('signIn callback: newUserKey.id:', newUserKey.id);
            console.log('signIn callback: typeof newUserKey.id:', typeof newUserKey.id);
            user.id = String(newUserKey.id!); // Update the user object passed to jwt callback and ensure string
            console.log('signIn callback: New Google user created in Datastore:', user.email, 'ID:', user.id);
            console.log('signIn callback: user.id after assignment:', user.id);
            console.log('signIn callback: typeof user.id after assignment:', typeof user.id);

            // Google users don't need verification email since they're pre-verified
            console.log(`signIn callback: Google user ${user.email} created and pre-verified.`);
          } else {
            // If Google user already exists, update the 'user' object with existing data
            console.log('signIn callback: existingUser.id:', existingUser.id);
            console.log('signIn callback: typeof existingUser.id:', typeof existingUser.id);
            user.id = String(existingUser.id); // Ensure string
            user.name = existingUser.displayName;
            user.email = existingUser.email;
            (user as any).role = existingUser.role;
            (user as any).isVerified = existingUser.isVerified;
            (user as any).zipCode = existingUser.zipCode;
            (user as any).city = existingUser.city;
            (user as any).state = existingUser.state;
            (user as any).metroArea = existingUser.metroArea;
            (user as any).congressionalDistrict = existingUser.congressionalDistrict;
            (user as any).politicalAlignment = existingUser.politicalAlignment;
            (user as any).partyPreference = existingUser.partyPreference;
            console.log('signIn callback: Existing Google user found and updated:', user.email, 'ID:', user.id);
            console.log('signIn callback: user.id after assignment:', user.id);
            console.log('signIn callback: typeof user.id after assignment:', typeof user.id);
          }
        } catch (error) {
          console.error('signIn callback: Error processing Google user:', error);
          return false; // Prevent sign-in on error
        }
      }
      console.log('signIn callback: --- END --- Returning true.');
      return true;
    },
    async jwt({ token, user }: { token: JWT; user?: any }) {
      console.log('JWT Callback: --- START ---');
      console.log('JWT Callback: Incoming user object (from signIn):', user);
      console.log('JWT Callback: Incoming token object (current state):', token);

      let userIdToFetch: string | undefined = undefined;

      // Determine the user ID to fetch from the database
      if (user) { // This block runs only on initial sign-in
        console.log('JWT Callback: user.id (raw):', user.id);
        console.log('JWT Callback: typeof user.id:', typeof user.id);
        if (user.id && user.id !== 'undefined') {
          userIdToFetch = String(user.id); // Use ID from the user object provided by signIn
          console.log('JWT Callback: Initial sign-in, using user.id:', userIdToFetch);
        } else {
          console.error('JWT Callback: user.id is undefined or invalid:', user.id);
          return {}; // Return empty object to invalidate token
        }
      } else if (token.id) { // This block runs on subsequent requests (token refresh)
        userIdToFetch = String(token.id); // Use ID from the existing token
        console.log('JWT Callback: Token refresh, using token.id:', userIdToFetch);
      } else {
        console.warn('JWT Callback: No user ID found in user object or token. Cannot fetch latest user data.');
        return {}; // Return empty object to invalidate token if no ID is available
      }

      // Always fetch the latest user data from the database using the determined ID
      if (userIdToFetch) {
        try {
          // Try both string and numeric ID formats for Datastore compatibility
          const userKeyString = datastore.key(['User', userIdToFetch]);
          const userKeyNumeric = datastore.key(['User', parseInt(userIdToFetch, 10)]);
          
          // For initial sign-in, try multiple times due to eventual consistency
          let latestUserEntity = null;
          let attempts = 0;
          const maxAttempts = user ? 3 : 1; // More attempts for initial sign-in
          
          while (!latestUserEntity && attempts < maxAttempts) {
            attempts++;
            console.log(`JWT Callback: Attempt ${attempts} to fetch user ${userIdToFetch}`);
            
            // Try string key first
            let [fetchedEntity] = await datastore.get(userKeyString);
            if (fetchedEntity) {
              console.log('JWT Callback: Found user with string key');
              latestUserEntity = fetchedEntity;
              break;
            }
            
            // Try numeric key if string key failed
            [fetchedEntity] = await datastore.get(userKeyNumeric);
            if (fetchedEntity) {
              console.log('JWT Callback: Found user with numeric key');
              latestUserEntity = fetchedEntity;
              break;
            }
            
            // If this is initial sign-in and user not found, wait a bit and retry
            if (user && attempts < maxAttempts) {
              console.log('JWT Callback: User not found with either key type, waiting 100ms before retry...');
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          if (latestUserEntity) {
            const latestUser = fromDatastore<User>(latestUserEntity);
            console.log('JWT Callback: latestUser from Datastore:', latestUser);
            console.log('JWT Callback: latestUser.isVerified (raw):', latestUser.isVerified);
            console.log('JWT Callback: !!latestUser.isVerified (boolean):', !!latestUser.isVerified);

            // Populate token with ALL relevant fields from the database user
            token.id = String(latestUser.id); // Ensure ID is always set from DB
            token.sub = String(latestUser.id); // Also set sub as backup
            token.name = latestUser.displayName;
            token.email = latestUser.email;
            token.role = latestUser.role || 'user';
            token.isVerified = !!latestUser.isVerified;
            token.zipCode = latestUser.zipCode || undefined;
            token.city = latestUser.city || undefined;
            token.state = latestUser.state || undefined;
            token.metroArea = latestUser.metroArea || undefined;
            token.congressionalDistrict = latestUser.congressionalDistrict || undefined;
            token.politicalAlignment = latestUser.politicalAlignment || undefined;
            token.partyPreference = latestUser.partyPreference || undefined;
            console.log('JWT Callback: Token updated with latest Datastore data:', token);
          } else {
            console.warn(`JWT Callback: User with ID ${userIdToFetch} not found in Datastore after ${attempts} attempts.`);
            
            // If this is initial sign-in and we have user data, use it as fallback
            if (user && user.id === userIdToFetch) {
              console.log('JWT Callback: Using fallback user data from signIn callback');
              token.id = String(user.id);
              token.sub = String(user.id);
              token.name = user.name;
              token.email = user.email;
              token.role = (user as any).role || 'user';
              token.isVerified = !!(user as any).isVerified;
              token.zipCode = (user as any).zipCode;
              token.city = (user as any).city;
              token.state = (user as any).state;
              token.metroArea = (user as any).metroArea;
              token.congressionalDistrict = (user as any).congressionalDistrict;
              token.politicalAlignment = (user as any).politicalAlignment;
              token.partyPreference = (user as any).partyPreference;
              console.log('JWT Callback: Token populated with fallback data:', token);
            } else if (token.id && token.email) {
              // If we have existing token data but can't fetch from DB, preserve what we have
              console.log('JWT Callback: Preserving existing token data since DB fetch failed');
              // Token already has the data, just ensure it's preserved
            } else {
              console.error('JWT Callback: No fallback data available, invalidating token.');
              // As a last resort, if we have userIdToFetch, use it
              if (userIdToFetch) {
                console.log('JWT Callback: Last resort - setting token.id to userIdToFetch:', userIdToFetch);
                token.id = userIdToFetch;
                token.sub = userIdToFetch;
              } else {
                return {}; // Return an empty object to invalidate the token
              }
            }
          }
        } catch (error) {
          console.error(`JWT Callback: Error fetching user ${userIdToFetch} from Datastore:`, error);
          return {}; // Invalidate token on error
        }
      }
      console.log('JWT Callback: --- END --- Returning token:', token);
      console.log('JWT Callback: Final token.id:', token.id);
      console.log('JWT Callback: Final token.sub:', token.sub);
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      console.log('Session Callback: --- START ---');
      console.log('Session Callback: Incoming token:', token);
      console.log('Session Callback: token.id:', token.id);
      console.log('Session Callback: token.sub:', token.sub);
      console.log('Session Callback: token.email:', token.email);
      
      if (session.user) {
        // Try multiple sources for the user ID
        let userId = token.id || token.sub;
        
        // If we still don't have an ID, try to find the user by email
        if (!userId && token.email) {
          console.log('Session Callback: No ID in token, trying to find user by email...');
          try {
            const query = datastore.createQuery('User').filter('email', '=', token.email as string).limit(1);
            const [entities] = await datastore.runQuery(query);
            if (entities.length > 0) {
              const user = fromDatastore<User>(entities[0]);
              userId = String(user.id);
              console.log('Session Callback: Found user by email, ID:', userId);
            }
          } catch (error) {
            console.error('Session Callback: Error finding user by email:', error);
          }
        }
        
        console.log('Session Callback: Final userId:', userId);
        
        // Ensure session.user properties are populated from the token
        if (!userId) {
          console.error('Session Callback: No userId found after all attempts. Throwing error to invalidate session.');
          throw new Error('No user ID found - session invalid');
        }
        
        session.user.id = userId as string; // Use the resolved ID
        session.user.name = token.name; // Explicitly set name
        session.user.email = token.email; // Explicitly set email

        (session.user as any).role = token.role;
        (session.user as any).isVerified = !!token.isVerified;
        (session.user as any).zipCode = token.zipCode;
        (session.user as any).city = token.city;
        (session.user as any).state = token.state;
        (session.user as any).metroArea = token.metroArea;
        (session.user as any).congressionalDistrict = token.congressionalDistrict;
        (session.user as any).politicalAlignment = token.politicalAlignment;
        (session.user as any).partyPreference = token.partyPreference;
      }
      console.log('Session Callback: session.user.id after assignment:', session.user?.id);
      console.log('Session Callback: --- END --- Returning session:', session);
      return session;
    },
  },
};

export default NextAuth(authOptions);