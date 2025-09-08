import PlatformCard from '@/components/PlatformCard';
import { Button } from '@/components/ui/button';
import { Link, Share2 } from 'lucide-react';

interface ShareSheetProps {
  url: string;
  title: string;
}

export default function ShareSheet({ url, title }: ShareSheetProps) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title, url });
    } else {
      navigator.clipboard.writeText(url);
      // You would typically use a toast notification here
      alert('Link copied to clipboard!');
    }
  };

  return (
    <PlatformCard className="p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="flex gap-2">
        <Button onClick={handleShare} className="flex-1">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(url)}>
          <Link className="h-4 w-4" />
        </Button>
      </div>
    </PlatformCard>
  );
}