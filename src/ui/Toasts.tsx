import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';

export type Tone = 'info' | 'success' | 'warning' | 'evidence' | 'danger';

interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

interface ToastState {
  items: Toast[];
  push: (text: string, tone?: Tone) => void;
}

let nextId = 1;
const COLORS: Record<Tone, string> = {
  info: 'var(--cyan)',
  success: 'var(--green)',
  warning: 'var(--amber)',
  evidence: 'var(--magenta)',
  danger: 'var(--red)',
};

export const useToasts = create<ToastState>()((set) => ({
  items: [],
  push: (text, tone = 'info') => {
    const id = nextId++;
    set((state) => ({ items: [...state.items, { id, text, tone }] }));
    setTimeout(() => set((state) => ({ items: state.items.filter((item) => item.id !== id) })), 4200);
  },
}));

export const toast = (text: string, tone?: Tone) => useToasts.getState().push(text, tone);

export default function Toasts() {
  const items = useToasts((state) => state.items);
  return (
    <div className="toast-stack" aria-live="polite">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            className="toast panel"
            style={{ borderInlineStartColor: COLORS[item.tone] }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
          >
            {item.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
