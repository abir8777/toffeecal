import { createContext, useContext, useState, ReactNode } from 'react';
import type { ChatMode } from '@/components/chat/ChatInterface';

interface CoachModeContextType {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

const CoachModeContext = createContext<CoachModeContextType>({
  mode: 'coach',
  setMode: () => {},
});

export function CoachModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ChatMode>('coach');
  return (
    <CoachModeContext.Provider value={{ mode, setMode }}>
      {children}
    </CoachModeContext.Provider>
  );
}

export const useCoachMode = () => useContext(CoachModeContext);
