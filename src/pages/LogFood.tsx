import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Type, ArrowLeft, Loader2, Check, Sparkles, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { useFoodAnalysis } from '@/hooks/useFoodAnalysis';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { useToast } from '@/hooks/use-toast';
import { FoodAnalysisResult } from '@/types';

type InputMode = 'choice' | 'text' | 'image';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const mealTypes: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '☀️' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🍎' },
];

export default function LogFood() {
  const [mode, setMode] = useState<InputMode>('choice');
  const [textInput, setTextInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { analyzeFood, isAnalyzing, error } = useFoodAnalysis();
  const { addFoodLog, isAdding } = useFoodLogs();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    let result: FoodAnalysisResult | null = null;

    if (mode === 'text' && textInput.trim()) {
      result = await analyzeFood(textInput.trim(), 'text');
    } else if (mode === 'image' && selectedImage) {
      result = await analyzeFood(selectedImage, 'image');
    }

    if (result) {
      setAnalysisResult(result);
    } else {
      toast({
        title: "Analysis failed",
        description: error || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddToLog = () => {
    if (!analysisResult) return;

    addFoodLog(
      {
        food_name: analysisResult.food_name,
        calories: analysisResult.calories,
        calories_min: analysisResult.calories_min,
        calories_max: analysisResult.calories_max,
        protein_g: analysisResult.protein_g,
        carbs_g: analysisResult.carbs_g,
        fat_g: analysisResult.fat_g,
        meal_type: mealType,
        image_url: imagePreview,
        ai_suggestions: analysisResult.suggestions,
        logged_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast({
            title: "Food logged! 🎉",
            description: `${analysisResult.food_name} added to your diary.`,
          });
          navigate('/dashboard');
        },
        onError: () => {
          toast({
            title: "Failed to log food",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const resetForm = () => {
    setMode('choice');
    setTextInput('');
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
  };

  return (
    <AppLayout hideNav>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => analysisResult ? resetForm() : navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {analysisResult ? 'Review & Log' : 'Log Food'}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {/* Mode Selection */}
          {mode === 'choice' && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <p className="text-muted-foreground text-center">
                How would you like to log your food?
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('image')}
                  className="p-6 rounded-2xl bg-card border-2 border-muted hover:border-primary transition-all text-center group"
                >
                  <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-3 group-hover:shadow-glow transition-shadow">
                    <Camera className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div className="font-semibold text-foreground">Take Photo</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    AI analyzes your food
                  </div>
                </button>

                <button
                  onClick={() => setMode('text')}
                  className="p-6 rounded-2xl bg-card border-2 border-muted hover:border-primary transition-all text-center group"
                >
                  <div className="w-16 h-16 mx-auto rounded-2xl gradient-accent flex items-center justify-center mb-3 group-hover:shadow-glow transition-shadow">
                    <Type className="h-8 w-8 text-accent-foreground" />
                  </div>
                  <div className="font-semibold text-foreground">Type Food</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Describe what you ate
                  </div>
                </button>
              </div>

              <div className="text-center pt-4">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Powered by AI • Supports Indian cuisine
                </p>
              </div>
            </motion.div>
          )}

          {/* Text Input Mode */}
          {mode === 'text' && !analysisResult && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  What did you eat?
                </label>
                <Input
                  placeholder="e.g., 2 roti with dal and sabzi"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="h-14 text-lg rounded-xl"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about portions for better estimates
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Meal Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {mealTypes.map((meal) => (
                    <button
                      key={meal.value}
                      onClick={() => setMealType(meal.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        mealType === meal.value
                          ? 'border-primary bg-primary/10'
                          : 'border-muted bg-card'
                      }`}
                    >
                      <span className="text-xl block">{meal.emoji}</span>
                      <span className="text-xs font-medium">{meal.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!textInput.trim() || isAnalyzing}
                className="w-full h-14 rounded-xl gradient-primary text-primary-foreground font-semibold text-lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyze Food
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Image Input Mode */}
          {mode === 'image' && !analysisResult && (
            <motion.div
              key="image"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Camera input - with capture for camera */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {/* Gallery input - without capture for file picker */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {!imagePreview ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-6 rounded-2xl bg-card border-2 border-muted hover:border-primary transition-all text-center group"
                    >
                      <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-3 group-hover:shadow-glow transition-shadow">
                        <Camera className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <div className="font-semibold text-foreground">Take Photo</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Open camera
                      </div>
                    </button>

                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="p-6 rounded-2xl bg-card border-2 border-muted hover:border-primary transition-all text-center group"
                    >
                      <div className="w-16 h-16 mx-auto rounded-2xl gradient-accent flex items-center justify-center mb-3 group-hover:shadow-glow transition-shadow">
                        <Image className="h-8 w-8 text-accent-foreground" />
                      </div>
                      <div className="font-semibold text-foreground">Gallery</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Choose from photos
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Food preview"
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="p-3 rounded-full bg-card/90 backdrop-blur-sm"
                        title="Take new photo"
                      >
                        <Camera className="h-5 w-5 text-foreground" />
                      </button>
                      <button
                        onClick={() => galleryInputRef.current?.click()}
                        className="p-3 rounded-full bg-card/90 backdrop-blur-sm"
                        title="Choose from gallery"
                      >
                        <Image className="h-5 w-5 text-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {imagePreview && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Meal Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {mealTypes.map((meal) => (
                        <button
                          key={meal.value}
                          onClick={() => setMealType(meal.value)}
                          className={`p-3 rounded-xl border-2 transition-all text-center ${
                            mealType === meal.value
                              ? 'border-primary bg-primary/10'
                              : 'border-muted bg-card'
                          }`}
                        >
                          <span className="text-xl block">{meal.emoji}</span>
                          <span className="text-xs font-medium">{meal.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full h-14 rounded-xl gradient-primary text-primary-foreground font-semibold text-lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Analyze Food
                      </>
                    )}
                  </Button>
                </>
              )}
            </motion.div>
          )}

          {/* Analysis Result */}
          {analysisResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {imagePreview && (
                <div className="rounded-2xl overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Food"
                    className="w-full aspect-video object-cover"
                  />
                </div>
              )}

              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-foreground">
                      {analysisResult.food_name}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-3xl font-bold text-primary">
                        {analysisResult.calories}
                      </span>
                      <span className="text-muted-foreground">calories</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Range: {analysisResult.calories_min} - {analysisResult.calories_max} cal
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="text-center p-3 rounded-xl bg-protein/10">
                      <div className="text-lg font-bold text-protein">
                        {analysisResult.protein_g}g
                      </div>
                      <div className="text-xs text-muted-foreground">Protein</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-carbs/10">
                      <div className="text-lg font-bold text-carbs">
                        {analysisResult.carbs_g}g
                      </div>
                      <div className="text-xs text-muted-foreground">Carbs</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-fat/10">
                      <div className="text-lg font-bold text-fat">
                        {analysisResult.fat_g}g
                      </div>
                      <div className="text-xs text-muted-foreground">Fat</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {analysisResult.suggestions && (
                <Card className="bg-secondary/30">
                  <CardContent className="p-4">
                    <p className="text-sm text-secondary-foreground">
                      💡 {analysisResult.suggestions}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1 h-14 rounded-xl"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleAddToLog}
                  disabled={isAdding}
                  className="flex-1 h-14 rounded-xl gradient-primary text-primary-foreground font-semibold"
                >
                  {isAdding ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Add to Log
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                ⚠️ Estimates are approximate. Adjust if needed.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
