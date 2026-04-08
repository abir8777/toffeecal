import { useState } from 'react';
import { Stethoscope, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChatInterface, ChatMode } from '@/components/chat/ChatInterface';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { useHealthCoach } from '@/hooks/useHealthCoach';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function ModeToggle({ mode, onChange }: { mode: ChatMode; onChange: (m: ChatMode) => void }) {
  return (
    <div className="px-4 pt-3 pb-1">
      <div className="flex rounded-full bg-muted p-1 relative">
        <motion.div
          className="absolute top-1 bottom-1 rounded-full bg-primary"
          initial={false}
          animate={{ left: mode === 'coach' ? '4px' : '50%', width: 'calc(50% - 4px)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
        <button
          onClick={() => onChange('coach')}
          className={cn(
            'relative z-10 flex-1 py-2 text-sm font-semibold rounded-full text-center transition-colors',
            mode === 'coach' ? 'text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          <Bot className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Coach
        </button>
        <button
          onClick={() => onChange('doctor')}
          className={cn(
            'relative z-10 flex-1 py-2 text-sm font-semibold rounded-full text-center transition-colors',
            mode === 'doctor' ? 'text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          🩺 Doctor
        </button>
      </div>
    </div>
  );
}

export default function Coach() {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, clearChat, mode, switchMode } = useHealthCoach();
  const [authOpen, setAuthOpen] = useState(false);

  if (!user) {
    return (
      <AppLayout>
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <Stethoscope className="h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">AI Health Hub</h1>
          <p className="text-muted-foreground">Sign in to chat with your AI coach & doctor</p>
          <Button onClick={() => setAuthOpen(true)} className="gradient-primary text-primary-foreground font-semibold rounded-xl h-12 px-8">
            Sign In
          </Button>
          <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-6rem)] flex flex-col">
        <ModeToggle mode={mode} onChange={switchMode} />
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === 'doctor' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'doctor' ? -20 : 20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0"
          >
            <ChatInterface
              messages={messages}
              isLoading={isLoading}
              onSendMessage={sendMessage}
              onClearChat={clearChat}
              mode={mode}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
