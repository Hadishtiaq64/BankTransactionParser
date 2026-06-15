"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GemSmoke } from "@paper-design/shaders-react";

interface LoadingScreenProps {
  /** How long the loader stays before fading out (ms). */
  duration?: number;
  /** Only show once per browser session. */
  sessionKey?: string;
}

export default function LoadingScreen({
  duration = 2600,
  sessionKey = "lustre-loaded",
}: LoadingScreenProps) {
  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    const seen =
      typeof window !== "undefined" && sessionStorage.getItem(sessionKey);
    if (seen) return;

    setVisible(true);
    setSize({ w: window.innerWidth, h: window.innerHeight });

    const onResize = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);

    const t = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(sessionKey, "1");
    }, duration);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [duration, sessionKey]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: "#f0efea" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0">
            <GemSmoke
              width={size.w}
              height={size.h}
              image="https://shaders.paper.design/images/logos/diamond.svg"
              colors={["#333333", "#e7e6df"]}
              colorBack="#f0efea"
              colorInner="#fafaf5"
              shape="diamond"
              innerDistortion={0.8}
              outerDistortion={0.6}
              outerGlow={0.55}
              innerGlow={1}
              offset={0}
              angle={0}
              size={0.8}
              speed={1}
              scale={0.6}
            />
          </div>

          <motion.div
            className="relative z-10 flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <span className="text-sm font-medium uppercase tracking-[0.4em] text-ink-soft">
              Lustre
            </span>
            <span className="text-xs tracking-[0.25em] text-gray-1">
              LOADING INTELLIGENCE
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
