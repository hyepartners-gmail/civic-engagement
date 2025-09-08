import { checkAndAwardBadges, saveUserToDatastore } from '@/lib/badgeService';
import { User, Badge, BadgeProgress } from '@/types';
import { BADGE_DEFINITIONS } from '@/lib/badgeDefinitions';
import { datastore } from '@/lib/datastoreServer';

// Mock the datastore module
jest.mock('@/lib/datastoreServer');

describe('badgeService', () => {
  let initialUser: User;

  beforeEach(() => {
    jest.clearAllMocks();
    initialUser = {
      id: 'test-user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      isVerified: true,
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
    };
  });

  describe('checkAndAwardBadges', () => {
    it('awards "First Commenter" badge when totalComments reaches 1', () => {
      const userWithComment = { ...initialUser, totalComments: 1 };
      const updatedUser = checkAndAwardBadges(userWithComment);

      expect(updatedUser.badges).toHaveLength(1);
      expect(updatedUser.badges?.[0].id).toBe('badge-first-commenter');
      expect(updatedUser.badgeProgress?.some(p => p.badgeId === 'badge-first-commenter')).toBe(false);
    });

    it('updates badge progress without awarding if threshold not met', () => {
      const userWithSomeComments = { ...initialUser, totalComments: 0 };
      const updatedUser = checkAndAwardBadges(userWithSomeComments);

      const userWithOneComment = { ...initialUser, totalComments: 0 };
      userWithOneComment.totalComments = 0;
      const updatedUserProgress = checkAndAwardBadges(userWithOneComment);

      const firstCommenterProgress = updatedUserProgress.badgeProgress?.find(p => p.badgeId === 'badge-first-commenter');
      expect(firstCommenterProgress).toBeDefined();
      expect(firstCommenterProgress?.currentCount).toBe(0);
      expect(firstCommenterProgress?.threshold).toBe(1);
      expect(updatedUserProgress.badges).toHaveLength(0);
    });

    it('awards "Voter Enthusiast" badge when total votes (topics + solutions) reaches 5', () => {
      const userWithVotes = { ...initialUser, votesCast: 3, totalSolutionVotes: 2 };
      const updatedUser = checkAndAwardBadges(userWithVotes);

      expect(updatedUser.badges).toHaveLength(1);
      expect(updatedUser.badges?.[0].id).toBe('badge-voter-enthusiast');
    });

    it('awards "Daily Streaker" badge when currentStreak reaches 7', () => {
      const userWithStreak = { ...initialUser, currentStreak: 7 };
      const updatedUser = checkAndAwardBadges(userWithStreak);

      expect(updatedUser.badges).toHaveLength(1);
      expect(updatedUser.badges?.[0].id).toBe('badge-daily-streaker');
    });

    it('does not re-award already earned badges', () => {
      const earnedBadge: Badge = { id: 'badge-first-commenter', name: 'First Commenter', description: '...' };
      const userWithEarnedBadge = { ...initialUser, totalComments: 10, badges: [earnedBadge] };
      const updatedUser = checkAndAwardBadges(userWithEarnedBadge);

      expect(updatedUser.badges).toHaveLength(1);
      expect(updatedUser.badges?.[0].id).toBe('badge-first-commenter');
    });

    it('handles multiple badge awards simultaneously', () => {
      const userMultiAward = {
        ...initialUser,
        totalComments: 1,
        votesCast: 3,
        totalSolutionVotes: 2,
        currentStreak: 7,
      };
      const updatedUser = checkAndAwardBadges(userMultiAward);

      expect(updatedUser.badges).toHaveLength(3);
      expect(updatedUser.badges?.some(b => b.id === 'badge-first-commenter')).toBe(true);
      expect(updatedUser.badges?.some(b => b.id === 'badge-voter-enthusiast')).toBe(true);
      expect(updatedUser.badges?.some(b => b.id === 'badge-daily-streaker')).toBe(true);
    });
  });

  describe('saveUserToDatastore', () => {
    it('calls datastore.save with the correct key and data for a new user', async () => {
      const newUser = { ...initialUser, id: '' };
      const generatedId = 'new-generated-id';
      (datastore.key as jest.Mock).mockReturnValue({ id: generatedId });
      
      await saveUserToDatastore(newUser);

      expect(datastore.key).toHaveBeenCalledWith('User');
      expect(datastore.save).toHaveBeenCalledWith({
        key: { id: generatedId },
        data: expect.objectContaining({ ...newUser, id: undefined }),
      });
      expect(newUser.id).toBe(generatedId);
    });

    it('calls datastore.save with the correct key and data for an existing user', async () => {
      const existingUser = { ...initialUser, id: 'existing-user-id' };
      (datastore.key as jest.Mock).mockReturnValue({ id: existingUser.id });

      await saveUserToDatastore(existingUser);

      expect(datastore.key).toHaveBeenCalledWith(['User', existingUser.id]);
      expect(datastore.save).toHaveBeenCalledWith({
        key: { id: existingUser.id },
        data: expect.objectContaining({ ...existingUser, id: undefined }),
      });
    });

    it('throws an error if datastore.save fails', async () => {
      const existingUser = { ...initialUser, id: 'existing-user-id' };
      (datastore.save as jest.Mock).mockRejectedValueOnce(new Error('Datastore save failed'));

      await expect(saveUserToDatastore(existingUser)).rejects.toThrow('Datastore save failed');
      expect(datastore.save).toHaveBeenCalledTimes(1);
    });
  });
});