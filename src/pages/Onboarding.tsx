import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, User, Ruler, Scale, Activity, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { OnboardingData } from '@/types';

const steps = [
  { id: 'name', title: "What's your name?", icon: User },
  { id: 'basics', title: 'Tell us about yourself', icon: User },
  { id: 'body', title: 'Your body stats', icon: Ruler },
  { id: 'activity', title: 'How active are you?', icon: Activity },
  { id: 'goal', title: 'What\'s your goal?', icon: Target },
];

const activityLevels = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
  { value: 'light', label: 'Light', desc: '1-3 days/week' },
  { value: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { value: 'active', label: 'Active', desc: '6-7 days/week' },
  { value: 'very_active', label: 'Very Active', desc: 'Athlete level' },
];

const goals = [
  { value: 'lose_weight', label: 'Lose Weight', emoji: '📉', desc: 'Healthy calorie deficit' },
  { value: 'maintain', label: 'Maintain', emoji: '⚖️', desc: 'Keep your current weight' },
  { value: 'gain_muscle', label: 'Build Muscle', emoji: '💪', desc: 'Gain strength & mass' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<OnboardingData>>({});
  const { updateProfile, isUpdating } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      updateProfile(
        { ...data, onboarding_completed: true } as OnboardingData & { onboarding_completed: boolean },
        {
          onSuccess: () => {
            toast({
              title: "You're all set! 🎉",
              description: "Let's start tracking your nutrition journey.",
            });
            navigate('/dashboard');
          },
          onError: () => {
            toast({
              title: "Something went wrong",
              description: "Please try again.",
              variant: "destructive",
            });
          },
        }
      );
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const updateData = (key: keyof OnboardingData, value: any) => {
    setData({ ...data, [key]: value });
  };

  const isStepValid = () => {
    switch (step) {
      case 0: return data.name && data.name.length > 0;
      case 1: return data.age && data.gender;
      case 2: return data.height_cm && data.weight_kg;
      case 3: return data.activity_level;
      case 4: return data.goal;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col p-6">
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            className="h-1 flex-1 rounded-full overflow-hidden bg-muted"
          >
            <motion.div
              className="h-full gradient-primary"
              initial={{ width: 0 }}
              animate={{ width: i <= step ? '100%' : '0%' }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        {step > 0 && (
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{steps[step].title}</h1>
          <p className="text-muted-foreground text-sm">Step {step + 1} of {steps.length}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {step === 0 && (
              <div className="space-y-4">
                <Input
                  placeholder="Enter your name"
                  value={data.name || ''}
                  onChange={(e) => updateData('name', e.target.value)}
                  className="h-14 text-lg rounded-xl"
                  autoFocus
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Age</label>
                  <Input
                    type="number"
                    placeholder="25"
                    value={data.age || ''}
                    onChange={(e) => updateData('age', parseInt(e.target.value))}
                    className="h-14 text-lg rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">Gender</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['male', 'female', 'other'] as const).map((gender) => (
                      <button
                        key={gender}
                        onClick={() => updateData('gender', gender)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          data.gender === gender
                            ? 'border-primary bg-primary/10'
                            : 'border-muted bg-card'
                        }`}
                      >
                        <span className="text-2xl block mb-1">
                          {gender === 'male' ? '👨' : gender === 'female' ? '👩' : '🧑'}
                        </span>
                        <span className="text-sm font-medium capitalize">{gender}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Height (cm)</label>
                  <Input
                    type="number"
                    placeholder="170"
                    value={data.height_cm || ''}
                    onChange={(e) => updateData('height_cm', parseInt(e.target.value))}
                    className="h-14 text-lg rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Weight (kg)</label>
                  <Input
                    type="number"
                    placeholder="70"
                    value={data.weight_kg || ''}
                    onChange={(e) => updateData('weight_kg', parseInt(e.target.value))}
                    className="h-14 text-lg rounded-xl"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                {activityLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => updateData('activity_level', level.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      data.activity_level === level.value
                        ? 'border-primary bg-primary/10'
                        : 'border-muted bg-card'
                    }`}
                  >
                    <div className="font-semibold text-foreground">{level.label}</div>
                    <div className="text-sm text-muted-foreground">{level.desc}</div>
                  </button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                {goals.map((goal) => (
                  <button
                    key={goal.value}
                    onClick={() => updateData('goal', goal.value)}
                    className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                      data.goal === goal.value
                        ? 'border-primary bg-primary/10'
                        : 'border-muted bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{goal.emoji}</span>
                      <div>
                        <div className="font-semibold text-foreground">{goal.label}</div>
                        <div className="text-sm text-muted-foreground">{goal.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Continue button */}
      <Button
        onClick={handleNext}
        disabled={!isStepValid() || isUpdating}
        className="w-full h-14 rounded-xl gradient-primary text-primary-foreground font-semibold text-lg mt-6"
      >
        {step === steps.length - 1 ? (
          <>
            <Check className="mr-2 h-5 w-5" />
            Complete Setup
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
    </div>
  );
}
