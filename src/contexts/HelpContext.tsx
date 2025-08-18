import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HelpContextType {
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
  toggleHelp: () => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [showHelp, setShowHelp] = useState(false);

  const toggleHelp = () => setShowHelp(prev => !prev);

  return (
    <HelpContext.Provider value={{ showHelp, setShowHelp, toggleHelp }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}
