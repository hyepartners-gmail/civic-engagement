import MainLayout from '@/components/MainLayout';
import { useRouter } from 'next/router';

export default function MemberDetailPage() {
  const router = useRouter();
  const { groupId, userId } = router.query;

  return (
    <MainLayout>
      <h1 className="text-3xl font-thin text-platform-accent mb-4">
        Member Profile: {userId}
      </h1>
      <p className="text-platform-text/80">
        This page will show a detailed breakdown for this member within group {groupId}. (Coming Soon)
      </p>
    </MainLayout>
  );
}