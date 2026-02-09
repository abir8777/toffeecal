import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FoodAnalysisResult } from '@/types';

const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
const MAX_IMAGE_DIMENSION = 1024; // px
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
        const file = input as File;

        // Validate file type
        if (!SUPPORTED_TYPES.includes(file.type)) {
          throw new Error(`Unsupported image type: ${file.type}. Please use JPEG, PNG, or WebP.`);
        }

        // Validate file size before compression
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('Image is too large (max 10MB). Please choose a smaller image.');
        }

        // Compress and convert to base64
        const base64 = await compressAndConvert(file);
        body.image = base64;
      }

      const { data, error: fnError } = await supabase.functions.invoke('analyze-food', {
        body,
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(fnError.message || 'Failed to reach analysis service');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as FoodAnalysisResult;
    } catch (err) {
      console.error('Food analysis error:', err);
      const message = err instanceof Error ? err.message : 'Failed to analyze food. Please try again or enter details manually.';
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

function compressAndConvert(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if needed
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not create canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Start with quality 0.7, reduce if still too large
      let quality = 0.7;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);

      while (dataUrl.length > MAX_IMAGE_SIZE_BYTES && quality > 0.2) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      if (dataUrl.length > MAX_IMAGE_SIZE_BYTES) {
        // Further reduce dimensions
        const smallerRatio = 0.5;
        canvas.width = Math.round(width * smallerRatio);
        canvas.height = Math.round(height * smallerRatio);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image. Please try a different image.'));
    };

    img.src = url;
  });
}
