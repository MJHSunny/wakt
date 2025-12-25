import React from 'react';
import { motion } from 'motion/react';

interface FloatingDonateButtonProps {
  onClick: () => void;
}

export function FloatingDonateButton({ onClick }: FloatingDonateButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", delay: 0.5 }}
      onClick={onClick}
      className="fixed bottom-24 right-4 z-50 px-5 py-3 bg-accent rounded-full shadow-lg flex items-center justify-center group hover:scale-110 transition-transform"
      style={{ boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)' }}
    >
      <span className="text-white font-bold text-sm">Donate</span>
    </motion.button>
  );
}