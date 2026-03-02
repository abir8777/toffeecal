import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { useHealthCoach } from '@/hooks/useHealthCoach';

export default function Coach() {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, clearChat } = useHealthCoach();
  const [authOpen, setAuthOpen] = useState(false);

  if (!user) {
    return (
      <AppLayout>
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <MessageSquare className="h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Health Coach</h1>
          <p className="text-muted-foreground">Sign in to chat with your AI health coach</p>
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
      <div className="h-[calc(100vh-6rem)]">
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          onClearChat={clearChat}
        />
      </div>
    </AppLayout>
  );
}
