"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ErrorBanner from "./ErrorBanner";
import type { TranslatedError } from "@/lib/errors";

interface ErrorToastProps {
  error: TranslatedError | null;
  duration?: number;
  onDismiss: () => void;
}

export default function ErrorToast({
  error,
  duration = 5000,
  onDismiss,
}: ErrorToastProps) {
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [error, duration, onDismiss]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[100] flex justify-center px-4 sm:justify-end sm:px-6"
      style={{
        bottom: "max(1rem, env(safe-area-inset-bottom))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
      }}
    >
      <AnimatePresence>
        {error && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-sm"
          >
            <ErrorBanner
              variant={error.level}
              title={error.title}
              message={error.message}
              action={error.action}
              raw={error.raw}
              onDismiss={onDismiss}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
