'use client';
import React from 'react';
import { toPng } from 'html-to-image';
import { csvFormat } from 'd3-dsv';
import { Button } from './button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DownloadButtonProps {
  chartRef: React.RefObject<HTMLDivElement>;
  csvData: any[];
  filename: string;
}

export default function DownloadButton({ chartRef, csvData, filename }: DownloadButtonProps) {
  const { toast } = useToast();

  const handleDownloadCSV = () => {
    try {
      const csv = csvFormat(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'CSV Download Started' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not generate CSV file.' });
    }
  };

  const handleDownloadPNG = () => {
    if (chartRef.current) {
      toPng(chartRef.current, { backgroundColor: '#12001a' })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `${filename}.png`;
          link.href = dataUrl;
          link.click();
          toast({ title: 'PNG Download Started' });
        })
        .catch((err) => {
          console.error('oops, something went wrong!', err);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not generate PNG image.' });
        });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Chart element not found for download.' });
    }
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleDownloadCSV} variant="platform-primary" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Download CSV
      </Button>
      <Button onClick={handleDownloadPNG} variant="platform-secondary" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Download PNG
      </Button>
    </div>
  );
}