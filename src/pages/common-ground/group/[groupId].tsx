import CommonGroundGroupClient from '@/components/common-ground/CommonGroundGroupClient';
import MainLayout from '@/components/MainLayout';
import { useRouter } from 'next/router';

export default function GroupPage() {
  const router = useRouter();
  const { groupId } = router.query;

  if (!groupId || typeof groupId !== 'string') {
    return (
      <MainLayout>
        <p>Loading group...</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <CommonGroundGroupClient groupId={groupId} />
    </MainLayout>
  );
}