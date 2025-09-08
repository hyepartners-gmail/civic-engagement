import { Topic, Comment } from '../types';

export const DUMMY_TOPICS: Topic[] = [
  {
    id: "topic-1",
    title: "Federal Personal Income Tax Rate",
    preview: "What should the federal income tax rates be for high earners?",
    region: "national",
    problemStatement: "The current federal personal income tax structure is often debated. What income limits should define higher tax brackets, and what should those rates be? For example, should those earning over $400k/year face higher taxes? What about rates like 30% for incomes over $250k, and 40% for incomes over $500k?",
    status: "approved",
    upvotes: 0,
    solutions: [
      { id: "sol-1-1", title: "Progressive Tax Increase", description: "Increase top marginal tax rates for incomes above $250k to 35% and above $500k to 45%.", status: "approved", votes: 0 },
      { id: "sol-1-2", title: "Flat Tax System", description: "Implement a flat tax rate of 20% for all income levels, simplifying the tax code.", status: "approved", votes: 0 },
    ],
  },
  {
    id: "topic-2",
    title: "Corporate Tax Rate",
    preview: "What is the ideal corporate tax rate for the U.S. economy?",
    region: "national",
    problemStatement: "The corporate tax rate has significant impacts on the economy, corporate behavior, and government revenue. What corporate tax rate do you propose, and what is the reasoning behind your proposal?",
    status: "approved",
    upvotes: 0,
    solutions: [
      { id: "sol-2-1", title: "Lower to 15% for Competitiveness", description: "Reduce corporate tax to 15% to attract businesses and stimulate economic growth.", status: "approved", votes: 0 },
      { id: "sol-2-2", title: "Increase to 28% for Public Services", description: "Raise corporate tax to 28% to fund infrastructure and social programs.", status: "approved", votes: 0 },
    ],
  },
];

export const DUMMY_COMMENTS: Comment[] = [
  { id: 'c1', text: 'This is a great discussion. I think we need to consider the impact on small businesses.', author: { id: 'user-1', displayName: 'CivicChampion', badges: [] }, timestamp: '2023-10-26T10:00:00Z', parentId: null, flags: 0, status: 'approved', upvotes: 0 },
  { id: 'c2', text: 'I disagree. The current system is fine as it is.', author: { id: 'user-2', displayName: 'SafetyFirstMom', badges: [] }, timestamp: '2023-10-26T10:05:00Z', parentId: 'c1', flags: 1, status: 'approved', upvotes: 0 },
  { id: 'c3', text: 'This comment is pending moderation.', author: { id: 'user-3', displayName: 'ParkWatcher', badges: [] }, timestamp: '2023-10-26T10:10:00Z', parentId: null, flags: 0, status: 'pending', upvotes: 0 },
];