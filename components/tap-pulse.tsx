"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { HeartIcon } from "@/components/icons";

/**
 * Halo visuel déclenché à la réception d'un tap. Il s'affiche même quand
 * `navigator.vibrate` n'existe pas (iOS, desktop), et respecte `reducedMotion`.
 */
export function TapPulse({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1700);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x: [0, -3, 3, -2, 2, 0] }}
      transition={{
        opacity: { duration: 0.2 },
        x: { duration: 0.45, ease: "easeOut" },
      }}
      className="pointer-events-none fixed inset-0 z-[65] flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.28, 0] }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="absolute inset-0 bg-rose/20"
      />
      <motion.span
        initial={{ scale: 0.6, opacity: 0.6 }}
        animate={{ scale: 2.4, opacity: 0 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="absolute h-52 w-52 rounded-full bg-gradient-to-br from-rose/45 via-rose/15 to-transparent blur-2xl"
      />
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{
          scale: [0.4, 1.15, 1],
          opacity: [0, 1, 0],
          rotate: [0, -7, 7, -4, 4, 0],
        }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative grid h-24 w-24 place-items-center rounded-full border border-rose/40 bg-ink-900/70 text-rose shadow-[0_0_60px_-10px_rgba(255,107,149,0.8)] backdrop-blur-md"
      >
        <HeartIcon className="h-10 w-10" />
      </motion.span>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: [0, 1, 0], y: -8 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        className="absolute inset-x-0 top-[60%] text-center font-display text-[15px] text-rose-soft"
      >
        Pensée reçue
      </motion.p>

      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 10, x: (index - 1) * 34 }}
          animate={{ opacity: [0, 1, 0], y: -90 - index * 18 }}
          transition={{ duration: 1.6, delay: 0.1 * index, ease: "easeOut" }}
          className="absolute text-[18px]"
        >
          💗
        </motion.span>
      ))}
    </motion.div>
  );
}
