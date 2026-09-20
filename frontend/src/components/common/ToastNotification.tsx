"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Bookmark, AlertCircle, X } from "lucide-react";

export interface ToastData {
  id: string;
  message: string;
  type?: "success" | "info" | "error";
}

export function triggerToast(message: string, type: "success" | "info" | "error" = "success") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nightcast:toast", {
        detail: { message, type },
      })
    );
  }
}

export default function ToastNotification() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleToastEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; type?: "success" | "info" | "error" }>;
      if (!customEvent.detail || !customEvent.detail.message) return;

      const newToast: ToastData = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        message: customEvent.detail.message,
        type: customEvent.detail.type || "success",
      };

      setToasts((prev) => [...prev.slice(-2), newToast]);

      setTimeout(() => {
        removeToast(newToast.id);
      }, 2500);
    };

    window.addEventListener("nightcast:toast", handleToastEvent);
    return () => window.removeEventListener("nightcast:toast", handleToastEvent);
  }, [removeToast]);

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-[99999] flex flex-col gap-2 pointer-events-none select-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const isSuccess = t.type === "success" || !t.type;
          const isError = t.type === "error";

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] border backdrop-blur-2xl transition-all ${
                isError
                  ? "bg-[#180C11]/95 border-rose-500/40 text-rose-200"
                  : isSuccess
                  ? "bg-[#0A1618]/95 border-[#39AEA9]/50 text-[#F8FAFC] shadow-[0_0_20px_rgba(57,174,169,0.2)]"
                  : "bg-[#121A24]/95 border-[#4A6E8D]/50 text-[#F0F0F0]"
              }`}
            >
              <div className="shrink-0">
                {isError ? (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                ) : isSuccess ? (
                  <Check className="w-4 h-4 text-[#A2D5AB]" />
                ) : (
                  <Bookmark className="w-4 h-4 text-[#A4C8E1]" />
                )}
              </div>
              <span className="text-xs font-sans font-semibold tracking-wide">
                {t.message}
              </span>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="ml-2 text-white/50 hover:text-white p-0.5 rounded-full transition cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
