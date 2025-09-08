import { authOptions } from './[...nextauth]';
import { NextApiRequest } from 'next';

describe('NextAuth Credentials Provider', () => {
  const credentialsProvider = authOptions.providers.find(
    (provider: any) => provider.id === 'credentials'
  ) as any;

  it('should authorize admin user with correct credentials', async () => {
    const user = await credentialsProvider.authorize(
      { email: 'admin@civic.com', password: '123' },
      {} as NextApiRequest
    );
    expect(user).toEqual(expect.objectContaining({
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@civic.com',
      isAdmin: true,
    }));
  });

  it('should authorize regular user with correct credentials', async () => {
    const user = await credentialsProvider.authorize(
      { email: 'user@civic.com', password: '123' },
      {} as NextApiRequest
    );
    expect(user).toEqual(expect.objectContaining({
      id: 'user-2',
      name: 'Test User',
      email: 'user@civic.com',
      isAdmin: false,
    }));
  });

  it('should not authorize with incorrect credentials', async () => {
    const user = await credentialsProvider.authorize(
      { email: 'wrong@civic.com', password: 'wrong' },
      {} as NextApiRequest
    );
    expect(user).toBeNull();
  });

  it('should not authorize with missing credentials', async () => {
    const user = await credentialsProvider.authorize(
      { email: 'admin@civic.com' }, // Missing password
      {} as NextApiRequest
    );
    expect(user).toBeNull();
  });
});