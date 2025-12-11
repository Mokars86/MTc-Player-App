
import React, { useEffect, useState } from 'react';
import { Icons } from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setVisible(true);
    } else {
        const timer = setTimeout(() => setVisible(false), 300);
        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  return (
    <div 
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'bg-black/60 backdrop-blur-sm opacity-100' : 'bg-black/0 opacity-0 pointer-events-none'}`}
        onClick={onClose}
    >
      <div 
        className={`bg-app-surface border border-app-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-10 opacity-0'}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-app-border bg-app-card/30">
          <h3 className="text-xl font-bold text-app-text">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-app-bg text-app-subtext hover:text-app-text transition-colors">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t border-app-border bg-app-card/30 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
