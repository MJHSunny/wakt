import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TimeFormatContextType {
  is24Hour: boolean;
  toggleTimeFormat: () => void;
  formatTime: (time: string) => string;
}

const TimeFormatContext = createContext<TimeFormatContextType | undefined>(undefined);

export function TimeFormatProvider({ children }: { children: ReactNode }) {
  const [is24Hour, setIs24Hour] = useState<boolean>(() => {
    try {
      const savedFmt = localStorage.getItem('timeFormat');
      if (savedFmt === '12') return false;
      if (savedFmt === '24') return true;
      const saved = localStorage.getItem('is24Hour');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // Default to 24-hour format
  });

  const toggleTimeFormat = () => {
    setIs24Hour((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('is24Hour', String(next));
        localStorage.setItem('timeFormat', next ? '24' : '12');
      } catch {}
      return next;
    });
  };

  const formatTime = (time: string): string => {
    if (is24Hour) {
      return time; // Return as is for 24-hour format
    }

    // Convert to 12-hour format
    const parts = time.split(':');
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const period = hours >= 12 ? 'PM' : 'AM';
    const adjustedHours = hours % 12 || 12; // Convert 0 to 12 for midnight, and 13-23 to 1-11
    
    return `${adjustedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <TimeFormatContext.Provider value={{ is24Hour, toggleTimeFormat, formatTime }}>
      {children}
    </TimeFormatContext.Provider>
  );
}

export function useTimeFormat() {
  const context = useContext(TimeFormatContext);
  if (context === undefined) {
    throw new Error('useTimeFormat must be used within a TimeFormatProvider');
  }
  return context;
}
