"use client";
import { useState } from 'react';
import { useTax } from '@/contexts/TaxContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function BracketEditor() {
  const { policy, setPolicy } = useTax();
  const [editingFilingStatus, setEditingFilingStatus] = useState<'single' | 'married_joint'>('married_joint');

  // Guard against undefined policy structure
  if (!policy?.incomeTax?.single || !policy?.incomeTax?.married_joint) {
    return (
      <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast">
        <h3 className="text-lg font-semibold mb-4 text-platform-text">Income Tax Brackets</h3>
        <div className="animate-pulse bg-platform-contrast h-32 rounded-lg" />
      </div>
    );
  }

  const currentBrackets = policy.incomeTax[editingFilingStatus].brackets;
  const currentStandardDeduction = policy.incomeTax[editingFilingStatus].standardDeduction;

  const handleBracketChange = (index: number, field: 'threshold' | 'rate', value: number) => {
    const newBrackets = [...currentBrackets];
    newBrackets[index] = { ...newBrackets[index], [field]: value };
    setPolicy({ 
      ...policy, 
      incomeTax: { 
        ...policy.incomeTax, 
        [editingFilingStatus]: {
          ...policy.incomeTax[editingFilingStatus],
          brackets: newBrackets 
        }
      } 
    });
  };

  const handleStandardDeductionChange = (value: number) => {
    setPolicy({
      ...policy,
      incomeTax: {
        ...policy.incomeTax,
        [editingFilingStatus]: {
          ...policy.incomeTax[editingFilingStatus],
          standardDeduction: value,
        },
      },
    });
  };

  const addBracket = () => {
    const lastBracket = currentBrackets[currentBrackets.length - 1];
    const newBracket = {
      threshold: (lastBracket?.threshold || 0) + 10000, // Example increment
      rate: lastBracket?.rate || 0.10,
    };
    const newBrackets = [...currentBrackets, newBracket];
    setPolicy({ 
      ...policy, 
      incomeTax: { 
        ...policy.incomeTax, 
        [editingFilingStatus]: {
          ...policy.incomeTax[editingFilingStatus],
          brackets: newBrackets 
        }
      } 
    });
  };

  const removeBracket = (index: number) => {
    const newBrackets = currentBrackets.filter((_, i) => i !== index);
    setPolicy({ 
      ...policy, 
      incomeTax: { 
        ...policy.incomeTax, 
        [editingFilingStatus]: {
          ...policy.incomeTax[editingFilingStatus],
          brackets: newBrackets 
        }
      } 
    });
  };

  return (
    <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast">
      <h3 className="text-lg font-semibold mb-4 text-platform-text">Income Tax Brackets</h3>
      
      <div className="mb-4">
        <Label className="mb-2 block text-platform-text">Filing Status</Label>
        <RadioGroup
          value={editingFilingStatus}
          onValueChange={(value: 'single' | 'married_joint') => setEditingFilingStatus(value)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" id="status-single" />
            <Label htmlFor="status-single" className="text-platform-text">Single</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="married_joint" id="status-married" />
            <Label htmlFor="status-married" className="text-platform-text">Married Filing Jointly</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="mb-4">
        <Label htmlFor="standard-deduction" className="text-platform-text">Standard Deduction</Label>
        <Input
          id="standard-deduction"
          type="number"
          value={currentStandardDeduction}
          onChange={(e) => handleStandardDeductionChange(Number(e.target.value))}
          className="bg-platform-background text-platform-text"
          aria-label="Standard Deduction"
        />
      </div>

      <div className="space-y-3">
        {currentBrackets.map((bracket, index) => (
          <motion.div
            key={index}
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-platform-contrast/50 p-2 rounded"
          >
            <Input
              type="number"
              value={bracket.threshold}
              onChange={(e) => handleBracketChange(index, 'threshold', Number(e.target.value))}
              className="bg-platform-background text-platform-text"
              aria-label={`Threshold for bracket ${index + 1}`}
            />
            <Input
              type="number"
              value={bracket.rate}
              onChange={(e) => handleBracketChange(index, 'rate', Number(e.target.value))}
              step="0.01"
              className="bg-platform-background text-platform-text"
              aria-label={`Rate for bracket ${index + 1}`}
            />
            <Button variant="ghost" size="icon" onClick={() => removeBracket(index)}>
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </motion.div>
        ))}
      </div>
      <Button variant="platform-primary" className="w-full mt-4" onClick={addBracket}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Add Bracket
      </Button>
    </div>
  );
}