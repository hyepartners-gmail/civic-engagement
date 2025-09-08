import { Loader2 } from 'lucide-react'; // Keep Loader2 for buttons if needed
import LoadingSpinner from '@/components/LoadingSpinner'; // Import the new LoadingSpinner

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-platform-text/70">
      <LoadingSpinner spinnerSize="md" message="loading data" /> {/* Use the new spinner */}
    </div>
  );
}