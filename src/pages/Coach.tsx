import { AppLayout } from '@/components/layout/AppLayout';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { useHealthCoach } from '@/hooks/useHealthCoach';

export default function Coach() {
  const { messages, isLoading, sendMessage, clearChat } = useHealthCoach();

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
