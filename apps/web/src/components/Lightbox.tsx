"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfXmark } from "@bradleyhodges/sfsymbols";
import { createPortal } from "react-dom";
import clsx from "clsx";

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
}

export function Lightbox({
  isOpen,
  onClose,
  imageUrl,
  alt = "",
}: LightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsZoomed(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // Prevent scrolling
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 bottom-0 top-9 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className={clsx(
              "cursor-pointer",
              "absolute top-4 right-4 z-[101] flex items-center justify-center",
              "size-10 rounded-full transition-colors",
              "bg-black/50 text-white/70  hover:bg-black/70 hover:text-white",
            )}
          >
            <SFIcon icon={sfXmark} size={16} />
          </button>

          <motion.img
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: isZoomed ? 1.75 : 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            src={imageUrl}
            alt={alt}
            className={clsx(
              "max-h-full max-w-full rounded-lg object-contain shadow-2xl drop-shadow-2xl",
              isZoomed ? "cursor-zoom-out" : "cursor-zoom-in",
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(!isZoomed);
            }}
            draggable={false}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
