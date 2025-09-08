import { useState, useEffect } from 'react';
import { SurveyFile, Topic, Question, Option, Score } from '@/types/common-ground';

export function useSurvey(version: string) {
  const [surveyFile, setSurveyFile] = useState<SurveyFile | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

  useEffect(() => {
    const fetchSurvey = async () => {
      setLoading(true);
      setError(null);
      setSurveyFile(null); // Reset on new fetch

      try {
        console.log(`[useSurvey] Fetching survey for version: ${version}`);
        const response = await fetch(`/surveys/commonGround_survey_${version}.json?t=${new Date().getTime()}`);
        
        if (!response.ok) {
          throw new Error(`Could not load survey file. Status: ${response.status}`);
        }

        const text = await response.text();
        console.log('[useSurvey] Raw text response:', text.substring(0, 500) + '...');

        const surveyDataFromFile: SurveyFile = JSON.parse(text);
        console.log('[useSurvey] Parsed surveyDataFromFile object:', surveyDataFromFile);

        // Detailed validation logging
        if (!surveyDataFromFile) {
          console.error('[useSurvey] Validation failed: surveyDataFromFile is undefined or null.');
        } else {
          console.log('[useSurvey] surveyDataFromFile exists.');
          if (!Array.isArray(surveyDataFromFile.questions)) {
            console.error('[useSurvey] Validation failed: surveyDataFromFile.questions is not an array. Type is:', typeof surveyDataFromFile.questions);
          } else {
            console.log('[useSurvey] surveyDataFromFile.questions is an array.');
          }
          if (!surveyDataFromFile.meta?.categories) {
            console.error('[useSurvey] Validation failed: surveyDataFromFile.meta.categories is missing.');
            console.error('[useSurvey] surveyDataFromFile.meta object:', surveyDataFromFile.meta);
          } else {
            console.log('[useSurvey] surveyDataFromFile.meta.categories exists.');
          }
        }

        if (!surveyDataFromFile || !Array.isArray(surveyDataFromFile.questions) || !surveyDataFromFile.meta?.categories) {
          throw new Error(`Survey data for version '${version}' is malformed or missing 'questions' or 'meta.categories'.`);
        }

        // --- TRANSFORMATION LOGIC ---
        // Group questions by category_id
        const questionsByCategory: Record<number, any[]> = {};
        surveyDataFromFile.questions.forEach(q => {
          if (!questionsByCategory[q.category_id]) {
            questionsByCategory[q.category_id] = [];
          }
          questionsByCategory[q.category_id].push(q);
        });

        // Create the Topic[] structure that the app expects
        const transformedTopics: Topic[] = Object.entries(questionsByCategory).map(([catIdStr, questions]) => {
          const categoryId = parseInt(catIdStr, 10);
          const categoryName = surveyDataFromFile.meta.categories[categoryId] || `Category ${categoryId}`;
          
          return {
            id: `cat-${categoryId}`,
            name: categoryName,
            categoryId: categoryId,
            version: surveyDataFromFile.version,
            questions: questions.map((q: any) => ({
              id: q.id,
              topicId: `cat-${categoryId}`,
              prompt: q.prompt,
              version: surveyDataFromFile.version,
              options: q.options.map((opt: { label: string; score: Score }, index: number) => ({
                id: `${q.id}-${index}`, // Generate a stable option ID
                questionId: q.id,
                label: opt.label,
                score: opt.score,
                version: surveyDataFromFile.version,
              })),
            })),
          };
        });

        if (transformedTopics.length === 0) {
          console.warn(`Survey version '${version}' was loaded but contains no questions.`);
        }

        // Set the transformed data into state
        setSurveyFile({ ...surveyDataFromFile, topics: transformedTopics });

      } catch (err: any) {
        console.error("Error fetching or parsing survey:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [version]);

  // Placeholder for IndexedDB logic
  const [progress, setProgress] = useState({});

  // Safely access topics to prevent runtime errors
  const topics = surveyFile?.topics || [];
  const currentTopic: Topic | null = topics.length > 0 ? topics[currentTopicIndex] : null;

  const goToNextTopic = () => {
    if (currentTopicIndex < topics.length - 1) {
      setCurrentTopicIndex(prev => prev + 1);
    }
  };

  const goToPrevTopic = () => {
    if (currentTopicIndex > 0) {
      setCurrentTopicIndex(prev => prev - 1);
    }
  };

  return {
    survey: surveyFile,
    currentTopic,
    currentTopicIndex,
    totalTopics: topics.length,
    goToNextTopic,
    goToPrevTopic,
    progress,
    error,
    loading,
  };
}