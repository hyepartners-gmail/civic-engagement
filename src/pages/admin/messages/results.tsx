import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Download, 
  Filter, 
  RefreshCw, 
  BarChart3, 
  PieChart, 
  TrendingUp,
  Calendar,
  MapPin,
  Users,
  AlertCircle,
  ArrowLeft,
  Eye,
  Heart,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Message,
  ResultsFilters,
  ResultsResponse,
  ResultsItem,
  GroupBy,
  PartyBucket
} from '@/lib/messaging-schemas';

// ========== TYPES ==========

interface FilterState {
  messageId?: string;
  geo?: string;
  party?: PartyBucket | 'ALL';
  demo?: string;
  from?: string;
  to?: string;
  rollup: boolean;
  groupBy: GroupBy;
  limit: number;
}

interface ChartData {
  name: string;
  love: number;
  like: number;
  dislike: number;
  hate: number;
  total: number;
  favorability: number;
}

// ========== UTILITY FUNCTIONS ==========

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

const formatPercentage = (num: number): string => {
  return `${(num * 100).toFixed(1)}%`;
};

const exportToCSV = (data: ResultsItem[], groupBy: GroupBy, filename: string): void => {
  const headers = [
    'Key',
    'Total Votes',
    'Love Count',
    'Like Count', 
    'Dislike Count',
    'Hate Count',
    'Love %',
    'Like %',
    'Dislike %',
    'Hate %',
    'Favorability %'
  ];

  const rows = data.map(item => [
    item.key,
    item.counts.n,
    item.counts.love,
    item.counts.like,
    item.counts.dislike,
    item.counts.hate,
    formatPercentage(item.rates.love),
    formatPercentage(item.rates.like),
    formatPercentage(item.rates.dislike),
    formatPercentage(item.rates.hate),
    formatPercentage(item.rates.favorability)
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ========== MAIN COMPONENT ==========

export default function AdminResultsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    rollup: false,
    groupBy: 'message',
    limit: 100,
  });

  // Auth check
  if (!session?.user || (session.user as any).role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You need admin privileges to access this page.
            </p>
            <Button onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch messages for dropdown
  const { data: messages } = useQuery<Message[]>({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const response = await fetch('/api/messages?status=all');
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
  });

  // Fetch results data
  const { data: resultsData, isLoading, error, refetch } = useQuery<ResultsResponse>({
    queryKey: ['admin-results', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/messages/results?${params}`);
      if (!response.ok) throw new Error('Failed to fetch results');
      return response.json();
    },
    enabled: true,
  });

  // Prepare chart data
  const chartData: ChartData[] = useMemo(() => {
    if (!resultsData?.items) return [];
    
    return resultsData.items.map(item => ({
      name: item.key,
      love: item.counts.love,
      like: item.counts.like,
      dislike: item.counts.dislike,
      hate: item.counts.hate,
      total: item.counts.n,
      favorability: item.rates.favorability,
    }));
  }, [resultsData]);

  // Handle filter changes
  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handle CSV export
  const handleExport = useCallback(() => {
    if (!resultsData?.items) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `voting-results-${filters.groupBy}-${timestamp}.csv`;
    exportToCSV(resultsData.items, filters.groupBy, filename);
  }, [resultsData, filters.groupBy]);

  // Get filter summary
  const getFilterSummary = (): string => {
    const parts: string[] = [];
    if (filters.messageId) parts.push(`Message: ${messages?.find(m => m.id === filters.messageId)?.slogan || 'Unknown'}`);
    if (filters.geo && filters.geo !== 'ALL') parts.push(`Geo: ${filters.geo}`);
    if (filters.party && filters.party !== 'ALL') parts.push(`Party: ${filters.party}`);
    if (filters.demo && filters.demo !== 'ALL') parts.push(`Demo: ${filters.demo}`);
    if (filters.from || filters.to) {
      parts.push(`Date: ${filters.from || 'start'} to ${filters.to || 'end'}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'All data';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/messages')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Messages
            </Button>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vote Analytics</h1>
              <p className="text-gray-600 mt-1">
                Analyze voting patterns and message performance
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
            
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              onClick={handleExport}
              disabled={!resultsData?.items || resultsData.items.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Message Filter */}
                  <div>
                    <Label htmlFor="message-filter">Message</Label>
                    <Select
                      value={filters.messageId || ''}
                      onValueChange={(value) => updateFilter('messageId', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All messages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All messages</SelectItem>
                        {messages?.map((message) => (
                          <SelectItem key={message.id} value={message.id}>
                            {message.slogan}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Group By */}
                  <div>
                    <Label htmlFor="group-by">Group By</Label>
                    <Select
                      value={filters.groupBy}
                      onValueChange={(value) => updateFilter('groupBy', value as GroupBy)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="message">Message</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="geo">Geography</SelectItem>
                        <SelectItem value="party">Party</SelectItem>
                        <SelectItem value="demo">Demographics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div>
                    <Label htmlFor="date-from">From Date</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={filters.from || ''}
                      onChange={(e) => updateFilter('from', e.target.value || undefined)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="date-to">To Date</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={filters.to || ''}
                      onChange={(e) => updateFilter('to', e.target.value || undefined)}
                    />
                  </div>

                  {/* Party Filter */}
                  <div>
                    <Label htmlFor="party-filter">Party</Label>
                    <Select
                      value={filters.party || 'ALL'}
                      onValueChange={(value) => updateFilter('party', value === 'ALL' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All parties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All parties</SelectItem>
                        <SelectItem value="D">Democratic</SelectItem>
                        <SelectItem value="R">Republican</SelectItem>
                        <SelectItem value="I">Independent</SelectItem>
                        <SelectItem value="O">Other</SelectItem>
                        <SelectItem value="U">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Geo Filter */}
                  <div>
                    <Label htmlFor="geo-filter">Geography</Label>
                    <Input
                      id="geo-filter"
                      placeholder="e.g., us/wa or us/ny/nyc"
                      value={filters.geo || ''}
                      onChange={(e) => updateFilter('geo', e.target.value || undefined)}
                    />
                  </div>

                  {/* Demo Filter */}
                  <div>
                    <Label htmlFor="demo-filter">Demographics</Label>
                    <Input
                      id="demo-filter"
                      placeholder="e.g., F_25_34 or M_45_54"
                      value={filters.demo || ''}
                      onChange={(e) => updateFilter('demo', e.target.value || undefined)}
                    />
                  </div>

                  {/* Limit */}
                  <div>
                    <Label htmlFor="limit-filter">Limit</Label>
                    <Select
                      value={filters.limit.toString()}
                      onValueChange={(value) => updateFilter('limit', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50 results</SelectItem>
                        <SelectItem value="100">100 results</SelectItem>
                        <SelectItem value="500">500 results</SelectItem>
                        <SelectItem value="1000">1000 results</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Current filters:</strong> {getFilterSummary()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mr-3"
            />
            <span className="text-gray-600">Loading analytics...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="mb-8">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
              <p className="text-gray-600 mb-4">
                Failed to load analytics data. Please try again.
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {resultsData && (
          <>
            {/* Summary Stats */}
            {resultsData.totals && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Eye className="w-8 h-8 text-blue-500" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Total Votes</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(resultsData.totals.n)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Heart className="w-8 h-8 text-red-500" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Love</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(resultsData.totals.love)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatPercentage(resultsData.totals.love / resultsData.totals.n)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <ThumbsUp className="w-8 h-8 text-green-500" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Like</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(resultsData.totals.like)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatPercentage(resultsData.totals.like / resultsData.totals.n)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <ThumbsDown className="w-8 h-8 text-orange-500" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Dislike</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(resultsData.totals.dislike)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatPercentage(resultsData.totals.dislike / resultsData.totals.n)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <X className="w-8 h-8 text-red-700" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Hate</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(resultsData.totals.hate)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatPercentage(resultsData.totals.hate / resultsData.totals.n)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Results by {filters.groupBy}
                  </span>
                  <Badge variant="outline">
                    {resultsData.items.length} results
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resultsData.items.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
                    <p className="text-gray-600">
                      Try adjusting your filters to see results.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">
                            {filters.groupBy === 'message' ? 'Message' : 
                             filters.groupBy === 'day' ? 'Date' :
                             filters.groupBy === 'geo' ? 'Geography' :
                             filters.groupBy === 'party' ? 'Party' : 'Demographics'}
                          </th>
                          <th className="text-right p-3 font-medium">Total</th>
                          <th className="text-right p-3 font-medium">Love</th>
                          <th className="text-right p-3 font-medium">Like</th>
                          <th className="text-right p-3 font-medium">Dislike</th>
                          <th className="text-right p-3 font-medium">Hate</th>
                          <th className="text-right p-3 font-medium">Favorability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultsData.items.map((item, index) => {
                          const favorabilityColor = item.rates.favorability > 0.2 ? 'text-green-600' :
                                                   item.rates.favorability < -0.2 ? 'text-red-600' : 'text-gray-600';
                          
                          return (
                            <motion.tr
                              key={item.key}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="p-3">
                                <div className="font-medium text-gray-900">
                                  {filters.groupBy === 'message' && messages ? 
                                    messages.find(m => m.id === item.key)?.slogan || item.key :
                                    item.key
                                  }
                                </div>
                              </td>
                              <td className="text-right p-3 font-medium">
                                {formatNumber(item.counts.n)}
                              </td>
                              <td className="text-right p-3">
                                <div>{formatNumber(item.counts.love)}</div>
                                <div className="text-xs text-gray-500">
                                  {formatPercentage(item.rates.love)}
                                </div>
                              </td>
                              <td className="text-right p-3">
                                <div>{formatNumber(item.counts.like)}</div>
                                <div className="text-xs text-gray-500">
                                  {formatPercentage(item.rates.like)}
                                </div>
                              </td>
                              <td className="text-right p-3">
                                <div>{formatNumber(item.counts.dislike)}</div>
                                <div className="text-xs text-gray-500">
                                  {formatPercentage(item.rates.dislike)}
                                </div>
                              </td>
                              <td className="text-right p-3">
                                <div>{formatNumber(item.counts.hate)}</div>
                                <div className="text-xs text-gray-500">
                                  {formatPercentage(item.rates.hate)}
                                </div>
                              </td>
                              <td className={`text-right p-3 font-medium ${favorabilityColor}`}>
                                {formatPercentage(item.rates.favorability)}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}