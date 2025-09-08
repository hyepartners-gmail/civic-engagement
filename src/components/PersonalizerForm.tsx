"use client";
import { useState, useEffect } from 'react';
import { useYou, PEER_PROFILES } from '@/contexts/YouContext';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Info, RotateCcw } from 'lucide-react';
import fastDeepEqual from 'fast-deep-equal';

export default function PersonalizerForm() {
  const { scenario, setInput, resetInput } = useYou();
  const { input } = scenario;
  const [selectedPeer, setSelectedPeer] = useState('median');

  useEffect(() => {
    if (!input) return;
    // Check if the current input matches any peer profile
    const matchingPeer = Object.keys(PEER_PROFILES).find(key =>
      fastDeepEqual(PEER_PROFILES[key].input, input)
    );
    if (matchingPeer) {
      setSelectedPeer(matchingPeer);
    } else {
      setSelectedPeer('custom');
    }
  }, [input]);

  const handlePeerChange = (peerKey: string) => {
    if (peerKey !== 'custom') {
      const peerProfile = PEER_PROFILES[peerKey];
      if (peerProfile) {
        setInput(peerProfile.input);
      }
    }
    setSelectedPeer(peerKey);
  };

  return (
    <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-thin text-platform-text">Your Tax Receipt</h2>
        <Button variant="ghost" size="sm" onClick={resetInput}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="compare-to">Compare To</Label>
          <Select value={selectedPeer} onValueChange={handlePeerChange}>
            <SelectTrigger className="bg-platform-contrast border-platform-accent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent">
              <SelectItem value="custom">Custom Input</SelectItem>
              {Object.entries(PEER_PROFILES).map(([key, profile]) => (
                <SelectItem key={key} value={key}>{profile.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="income">Annual Income</Label>
          <Input
            id="income"
            type="number"
            value={input?.income || ''}
            onChange={(e) => setInput({ income: Number(e.target.value) })}
            className="bg-platform-contrast border-platform-accent"
          />
        </div>
        <div>
          <Label htmlFor="filing-status">Filing Status</Label>
          <Select value={input?.filingStatus || 'single'} onValueChange={(v) => setInput({ filingStatus: v as any })}>
            <SelectTrigger className="bg-platform-contrast border-platform-accent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent">
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="married_joint">Married Filing Jointly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="dependents">Dependents</Label>
          <Input
            id="dependents"
            type="number"
            value={input?.dependents || 0}
            onChange={(e) => setInput({ dependents: Number(e.target.value) })}
            className="bg-platform-contrast border-platform-accent"
          />
        </div>
      </div>
      <div className="mt-4 text-xs text-platform-text/60 flex items-center gap-2">
        <Info className="h-4 w-4" />
        <span>All calculations are done in your browser. Your data is never sent to our servers.</span>
      </div>
    </div>
  );
}