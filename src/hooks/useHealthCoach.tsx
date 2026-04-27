import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage, ChatMode } from '@/components/chat/ChatInterface';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-coach`;

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
      // Only send the last few turns to keep latency low
      const conversationHistory = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          message: content.trim(),
          conversationHistory,
          imageBase64: imageBase64 || undefined,
          mode,
        }),
      });

      if (!resp.ok || !resp.body) {
        let errMsg = 'Failed to get response';
        try {
          const j = await resp.json();
          errMsg = j.error || errMsg;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      // If the server returned JSON instead of a stream (e.g. error fallback), handle it
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        let serverMsg = '';
        try {
          const j = await resp.json();
          serverMsg = j.error || j.message || '';
        } catch { /* ignore */ }
        throw new Error(serverMsg || 'Unexpected response from server');
      }

      const assistantId = `assistant-${Date.now()}`;
      // Insert empty assistant message we will progressively fill
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
      ]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Flush any remaining buffered SSE lines after stream ended
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
              );
            }
          } catch { /* ignore partial leftovers */ }
        }
      }

      if (!assistantContent) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "I'm sorry, I couldn't process that. Please try again." }
              : m
          )
        );
      }
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
