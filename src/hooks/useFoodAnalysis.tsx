import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FoodAnalysisResult } from '@/types';

export function useFoodAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeFood = async (
    input: string | File,
    inputType: 'text' | 'image'
  ): Promise<FoodAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      let body: { text?: string; image?: string } = {};

      if (inputType === 'text') {
        body.text = input as string;
      } else {
        // Convert image to base64
        const file = input as File;
        const base64 = await fileToBase64(file);
        body.image = base64;
      }

      const { data, error: fnError } = await supabase.functions.invoke('analyze-food', {
        body,
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return data as FoodAnalysisResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze food';
      setError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeFood,
    isAnalyzing,
    error,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 string
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
  });
}
