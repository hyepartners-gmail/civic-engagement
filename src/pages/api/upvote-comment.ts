import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { DUMMY_COMMENTS } from '@/lib/dummy-data'; // For fallback
import { DUMMY_USERS } from '@/lib/dummy-users'; // For fallback
import { checkAndAwardBadges, saveUserToDatastore } from '@/lib/badgeService';
import { Comment, User } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
  }

  const userId = session.user.id; // Get userId from session
  const { commentId } = req.body; // userId is now derived from session

  if (!commentId) {
    return res.status(400).json({ message: 'Missing commentId.' });
  }

  let comment: Comment | undefined;
  let user: User | undefined;

  try {
    // Fetch comment from Datastore
    const commentKey = datastore.key(['Comment', commentId]);
    const [fetchedComment] = await datastore.get(commentKey);
    if (fetchedComment) {
      comment = fromDatastore<Comment>(fetchedComment);
    } else {
      // Fallback to dummy comment if not found
      comment = DUMMY_COMMENTS.find(c => c.id === commentId);
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found.' });
      }
      // If found in dummy, save to Datastore for future use
      await datastore.save({ key: commentKey, data: { ...comment, id: undefined } });
    }

    // Fetch user (comment author) from Datastore
    const userKey = datastore.key(['User', comment.author.id]);
    const [fetchedUser] = await datastore.get(userKey);
    if (fetchedUser) {
      user = fromDatastore<User>(fetchedUser);
    } else {
      // Fallback to dummy user if not found
      user = DUMMY_USERS.find(u => u.id === comment!.author.id);
      if (!user) {
        console.warn(`Author user ${comment!.author.id} not found for comment upvote.`);
        // Proceed without updating user if author not found
      }
      // If found in dummy, save to Datastore for future use
      if (user) await saveUserToDatastore(user);
    }

    // Increment comment upvote count
    comment.upvotes = (comment.upvotes || 0) + 1;

    // Increment author's totalUpvotes
    if (user) {
      user.totalUpvotes = (user.totalUpvotes || 0) + 1;
    }

    // Save updated comment back to Datastore
    await datastore.save({ key: commentKey, data: { ...comment, id: undefined } });

    // Save updated user (author) back to Datastore and check for badges
    if (user) {
      const updatedUser = checkAndAwardBadges(user);
      await saveUserToDatastore(updatedUser);
    }

    console.log(`Comment ${commentId} upvoted by user ${userId}. New count: ${comment.upvotes}`);
    if (user) console.log(`Author ${user.displayName} totalUpvotes: ${user.totalUpvotes}`);

    res.status(200).json({ message: 'Comment upvoted successfully.', newUpvotes: comment.upvotes });

  } catch (error: any) {
    console.error('Error upvoting comment:', error);
    // Fallback to dummy data updates on error
    const dummyComment = DUMMY_COMMENTS.find(c => c.id === commentId);
    if (dummyComment) {
      dummyComment.upvotes = (dummyComment.upvotes || 0) + 1;
    }
    const dummyUser = DUMMY_USERS.find(u => u.id === comment?.author.id);
    if (dummyUser) {
      dummyUser.totalUpvotes = (dummyUser.totalUpvotes || 0) + 1;
      checkAndAwardBadges(dummyUser); // Check badges on dummy user
    }
    res.status(500).json({ message: 'Failed to upvote comment.', error: error.message });
  }
}