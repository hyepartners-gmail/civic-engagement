"use client";
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';

interface DownloadPanelProps {
  data: (number | null)[][];
  headers: string[];
  filename?: string;
  chartRef?: React.RefObject<HTMLDivElement>;
  onDownload?: () => void;
}

export default function DownloadPanel({ data, headers, filename = 'climate_data.png', chartRef, onDownload }: DownloadPanelProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handlePNGDownload = async () => {
    if (!chartRef?.current) return;
    
    setIsExporting(true);
    
    try {
      // Dynamically import html2canvas only when needed
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        useCORS: true,
        logging: false
      });
      
      const link = document.createElement('a');
      link.download = filename.replace('.csv', '.png');
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      // Call onDownload callback if provided
      if (onDownload) onDownload();
    } catch (error) {
      console.error('Error exporting chart as PNG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Only render the PNG download button if chartRef is provided
  if (!chartRef) {
    return null; // Return nothing if there's no chart reference
  }

  return (
    <div className="flex gap-2">
      <Button 
        variant="platform-primary" 
        size="sm" 
        onClick={handlePNGDownload}
        disabled={isExporting}
      >
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Download PNG'}
      </Button>
    </div>
  );
}