import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Scale, Target, Activity, LogOut, ChevronRight, Crown, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useWeightLogs } from '@/hooks/useWeightLogs';
import { formatCalories } from '@/lib/calories';
import { Skeleton } from '@/components/ui/skeleton';
import { EditGoalSheet } from '@/components/profile/EditGoalSheet';
import { EditActivitySheet } from '@/components/profile/EditActivitySheet';
import { EditPersonalInfoSheet } from '@/components/profile/EditPersonalInfoSheet';
import { WeightHistoryChart } from '@/components/profile/WeightHistoryChart';
import { WaterIntakeCard } from '@/components/profile/WaterIntakeCard';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';
import { DeleteAccountDialog } from '@/components/profile/DeleteAccountDialog';
import { toast } from 'sonner';

const goalLabels = {
  lose_weight: { label: 'Lose Weight', icon: TrendingDown, color: 'text-accent' },
  maintain: { label: 'Maintain Weight', icon: Minus, color: 'text-primary' },
  gain_muscle: { label: 'Build Muscle', icon: TrendingUp, color: 'text-protein' },
};

const activityLabels = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Active',
  very_active: 'Very Active',
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const { logs: weightLogs, addWeightLog } = useWeightLogs();

  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [personalInfoSheetOpen, setPersonalInfoSheetOpen] = useState(false);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const goalInfo = profile?.goal ? goalLabels[profile.goal] : null;
  const GoalIcon = goalInfo?.icon || Target;

  const latestWeight = weightLogs?.[0]?.weight_kg || profile?.weight_kg;
  const previousWeight = weightLogs?.[1]?.weight_kg;
  const weightChange = latestWeight && previousWeight 
    ? (latestWeight - previousWeight).toFixed(1) 
    : null;

  const handleSignOut = async () => {
    await signOut();
  };

  const handleGoalSave = (goal: 'lose_weight' | 'maintain' | 'gain_muscle') => {
    updateProfile(
      { 
        goal,
        // Include existing values to recalculate calories
        age: profile?.age || undefined,
        gender: profile?.gender || undefined,
        height_cm: profile?.height_cm || undefined,
        weight_kg: profile?.weight_kg || undefined,
        activity_level: profile?.activity_level || undefined,
      },
      {
        onSuccess: () => {
          setGoalSheetOpen(false);
          toast.success('Goal updated successfully');
        },
        onError: () => {
          toast.error('Failed to update goal');
        },
      }
    );
  };

  const handleActivitySave = (activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active') => {
    updateProfile(
      { 
        activity_level,
        age: profile?.age || undefined,
        gender: profile?.gender || undefined,
        height_cm: profile?.height_cm || undefined,
        weight_kg: profile?.weight_kg || undefined,
        goal: profile?.goal || undefined,
      },
      {
        onSuccess: () => {
          setActivitySheetOpen(false);
          toast.success('Activity level updated successfully');
        },
        onError: () => {
          toast.error('Failed to update activity level');
        },
      }
    );
  };

  const handlePersonalInfoSave = (info: {
    name?: string | null;
    age?: number | null;
    gender?: 'male' | 'female' | 'other' | null;
    height_cm?: number | null;
    weight_kg?: number | null;
  }) => {
    const updateData = {
      name: info.name ?? profile?.name,
      age: info.age ?? profile?.age,
      gender: info.gender ?? profile?.gender,
      height_cm: info.height_cm ?? profile?.height_cm,
      weight_kg: info.weight_kg ?? profile?.weight_kg,
      activity_level: profile?.activity_level,
      goal: profile?.goal,
    };

    updateProfile(updateData as any, {
      onSuccess: () => {
        // Also add weight log if weight changed
        if (info.weight_kg && info.weight_kg !== profile?.weight_kg) {
          addWeightLog(info.weight_kg);
        }
        setPersonalInfoSheetOpen(false);
        toast.success('Personal info updated successfully');
      },
      onError: () => {
        toast.error('Failed to update personal info');
      },
    });
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          {!profile?.is_premium && (
            <Link to="/premium">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
                <Crown className="h-4 w-4 text-accent" />
                Go Premium
              </Button>
            </Link>
          )}
        </motion.div>

        {/* User Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-5">
              {isLoading ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ProfilePictureUpload
                    currentAvatarUrl={profile?.avatar_url}
                    userName={profile?.name}
                    onUploadSuccess={(url) => {
                      updateProfile({ avatar_url: url } as any, {
                        onSuccess: () => {},
                        onError: () => toast.error('Failed to save profile picture'),
                      });
                    }}
                  />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-foreground">
                      {profile?.name || 'User'}
                    </h2>
                    <p className="text-muted-foreground text-sm">{user.email}</p>
                    {profile?.is_premium && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-accent mt-1">
                        <Crown className="h-3 w-3" />
                        Premium Member
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Scale className="h-5 w-5 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">
                {latestWeight || '--'}
                <span className="text-sm font-normal text-muted-foreground"> kg</span>
              </div>
              <div className="text-xs text-muted-foreground">Current Weight</div>
              {weightChange && (
                <div className={`text-xs mt-1 ${
                  Number(weightChange) > 0 ? 'text-accent' : 'text-primary'
                }`}>
                  {Number(weightChange) > 0 ? '+' : ''}{weightChange} kg
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-5 w-5 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">
                {formatCalories(profile?.daily_calorie_target || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Daily Goal</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Water Intake */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <WaterIntakeCard 
            weightKg={profile?.weight_kg} 
            dailyGoal={profile?.daily_water_goal_ml}
          />
        </motion.div>

        {/* Weight History Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <WeightHistoryChart logs={weightLogs} isLoading={isLoading} />
        </motion.div>

        {/* Profile Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h3 className="font-semibold text-foreground">Your Details</h3>
          
          <Card>
            <CardContent className="divide-y divide-border">
              <button
                onClick={() => setGoalSheetOpen(true)}
                className="w-full flex items-center justify-between py-3 hover:bg-muted/50 transition-colors -mx-1 px-1 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <GoalIcon className={`h-5 w-5 ${goalInfo?.color || 'text-muted-foreground'}`} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">Goal</div>
                    <div className="text-xs text-muted-foreground">
                      {goalInfo?.label || 'Not set'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              <button
                onClick={() => setActivitySheetOpen(true)}
                className="w-full flex items-center justify-between py-3 hover:bg-muted/50 transition-colors -mx-1 px-1 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">Activity Level</div>
                    <div className="text-xs text-muted-foreground">
                      {profile?.activity_level 
                        ? activityLabels[profile.activity_level] 
                        : 'Not set'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              <button
                onClick={() => setPersonalInfoSheetOpen(true)}
                className="w-full flex items-center justify-between py-3 hover:bg-muted/50 transition-colors -mx-1 px-1 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">Personal Info</div>
                    <div className="text-xs text-muted-foreground">
                      {profile?.age ? `${profile.age} years` : 'Not set'}
                      {profile?.height_cm ? ` • ${profile.height_cm} cm` : ''}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sign Out
          </Button>
          
          <DeleteAccountDialog />
        </motion.div>

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground space-y-1 pt-4">
          <p>ToffeeCal v1.0</p>
          <p>⚠️ Calorie estimates are approximate and not medical advice.</p>
        </div>
      </div>

      {/* Edit Sheets */}
      <EditGoalSheet
        open={goalSheetOpen}
        onOpenChange={setGoalSheetOpen}
        currentGoal={profile?.goal || null}
        onSave={handleGoalSave}
        isLoading={isUpdating}
      />

      <EditActivitySheet
        open={activitySheetOpen}
        onOpenChange={setActivitySheetOpen}
        currentLevel={profile?.activity_level || null}
        onSave={handleActivitySave}
        isLoading={isUpdating}
      />

      <EditPersonalInfoSheet
        open={personalInfoSheetOpen}
        onOpenChange={setPersonalInfoSheetOpen}
        currentInfo={{
          name: profile?.name || null,
          age: profile?.age || null,
          gender: profile?.gender || null,
          height_cm: profile?.height_cm || null,
          weight_kg: profile?.weight_kg || null,
        }}
        onSave={handlePersonalInfoSave}
        isLoading={isUpdating}
      />
    </AppLayout>
  );
}
