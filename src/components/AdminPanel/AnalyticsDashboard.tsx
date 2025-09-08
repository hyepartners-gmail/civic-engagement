import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'; // Keep shadcn Card for structure
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PlatformCard from '../PlatformCard'; // Import PlatformCard
import { colors } from '../../lib/theme'; // Import centralized colors

interface AnalyticsDashboardProps {
  isAdmin: boolean;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ isAdmin }) => {
  const [topicVotes, setTopicVotes] = useState([]);
  const [regionalVotes, setRegionalVotes] = useState([]);
  const [badgeStats, setBadgeStats] = useState([]);
  const [moderationSummary, setModerationSummary] = useState({ flaggedComments: [], flaggedSuggestions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Always set loading true when starting fetch
      setError(null); // Always clear error when starting fetch

      console.log('AnalyticsDashboard useEffect: isAdmin =', isAdmin); // Debugging log

      if (!isAdmin) {
        setLoading(false); // Set loading false if not admin
        setError("Admin privileges required to view analytics.");
        return;
      }

      try {
        const [topicRes, regionalRes, badgeRes, modRes] = await Promise.all([
          fetch('/api/analytics/topic-votes'),
          fetch('/api/analytics/regional-votes'),
          fetch('/api/analytics/badge-stats'),
          fetch('/api/analytics/moderation-summary'),
        ]);

        // Check if each response is OK before parsing JSON
        if (!topicRes.ok) throw new Error(`Failed to fetch topic votes: ${topicRes.statusText}`);
        if (!regionalRes.ok) throw new Error(`Failed to fetch regional votes: ${regionalRes.statusText}`);
        if (!badgeRes.ok) throw new Error(`Failed to fetch badge stats: ${badgeRes.statusText}`);
        if (!modRes.ok) throw new Error(`Failed to fetch moderation summary: ${modRes.statusText}`);

        setTopicVotes(await topicRes.json());
        setRegionalVotes(await regionalRes.json());
        setBadgeStats(await badgeRes.json());
        const moderationData = await modRes.json();
        setModerationSummary({
          flaggedComments: moderationData.flaggedComments || [],
          flaggedSuggestions: moderationData.flaggedSuggestions || [],
        });
      } catch (err: any) {
        console.error("Failed to fetch analytics data", err);
        setError(err.message || "Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin]); // Re-run effect when isAdmin changes

  if (loading) {
    return <div className="text-center p-8 font-normal">Loading analytics...</div>;
  }

  if (error) {
    return <div className="text-center p-8 font-normal text-red-400">{error}</div>;
  }

  const COLORS = [colors.platform.accent, colors.platform.contrast, colors.platform.cyan, colors.platform.fuchsia];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 font-sans"> {/* Increased gap */}
      <PlatformCard variant="background" className="p-6"> {/* Increased padding */}
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-platform-text font-thin text-lg sm:text-xl">Topic Upvotes</CardTitle> {/* Changed to text-platform-text */}
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topicVotes}>
              <XAxis dataKey="name" stroke={colors.platform.text} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke={colors.platform.text} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip wrapperClassName="!bg-platform-contrast !border-platform-accent !text-platform-text !font-normal !text-xs" />
              <Legend wrapperStyle={{ color: colors.platform.text, fontSize: '12px' }} />
              <Bar dataKey="upvotes" fill={colors.platform.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </PlatformCard>
      <PlatformCard variant="background" className="p-6"> {/* Increased padding */}
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-platform-text font-thin text-lg sm:text-xl">Regional Topic Splits</CardTitle> {/* Changed to text-platform-text */}
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={regionalVotes} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill={colors.platform.accent} label />
              <Tooltip wrapperClassName="!bg-platform-contrast !border-platform-accent !text-platform-text !font-normal !text-xs" />
              <Legend wrapperStyle={{ color: colors.platform.text, fontSize: '12px' }} />
              {regionalVotes.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </PlatformCard>
      <PlatformCard variant="background" className="p-6"> {/* Increased padding */}
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-platform-text font-thin text-lg sm:text-xl">Badge Statistics</CardTitle> {/* Changed to text-platform-text */}
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={badgeStats} layout="vertical">
              <XAxis type="number" stroke={colors.platform.text} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke={colors.platform.text} fontSize={10} tickLine={false} axisLine={false} width={80} />
              <Tooltip wrapperClassName="!bg-platform-contrast !border-platform-accent !text-platform-text !font-normal !text-xs" />
              <Legend wrapperStyle={{ color: colors.platform.text, fontSize: '12px' }} />
              <Bar dataKey="count" fill={colors.platform.accent} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </PlatformCard>
      <PlatformCard variant="background" className="p-6"> {/* Increased padding */}
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-platform-text font-thin text-lg sm:text-xl">Moderation Queue</CardTitle> {/* Changed to text-platform-text */}
        </CardHeader>
        <CardContent className="p-0">
          <h4 className="font-semibold mb-2 text-platform-text/80 text-sm sm:text-base">Most Flagged Comments</h4>
          <ul className="space-y-2 text-sm">
            {moderationSummary.flaggedComments.slice(0, 5).map((comment: any) => (
              <li key={comment.id} className="truncate p-2 bg-platform-contrast rounded-md font-normal">
                <span className="font-bold text-red-400">({comment.flags})</span> "{comment.text}"
              </li>
            ))}
          </ul>
        </CardContent>
      </PlatformCard>
    </div>
  );
};

export default AnalyticsDashboard;