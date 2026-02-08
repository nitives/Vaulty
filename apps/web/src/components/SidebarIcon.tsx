"use client";

import { useEffect, useState } from "react";

interface SidebarIconProps {
  size?: number;
  collapsed?: boolean;
  className?: string;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

// ease-out-quart: element is entering/exiting
const EASING = "cubic-bezier(0.165, 0.84, 0.44, 1)";
const DURATION = "200ms";

export function SidebarIcon({
  size = 18,
  collapsed = false,
  className,
}: SidebarIconProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <svg
      width={size}
      height={size}
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 23.3887 17.9785"
      preserveAspectRatio="xMidYMid meet"
      className={`inline-block align-middle overflow-visible text-current box-content ${className ?? ""}`}
      role="img"
      aria-hidden="true"
    >
      {/* Outer rounded rectangle */}
      <path
        d="M3.06641 17.9785L19.9609 17.9785C22.0117 17.9785 23.0273 16.9727 23.0273 14.9609L23.0273 3.02734C23.0273 1.01562 22.0117 0 19.9609 0L3.06641 0C1.02539 0 0 1.01562 0 3.02734L0 14.9609C0 16.9727 1.02539 17.9785 3.06641 17.9785ZM3.08594 16.4062C2.10938 16.4062 1.57227 15.8887 1.57227 14.873L1.57227 3.11523C1.57227 2.09961 2.10938 1.57227 3.08594 1.57227L19.9414 1.57227C20.9082 1.57227 21.4551 2.09961 21.4551 3.11523L21.4551 14.873C21.4551 15.8887 20.9082 16.4062 19.9414 16.4062Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
      {/* Inner sidebar panel - animated */}
      <path
        d="M3.75977 15.0781L6.52344 15.0781C7.12891 15.0781 7.37305 14.8242 7.37305 14.1992L7.37305 3.78906C7.37305 3.16406 7.12891 2.91016 6.52344 2.91016L3.75977 2.91016C3.1543 2.91016 2.91016 3.16406 2.91016 3.78906L2.91016 14.1992C2.91016 14.8242 3.1543 15.0781 3.75977 15.0781Z"
        fill="currentColor"
        fillOpacity="0.85"
        style={{
          willChange: "transform, opacity",
          transformOrigin: "2.91px 8.99px",
          transform: collapsed
            ? "translateX(-2.5px) scaleX(0.3)"
            : "translateX(0) scaleX(1)",
          opacity: collapsed ? 0 : 1,
          transition: reducedMotion
            ? "none"
            : `transform ${DURATION} ${EASING}, opacity ${DURATION} ${EASING}`,
        }}
      />
    </svg>
  );
}
