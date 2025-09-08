import Link from 'next/link';
import { Category } from '@/lib/common-ground/categories';
import PlatformCard from '../PlatformCard';
import { Button } from '../ui/button';
import { useApi } from '@/hooks/common-ground/useApi';
import { Users } from 'lucide-react';

interface CategoryRollupCardProps {
  category: Category;
  groupId: string;
}

export default function CategoryRollupCard({ category, groupId }: CategoryRollupCardProps) {
  const { data, loading } = useApi<{ size: number }>(
    `/api/common-ground/groups/${groupId}/category/${category.id}/compatibles?version=v1`
  );

  return (
    <PlatformCard className="p-4 flex flex-col">
      <h3 className="font-semibold">{category.name}</h3>
      <div className="flex-1 my-4 text-center">
        {loading ? (
          <p className="text-sm text-platform-text/70">Calculating...</p>
        ) : (
          <>
            <p className="text-sm text-platform-text/70">Largest Compatible Subgroup</p>
            <p className="text-4xl font-bold text-platform-accent flex items-center justify-center gap-2">
              <Users />
              {data?.size || 0}
            </p>
          </>
        )}
      </div>
      <Link href={`/common-ground/group/${groupId}/category/${category.id}`} passHref>
        <Button variant="secondary" size="sm" className="w-full">
          Drill Down
        </Button>
      </Link>
    </PlatformCard>
  );
}