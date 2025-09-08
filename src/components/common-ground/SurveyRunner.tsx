'use client';

import { useState, useEffect } from 'react';
import { SurveyFile, Option } from '@/types/common-ground';
import { Button } from '../ui/button';
import PlatformCard from '../PlatformCard';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

interface SurveyRunnerProps {
  survey: SurveyFile;
  onComplete: () => void;
}

export default function SurveyRunner({ survey, onComplete }: SurveyRunnerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const allQuestions = survey.topics?.flatMap(t => t.questions) || [];
  const currentQuestion = allQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === allQuestions.length - 1;

  const [shuffledOptions, setShuffledOptions] = useState<Option[]>([]);

  useEffect(() => {
    if (currentQuestion) {
      // Fisher-Yates shuffle algorithm to randomize options
      const shuffled = [...currentQuestion.options];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setShuffledOptions(shuffled);
    }
  }, [currentQuestion]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    
    // Auto-advance if not the last question
    if (!isLastQuestion) {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
      }, 300); // A small delay for visual feedback
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, optionId]) => ({
        questionId,
        optionId,
      }));

      const response = await fetch('/api/common-ground/survey-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: survey.version, answers: formattedAnswers }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit responses.');
      }

      toast({ title: 'Survey Responses Saved!', description: 'Here are your scores.' });
      onComplete(); // Go directly to showing the scores
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not submit your survey. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentQuestion) {
    return <p>Survey loaded incorrectly or has no questions.</p>;
  }

  return (
    <PlatformCard className="p-8 md:p-12">
      <h3 className="text-4xl md:text-5xl font-thin text-center mb-12 min-h-[10rem] flex items-center justify-center">
        {currentQuestion.prompt}
      </h3>
      
      <div className="space-y-4">
        {shuffledOptions.map((option) => (
          <Button 
            key={option.id}
            variant={answers[currentQuestion.id] === option.id ? 'platform-primary' : 'platform-secondary'}
            onClick={() => handleSelectOption(currentQuestion.id, option.id)}
            className="w-full h-auto text-lg md:text-xl py-6 text-left justify-start whitespace-normal"
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="mt-12 flex justify-between items-center">
        <Button onClick={handleBack} disabled={currentQuestionIndex === 0} variant="platform-ghost">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {isLastQuestion && (
          <Button onClick={handleSubmit} disabled={!answers[currentQuestion.id] || isSubmitting} size="lg">
            {isSubmitting ? 'Submitting...' : 'Finish & See Scores'}
          </Button>
        )}
      </div>
    </PlatformCard>
  );
}