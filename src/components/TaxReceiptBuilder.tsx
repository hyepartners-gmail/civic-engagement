"use client";
import { useRef } from 'react';
import { toPng } from 'html-to-image';
import { Button } from './ui/button';
import { Download, Share2 } from 'lucide-react';
import { fmtUSD } from '@/utils/number';
import { Year } from '@/types';

interface ReceiptCardProps {
  year: Year;
  totalTax: number;
  topCategories: { name: string; value: number }[];
}

export default function ReceiptCard({ year, totalTax, topCategories }: ReceiptCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    if (cardRef.current) {
      toPng(cardRef.current, { backgroundColor: '#12001a' })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `federal-tax-receipt-${year}.png`;
          link.href = dataUrl;
          link.click();
        });
    }
  };

  const handleShare = async () => {
    if (cardRef.current) {
      try {
        // First, generate the image
        const dataUrl = await toPng(cardRef.current, { backgroundColor: '#12001a' });
        
        // Try using the Web Share API if available
        if (navigator.share && navigator.canShare) {
          const blob = await fetch(dataUrl).then(res => res.blob());
          const file = new File([blob], `federal-tax-receipt-${year}.png`, { type: 'image/png' });
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Federal Tax Receipt ${year}`,
              text: `My estimated federal tax contribution for ${year}: ${fmtUSD(totalTax)}`,
              files: [file]
            });
            return;
          }
        }
        
        // Fallback: Copy download link to clipboard
        const link = document.createElement('a');
        link.download = `federal-tax-receipt-${year}.png`;
        link.href = dataUrl;
        
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(link.href);
          alert('Download link copied to clipboard!');
        } else {
          // Fallback for older browsers
          link.click();
        }
      } catch (error) {
        console.error('Error sharing receipt:', error);
        alert('Unable to share receipt. Please try downloading instead.');
      }
    }
  };

  return (
    <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast">
      <div ref={cardRef} className="bg-platform-background p-6 rounded">
        <h3 className="text-2xl font-thin text-center text-platform-text">Federal Tax Receipt {year}</h3>
        <div className="text-center my-4">
          <p className="text-platform-text/80">Your Estimated Contribution</p>
          <p className="text-4xl font-bold text-white">{fmtUSD(totalTax)}</p>
        </div>
        <div className="border-t border-dashed border-platform-contrast my-4" />
        <h4 className="font-semibold mb-2">Your Top 5 Contributions:</h4>
        <ul className="space-y-1">
          {topCategories.map(cat => (
            <li key={cat.name} className="flex justify-between text-sm">
              <span>{cat.name}</span>
              <span className="font-mono">{fmtUSD(cat.value)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-4 mt-4">
        <Button onClick={handleExport} variant="platform-primary" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button onClick={handleShare} variant="platform-primary" className="w-full">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
}