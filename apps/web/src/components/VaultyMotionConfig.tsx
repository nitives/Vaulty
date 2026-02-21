"use client";
import { MotionConfig } from "motion/react";
import { useSettings } from "@/lib/settings";

export function VaultyMotionConfig({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings } = useSettings();
  const reduceMotion = settings.reduceMotion ? "always" : "user";

  return <MotionConfig reducedMotion={reduceMotion}>{children}</MotionConfig>;
}
