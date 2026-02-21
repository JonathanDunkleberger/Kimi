'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { Check } from 'lucide-react';

/* ---- tiny global toast store ---- */
interface ToastState {
  message: string | null;
  show: (msg: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (msg) => set({ message: msg }),
  clear: () => set({ message: null }),
}));

/* ---- component ---- */
export default function KimiToast({ duration = 3500 }: { duration?: number }) {
  const { message, clear } = useToastStore();
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (message) {
      setText(message);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        clear();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [message, duration, clear]);

  return (
    <div className={`kimi-toast ${visible ? 'show' : ''}`}>
      <Check size={15} strokeWidth={3} />
      {text}
    </div>
  );
}
