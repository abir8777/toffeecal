import { Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, History, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/log', icon: PlusCircle, label: 'Log' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

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
              <Icon className="h-5 w-5 relative z-10" />
              <span className="text-xs font-medium relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
