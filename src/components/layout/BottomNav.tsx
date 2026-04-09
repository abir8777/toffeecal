import { Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, History, User, CalendarDays, MessageCircle, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoachMode } from '@/contexts/CoachModeContext';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/log', icon: PlusCircle, label: 'Log' },
  { path: '/coach', icon: MessageCircle, label: 'Coach', dynamicIcon: true },
  { path: '/meal-plan', icon: CalendarDays, label: 'Plan' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();
  const { mode } = useCoachMode();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isCoachTab = item.dynamicIcon;
          const isDoctor = isCoachTab && mode === 'doctor';
          const Icon = isDoctor ? Stethoscope : item.icon;
          const label = isDoctor ? 'Doc' : item.label;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", duration: 0.5 }}
                />
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={isCoachTab ? mode : item.label}
                  initial={isCoachTab ? { rotateY: 90, opacity: 0 } : false}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={isCoachTab ? { rotateY: -90, opacity: 0 } : undefined}
                  transition={{ duration: 0.25 }}
                  className="relative z-10"
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
              </AnimatePresence>
              <span className="text-xs font-medium relative z-10">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
