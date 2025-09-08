"use client";
import { useState, useMemo } from 'react';
import { useLab } from '@/contexts/LabContext';
import { useRouter } from 'next/router';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Share2, Copy, Link, Download, Upload, 
  QrCode, Twitter, Check, Sparkles, Save,
  ExternalLink, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import LZString from 'lz-string';

interface ScenarioSharingProps {
  className?: string;
}

export default function ScenarioSharing({ className }: ScenarioSharingProps) {
  const { scenario } = useLab();
  const router = useRouter();
  const { toast } = useToast();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const scenarioSummary = useMemo(() => {
    const changesCount = Object.keys(scenario.deltas || {}).length;
    const programsCount = (scenario.customPrograms || []).length;
    const hasChanges = changesCount > 0 || programsCount > 0;
    
    const majorChanges = Object.entries(scenario.deltas || {})
      .filter(([_, delta]) => Math.abs(delta as number) > 0.1)
      .length;

    return {
      hasChanges,
      changesCount,
      programsCount,
      majorChanges,
      totalChanges: changesCount + programsCount
    };
  }, [scenario]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    
    const scenarioToEncode = {
      deltas: scenario.deltas,
      customPrograms: scenario.customPrograms,
      year: scenario.year,
    };
    
    const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(scenarioToEncode));
    const url = new URL(window.location.href);
    url.searchParams.set('scenario', encoded);
    return url.toString();
  }, [scenario]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
      toast({
        title: 'Link Copied!',
        description: 'Share this link to let others explore your scenario',
      });
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (error) {
      setCopyState('error');
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy link to clipboard',
        variant: 'destructive',
      });
      setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  const handleTwitterShare = () => {
    const text = `Check out my federal budget scenario: ${scenarioSummary.totalChanges} policy changes that would ${
      scenarioSummary.majorChanges > 0 ? 'significantly reshape' : 'fine-tune'
    } America's fiscal priorities.`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const exportScenario = () => {
    const scenarioData = {
      ...scenario,
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0',
        summary: scenarioSummary
      }
    };
    
    const dataStr = JSON.stringify(scenarioData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `budget-scenario-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  if (!scenarioSummary.hasChanges) {
    return (
      <div className={`bg-platform-card-background p-4 rounded-lg border border-platform-contrast ${className}`}>
        <div className="text-center text-platform-text/50">
          <Share2 className="h-6 w-6 mx-auto mb-2" />
          <p className="text-sm">Make policy changes to enable sharing</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-platform-card-background rounded-lg border border-platform-contrast ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-platform-contrast">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-platform-accent" />
            <h3 className="font-semibold text-platform-text">Share Your Scenario</h3>
          </div>
          <Badge className="bg-platform-accent/20 text-platform-accent">
            {scenarioSummary.totalChanges} changes
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Scenario Summary */}
        <div className="bg-platform-contrast/20 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-platform-accent" />
            <span className="text-sm font-medium text-platform-text">Your Scenario</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-platform-text/60">Budget Changes</div>
              <div className="font-mono font-bold text-platform-text">
                {scenarioSummary.changesCount} functions
              </div>
            </div>
            <div>
              <div className="text-platform-text/60">Custom Programs</div>
              <div className="font-mono font-bold text-platform-text">
                {scenarioSummary.programsCount} programs
              </div>
            </div>
          </div>
          {scenarioSummary.majorChanges > 0 && (
            <div className="mt-2 text-xs text-amber-600">
              {scenarioSummary.majorChanges} major change{scenarioSummary.majorChanges > 1 ? 's' : ''} ({'>'}10%)
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleCopyUrl}
            className="flex items-center gap-2"
            variant={copyState === 'copied' ? 'default' : 'outline'}
          >
            <AnimatePresence mode="wait">
              {copyState === 'copied' ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Check className="h-4 w-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Copy className="h-4 w-4" />
                </motion.div>
              )}
            </AnimatePresence>
            {copyState === 'copied' ? 'Copied!' : 'Copy Link'}
          </Button>

          <Button
            onClick={handleTwitterShare}
            variant="outline"
            className="flex items-center gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
          >
            <Twitter className="h-4 w-4" />
            Tweet
          </Button>
        </div>

        {/* Advanced Options */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-xs"
          >
            {showAdvanced ? '↑ Hide' : '↓ Show'} Advanced Options
          </Button>
          
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-platform-contrast space-y-3"
              >
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    onClick={exportScenario}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-3 w-3" />
                    Export JSON
                  </Button>
                  
                  <Button
                    onClick={() => window.open(shareUrl, '_blank')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in New Tab
                  </Button>
                </div>

                {/* URL Preview */}
                <div className="bg-platform-contrast/30 p-2 rounded text-xs">
                  <div className="text-platform-text/60 mb-1">Share URL:</div>
                  <div className="font-mono text-platform-text/80 break-all">
                    {shareUrl.length > 100 ? `${shareUrl.substring(0, 100)}...` : shareUrl}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tips */}
        <div className="bg-blue-500/10 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <Heart className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-xs text-blue-600">
              <div className="font-semibold mb-1">Sharing Tips</div>
              <ul className="space-y-1">
                <li>• Links preserve all your changes and custom programs</li>
                <li>• Recipients can modify and create their own scenarios</li>
                <li>• Export JSON for backup or advanced analysis</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}