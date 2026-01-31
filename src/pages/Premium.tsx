import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Crown, Check, Sparkles, Camera, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  { icon: Camera, title: 'Unlimited Food Scans', desc: 'Analyze as many meals as you want' },
  { icon: TrendingUp, title: 'Detailed Analytics', desc: 'Weekly & monthly nutrition insights' },
  { icon: Sparkles, title: 'AI Meal Suggestions', desc: 'Personalized healthy alternatives' },
  { icon: Zap, title: 'Priority Support', desc: 'Get help when you need it' },
];

export default function Premium() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-primary p-4 pb-32 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 relative z-10"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-primary-foreground">Premium</h1>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Content */}
      <div className="px-4 -mt-24 pb-8 space-y-6 relative z-10">
        {/* Premium Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full gradient-accent flex items-center justify-center mb-4 shadow-glow">
                <Crown className="h-10 w-10 text-accent-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Go Premium
              </h2>
              <p className="text-muted-foreground mb-6">
                Unlock all features and supercharge your nutrition journey
              </p>

              <div className="space-y-4 text-left mb-6">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{feature.title}</div>
                      <div className="text-sm text-muted-foreground">{feature.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pricing Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <Card className="border-2 border-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
              Best Value
            </div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground">Yearly</div>
                  <div className="text-sm text-muted-foreground">Save 50%</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">₹999</div>
                  <div className="text-xs text-muted-foreground">/year</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground">Monthly</div>
                  <div className="text-sm text-muted-foreground">Flexible billing</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">₹149</div>
                  <div className="text-xs text-muted-foreground">/month</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button className="w-full h-14 rounded-xl gradient-accent text-accent-foreground font-semibold text-lg">
            Start 7-Day Free Trial
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Cancel anytime. No commitment required.
          </p>
        </motion.div>

        {/* Free tier info */}
        <Card className="bg-secondary/30">
          <CardContent className="p-4">
            <h3 className="font-medium text-foreground mb-2">Free Version Includes:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                5 food scans per day
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Basic calorie tracking
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Daily macro breakdown
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
