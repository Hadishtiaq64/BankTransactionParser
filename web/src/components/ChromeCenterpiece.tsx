"use client";

import { motion } from "framer-motion";

/**
 * Pure-CSS liquid-chrome diamond. Layered conic/radial grayscale gradients +
 * blur + inset shadows simulate a glossy mercury surface. A slow-spinning
 * conic layer gives the metal a living, reflective shimmer.
 */
export default function ChromeCenterpiece({
  className = "",
}: {
  className?: string;
}) {
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        {/* Ambient soft shadow under the gem */}
        <div
          aria-hidden
          className="absolute left-1/2 top-[62%] h-24 w-[70%] -translate-x-1/2 rounded-[50%] blur-2xl"
          style={{ background: "rgba(20,20,24,0.28)" }}
        />

        {/* The diamond */}
        <div
          className="relative aspect-square w-[260px] rotate-45 overflow-hidden rounded-[28px] sm:w-[340px]"
          style={{
            background:
              "linear-gradient(145deg, #fdfdfb 0%, #c9c8c4 30%, #6d6d72 55%, #2a2a2e 72%, #b9b8b4 100%)",
            boxShadow:
              "inset 0 2px 6px rgba(255,255,255,0.85), inset 0 -10px 24px rgba(0,0,0,0.45), 0 30px 60px -20px rgba(0,0,0,0.4)",
          }}
        >
          {/* Spinning conic reflection layer */}
          <div
            className="absolute inset-[-30%]"
            style={{
              background:
                "conic-gradient(from 0deg, #ffffff, #8a8a90, #1c1c20, #d6d5d1, #5a5a60, #f4f3ef, #2a2a2e, #ffffff)",
              filter: "blur(14px)",
              opacity: 0.6,
              animation: "chrome-spin 14s linear infinite",
            }}
          />

          {/* Glossy top-left highlight */}
          <div
            className="absolute left-[12%] top-[10%] h-[42%] w-[42%] rounded-[50%] blur-xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)",
            }}
          />

          {/* Lower dark pooling for depth */}
          <div
            className="absolute bottom-[6%] right-[10%] h-[40%] w-[55%] rounded-[50%] blur-2xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(0,0,0,0.5), rgba(0,0,0,0) 72%)",
            }}
          />

          {/* Crisp rim light */}
          <div
            className="absolute inset-0 rounded-[28px]"
            style={{
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
