import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage, ChatMode } from '@/components/chat/ChatInterface';

const WELCOME_COACH: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm Coach, your personal fitness guide! 💪 I can help with nutrition advice, workout tips, and motivation on your wellness journey. How can I help you today?",
  timestamp: new Date(),
};

const WELCOME_DOCTOR: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm Doc, your AI health assistant! 🩺 I can help with health questions, nutrition advice, fitness tips, and even analyze photos of skin concerns or meals. How can I help you today?",
  timestamp: new Date(),
};

export function useHealthCoach() {
  const coachMessages = useRef<ChatMessage[]>([WELCOME_COACH]);
  const doctorMessages = useRef<ChatMessage[]>([WELCOME_DOCTOR]);
  const [mode, setMode] = useState<ChatMode>('coach');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_COACH]);
  const [isLoading, setIsLoading] = useState(false);

  const switchMode = useCallback((newMode: ChatMode) => {
    // Save current messages to the right ref
    if (mode === 'coach') {
      coachMessages.current = messages;
    } else {
      doctorMessages.current = messages;
    }
    // Load from new mode
    const next = newMode === 'coach' ? coachMessages.current : doctorMessages.current;
    setMessages(next);
    setMode(newMode);
  }, [mode, messages]);

  const sendMessage = useCallback(async (content: string, imageBase64?: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      imageUrl: imageBase64,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('health-coach', {
        body: {
          message: content.trim(),
          conversationHistory,
          imageBase64: imageBase64 || undefined,
          mode,
        },
      });

      if (error) throw new Error(error.message || 'Failed to get response');

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || data.error || "I'm sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Health coach error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment! 🙏",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, mode]);

  const clearChat = useCallback(() => {
    const welcome = mode === 'coach' ? { ...WELCOME_COACH, timestamp: new Date() } : { ...WELCOME_DOCTOR, timestamp: new Date() };
    setMessages([welcome]);
  }, [mode]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    mode,
    switchMode,
  };
}
