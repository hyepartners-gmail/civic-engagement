"use client";
import { useState } from 'react';
import { useLab, CustomProgram } from '@/contexts/LabContext';
import { useHierarchy, ProcessedBudgetNode } from '@/hooks/useHierarchy';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useToast } from '@/hooks/use-toast';

interface AddProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddProgramModal({ isOpen, onClose }: AddProgramModalProps) {
  const { addCustomProgram } = useLab();
  const { root } = useHierarchy();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [type, setType] = useState<'spending' | 'revenue'>('spending');
  const [amount, setAmount] = useState<number | ''>('');
  const [functionId, setFunctionId] = useState('');

  const functions = (root as ProcessedBudgetNode | null)?.children?.filter(c => c.kind === 'function') || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !functionId) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all fields to add a program.',
      });
      return;
    }

    const newProgram: Omit<CustomProgram, 'id'> = {
      name,
      type,
      amount: Number(amount),
      functionId,
    };

    addCustomProgram(newProgram);
    toast({
      title: 'Program Added',
      description: `"${name}" has been added to your scenario.`,
    });
    onClose();
    // Reset form
    setName('');
    setType('spending');
    setAmount('');
    setFunctionId('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-platform-background text-platform-text border-platform-contrast">
        <DialogHeader>
          <DialogTitle className="text-platform-accent">Add Program / Cut Waste</DialogTitle>
          <DialogDescription>
            Create a new spending program or revenue source. Amounts are in billions per year.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="program-name">Program Name</Label>
            <Input id="program-name" value={name} onChange={e => setName(e.target.value)} className="bg-platform-contrast border-platform-accent" />
          </div>
          <div>
            <Label>Type</Label>
            <RadioGroup value={type} onValueChange={(v: any) => setType(v)} className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spending" id="r-spending" />
                <Label htmlFor="r-spending">Spending</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="revenue" id="r-revenue" />
                <Label htmlFor="r-revenue">Revenue / Cut</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="program-amount">Annual Amount (in Billions)</Label>
            <Input id="program-amount" type="number" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} className="bg-platform-contrast border-platform-accent" />
          </div>
          <div>
            <Label htmlFor="program-function">Budget Category</Label>
            <Select value={functionId} onValueChange={setFunctionId}>
              <SelectTrigger className="bg-platform-contrast border-platform-accent">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent">
                {functions.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4">
            <Button type="submit" variant="platform-primary" className="w-full">Add to Scenario</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}