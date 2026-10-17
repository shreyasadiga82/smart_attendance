import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-[28px] bg-surface-container-high border-t border-outline/20 p-6 shadow-2xl flex flex-col md:max-w-xl md:mx-auto"
          >
            {/* Drag Handle Indicator */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-outline/40 cursor-grab active:cursor-grabbing" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline/10">
              {title && (
                <h3 className="text-lg font-semibold text-on-surface">
                  {title}
                </h3>
              )}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                aria-label="Close bottom sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto py-4 text-on-surface">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
