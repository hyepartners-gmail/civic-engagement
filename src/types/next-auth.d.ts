import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    zipCode?: string;
    city?: string;
    state?: string;
    metroArea?: string;
    congressionalDistrict?: string;
    politicalAlignment?: string;
    partyPreference?: string;
    isVerified?: boolean;
  }

  interface Session {
    user: User;
  }
}
