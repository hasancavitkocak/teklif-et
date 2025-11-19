import React, { createContext, useContext, useState } from 'react';

interface UnreadContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  proposalsCount: number;
  setProposalsCount: (count: number) => void;
}

const UnreadContext = createContext<UnreadContextType | undefined>(undefined);

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [proposalsCount, setProposalsCount] = useState(0);

  return (
    <UnreadContext.Provider value={{ unreadCount, setUnreadCount, proposalsCount, setProposalsCount }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  const context = useContext(UnreadContext);
  if (context === undefined) {
    throw new Error('useUnread must be used within an UnreadProvider');
  }
  return context;
}
