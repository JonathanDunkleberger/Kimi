'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { Check, AlertTriangle } from 'lucide-react';

/* ---- tiny global toast store ---- */
interface ToastState {
  message: string | null;
  variant: 'success' | 'error';
  show: (msg: string, variant?: 'success' | 'error') => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  variant: 'success',
  show: (msg, variant = 'success') => set({ message: msg, variant }),
  clear: () => set({ message: null }),
}));

/* ---- component ---- */
export default function KimiToast({ duration = 3500 }: { duration?: number }) {
  const { message, variant, clear } = useToastStore();
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');
  const [currentVariant, setCurrentVariant] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (message) {
      setText(message);
      setCurrentVariant(variant);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        clear();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [message, variant, duration, clear]);

  return (
    <div className={`kimi-toast ${visible ? 'show' : ''} ${currentVariant}`}>
      {currentVariant === 'error' ? (
        <AlertTriangle size={15} strokeWidth={2.5} />
      ) : (
        <Check size={15} strokeWidth={3} />
      )}
      {text}
    </div>
  );
}
