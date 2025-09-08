import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { User } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { postId, action, reason, moderatorId } = req.body;

  if (!postId || !action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Invalid request parameters' });
  }

  try {
    // Check if user has moderator badge or is admin
    const isAdmin = (session.user as any)?.role === 'admin';
    
    if (!isAdmin) {
      const userKey = datastore.key(['User', session.user.id]);
      const [userEntity] = await datastore.get(userKey);
      
      if (!userEntity) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = fromDatastore<User>(userEntity);
      const hasModeratorBadge = user.badges?.some(badge => badge.id === 'badge-community-moderator');

      if (!hasModeratorBadge) {
        return res.status(403).json({ message: 'Moderator badge or admin role required' });
      }
    }

    // Try to find the post in different collections
    let postEntity = null;
    let postType = '';
    let authorId = '';

    // Check comments first
    const commentKey = datastore.key(['Comment', postId]);
    const [commentEntity] = await datastore.get(commentKey);
    if (commentEntity) {
      postEntity = commentEntity;
      postType = 'comment';
      authorId = (fromDatastore(commentEntity) as any).authorId;
    }

    // Check topics if not found in comments
    if (!postEntity) {
      const topicKey = datastore.key(['Topic', postId]);
      const [topicEntity] = await datastore.get(topicKey);
      if (topicEntity) {
        postEntity = topicEntity;
        postType = 'topic';
        authorId = (fromDatastore(topicEntity) as any).suggesterId;
      }
    }

    if (!postEntity) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const post = fromDatastore(postEntity) as any;
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the post status
    const updatedPost = {
      ...post,
      status: newStatus,
      moderatedBy: moderatorId,
      moderatedAt: new Date().toISOString(),
      moderationReason: reason || undefined
    };

    // Remove the id from the data object before saving
    const { id, ...postData } = updatedPost;
    
    if (postType === 'comment') {
      const commentKey = datastore.key(['Comment', postId]);
      await datastore.save({ key: commentKey, data: postData });
    } else if (postType === 'topic') {
      const topicKey = datastore.key(['Topic', postId]);
      await datastore.save({ key: topicKey, data: postData });
    }

    // If approved, increment the author's approved community posts count
    if (action === 'approve' && authorId) {
      const authorKey = datastore.key(['User', authorId]);
      const [authorEntity] = await datastore.get(authorKey);
      
      if (authorEntity) {
        const author = fromDatastore<User>(authorEntity);
        const updatedAuthor = {
          ...author,
          approvedCommunityPosts: (author.approvedCommunityPosts || 0) + 1
        };

        // Remove the id from the data object before saving
        const { id: authorIdField, ...authorData } = updatedAuthor;
        await datastore.save({ key: authorKey, data: authorData });

        // Check if they should get the moderator badge (5 approved posts)
        if (updatedAuthor.approvedCommunityPosts >= 5) {
          // Award moderator badge if not already awarded
          const hasModeratorBadge = author.badges?.some(badge => badge.id === 'badge-community-moderator');
          if (!hasModeratorBadge) {
            const moderatorBadge = {
              id: 'badge-community-moderator',
              name: 'Community Moderator',
              description: 'Awarded for having 5 approved community posts, granting moderation privileges.',
              icon: 'Shield'
            };

            const updatedBadges = [...(author.badges || []), moderatorBadge];
            const authorWithBadge = {
              ...updatedAuthor,
              badges: updatedBadges
            };

            const { id: authorIdField2, ...authorDataWithBadge } = authorWithBadge;
            await datastore.save({ key: authorKey, data: authorDataWithBadge });
          }
        }
      }
    }

    res.status(200).json({ 
      message: `Post ${action}d successfully`,
      postId,
      action,
      newStatus
    });
  } catch (error: any) {
    console.error('Error moderating post:', error);
    res.status(500).json({ message: 'Failed to moderate post', error: error.message });
  }
}