import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic, Comment } from '@/types';

interface RecentDiscussion {
  id: string;
  title: string;
  preview: string;
  region: string;
  lastActivity: string;
  commentCount: number;
  upvotes: number;
  lastComment?: {
    author: string;
    timestamp: string;
    preview: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Fetch all approved topics
    const topicQuery = datastore.createQuery('Topic').filter('status', '=', 'approved');
    const [topicEntities] = await datastore.runQuery(topicQuery);
    const topics: Topic[] = topicEntities.map(entity => fromDatastore<Topic>(entity));

    // Fetch all approved comments
    const commentQuery = datastore.createQuery('Comment').filter('status', '=', 'approved');
    const [commentEntities] = await datastore.runQuery(commentQuery);
    const comments: Comment[] = commentEntities.map(entity => fromDatastore<Comment>(entity));

    // Create a map of topic ID to comments
    const topicComments = new Map<string, Comment[]>();
    comments.forEach(comment => {
      const topicId = comment.topicId || comment.parentId;
      if (topicId) {
        if (!topicComments.has(topicId)) {
          topicComments.set(topicId, []);
        }
        topicComments.get(topicId)!.push(comment);
      }
    });

    // Create recent discussions with activity data
    const recentDiscussions: RecentDiscussion[] = topics.map(topic => {
      const topicCommentsArray = topicComments.get(topic.id) || [];
      const sortedComments = topicCommentsArray.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const lastComment = sortedComments[0];
      const topicCreationTime = topic.createdAt || new Date().toISOString();
      const lastCommentTime = lastComment?.timestamp;
      const lastActivity = lastCommentTime && new Date(lastCommentTime) > new Date(topicCreationTime) 
        ? lastCommentTime 
        : topicCreationTime;

      return {
        id: topic.id,
        title: topic.title,
        preview: topic.preview,
        region: topic.region,
        lastActivity,
        commentCount: topicCommentsArray.length,
        upvotes: topic.upvotes || 0,
        lastComment: lastComment ? {
          author: lastComment.author?.displayName || 'Anonymous',
          timestamp: lastComment.timestamp,
          preview: lastComment.text.length > 100 
            ? lastComment.text.substring(0, 100) + '...' 
            : lastComment.text
        } : undefined
      };
    });

    const topRecentDiscussions = recentDiscussions
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, 3);

    res.status(200).json(topRecentDiscussions);
  } catch (error: any) {
    console.error('Error fetching recent discussions:', error);
    res.status(500).json({ message: 'Failed to fetch recent discussions', error: error.message });
  }
}