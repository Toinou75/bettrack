import { useState, useEffect, useCallback } from 'react';
import { create } from 'zustand';

// Toast store
export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (msg, type = 'error') => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000);
  },
}));

// Shorthand
export const toast = {
  error: msg => useToastStore.getState().addToast(msg, 'error'),
  success: msg => useToastStore.getState().addToast(msg, 'success'),
  warn: msg => useToastStore.getState().addToast(msg, 'warn'),
};

export default function ToastContainer() {
  const { toasts } = useToastStore();
  if (!toasts.length) return null;

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '10px 16px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 500,
          color: '#fff',
          background: t.type === 'error' ? 'var(--red)' : t.type === 'success' ? 'var(--green)' : 'var(--amber)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'toastIn 0.3s ease-out',
          maxWidth: 340,
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
