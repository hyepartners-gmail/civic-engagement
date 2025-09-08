import { useApi } from './useApi';
import { TopicScoreGroup, CategoryVector } from '@/types/common-ground';

export function useScores(groupId: string | null) {
  const { data: topicScores, error: topicError, loading: topicLoading } = useApi<TopicScoreGroup[]>(groupId ? `/api/common-ground/groups/${groupId}/topic-scores?version=v1` : '');
  const { data: categoryVectors, error: categoryError, loading: categoryLoading } = useApi<CategoryVector[]>(groupId ? `/api/common-ground/groups/${groupId}/category-vectors?version=v1` : '');

  return {
    topicScores,
    categoryVectors,
    error: topicError || categoryError,
    loading: topicLoading || categoryLoading,
  };
}