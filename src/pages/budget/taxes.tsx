import MainLayout from '@/components/MainLayout';
import TaxesPageContent from '@/features/taxes/TaxesPage'; // Renamed import

export default function TaxesPage() {
  return (
    <MainLayout>
      <TaxesPageContent />
    </MainLayout>
  );
}