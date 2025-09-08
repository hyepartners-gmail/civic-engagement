import MainLayout from '@/components/MainLayout';
import { useRouter } from 'next/router';
import CommonGroundCategoryClient from '@/components/common-ground/CommonGroundCategoryClient';

export default function CategoryDetailPage() {
  const router = useRouter();
  const { groupId, catId } = router.query;

  if (!groupId || typeof groupId !== 'string' || !catId || typeof catId !== 'string') {
    return (
      <MainLayout>
        <p>Loading category details...</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <CommonGroundCategoryClient groupId={groupId} categoryId={parseInt(catId, 10)} />
    </MainLayout>
  );
}