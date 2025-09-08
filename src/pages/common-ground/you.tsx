import CommonGroundYouClient from '@/components/common-ground/CommonGroundYouClient';
import MainLayout from '@/components/MainLayout';
import { useMyScores } from '@/hooks/common-ground/useMyScores';

export default function CommonGroundYouPage() {
  const { myScores, loading, error, refetch } = useMyScores('v1');
  const surveyCompleted = !loading && myScores && myScores.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-platform-background text-platform-text">
        <p>Loading...</p>
      </div>
    );
  }

  const clientProps = {
    myScores,
    scoresLoading: loading,
    scoresError: error,
    refetchScores: refetch,
  };

  if (surveyCompleted) {
    return (
      <MainLayout>
        <CommonGroundYouClient {...clientProps} />
      </MainLayout>
    );
  } else {
    return (
      <div className="min-h-screen bg-platform-background text-platform-text p-4 sm:p-8 flex items-center justify-center">
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl font-thin text-platform-text mb-8 text-center">
            Political Survey
          </h1>
          <CommonGroundYouClient {...clientProps} />
        </div>
      </div>
    );
  }
}