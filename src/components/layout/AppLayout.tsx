import { ReactNode, memo } from 'react';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export const AppLayout = memo(function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <main
        className={`max-w-md mx-auto safe-top ${hideNav ? 'pb-20' : 'pb-24'}`}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
});
