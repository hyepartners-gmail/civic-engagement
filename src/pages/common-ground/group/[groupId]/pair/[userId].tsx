import MainLayout from '@/components/MainLayout';
import { useRouter } from 'next/router';
import PairwiseReportClient from '@/components/common-ground/PairwiseReportClient';

export default function PairwiseReportPage() {
  const router = useRouter();
  const { groupId, userId } = router.query;

  if (!groupId || typeof groupId !== 'string' || !userId || typeof userId !== 'string') {
    return (
      <MainLayout>
        <p>Loading report...</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <h1 className="text-3xl font-thin text-platform-text mb-4">
        Pairwise Report
      </h1>
      <PairwiseReportClient groupId={groupId} otherUserId={userId} />
    </MainLayout>
  );
}