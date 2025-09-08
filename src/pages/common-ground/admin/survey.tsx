import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import PlatformCard from '@/components/PlatformCard';
import Pill from '@/components/common-ground/ui/Pill';

const SURVEY_VERSIONS = [
  { id: 'v1', status: 'published' },
  { id: 'v2', status: 'draft' },
  { id: 'v3', status: 'archived' },
];

export default function SurveyAdminPage() {
  const { toast } = useToast();

  const handleClone = async (from: string, to: string) => {
    await fetch('/api/admin/survey/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to }),
    });
    toast({ title: 'Action Triggered', description: `Cloning ${from} to ${to}.` });
  };

  const handlePublish = async (version: string) => {
    await fetch('/api/admin/survey/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    });
    toast({ title: 'Action Triggered', description: `Publishing ${version}.` });
  };

  return (
    <MainLayout>
      <h1 className="text-3xl font-thin text-platform-text mb-4">Survey Management</h1>
      <PlatformCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">Survey Versions</h2>
        <ul className="space-y-3">
          {SURVEY_VERSIONS.map(v => (
            <li key={v.id} className="flex items-center justify-between p-3 bg-platform-contrast rounded-md">
              <div>
                <span className="font-semibold">{v.id.toUpperCase()}</span>
                <Pill className="ml-3" color={v.status === 'published' ? 'green' : 'default'}>{v.status}</Pill>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleClone(v.id, `v${parseInt(v.id.slice(1)) + 1}`)}>
                  Clone
                </Button>
                {v.status !== 'published' && (
                  <Button size="sm" onClick={() => handlePublish(v.id)}>
                    Publish
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </PlatformCard>
    </MainLayout>
  );
}