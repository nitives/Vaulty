"use client";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  color?: string;
  className?: string;
}

export function SidebarIcon({
  size = "md",
  color,
  className = "",
}: SpinnerProps) {
  const sizeClass = size ? `mini-spinner--${size}` : "";
  const style = color
    ? ({ "--spinner-color": color } as React.CSSProperties)
    : {};

  return (
    <>
      <div className={`mini-spinner ${sizeClass} ${className}`} style={style}>
        <div className="mini-pulse-spinner">
          <div className="mini-pulse-spinner-container">
            <div className="mini-pulse-spinner__nib mini-pulse-spinner__nib--1"></div>
            <div className="mini-pulse-spinner__nib mini-pulse-spinner__nib--2"></div>
            <div className="mini-pulse-spinner__nib mini-pulse-spinner__nib--3"></div>
            <div className="mini-pulse-spinner__nib mini-pulse-spinner__nib--4"></div>
            <div className="mini-pulse-spinner__nib mini-pulse-spinner__nib--5"></div>
            <div className="mini-pulse-spinner__nib mini-pulse-spinner__nib--6"></div>
            <div className="mini-pulse-spinner__nib mini-pulse-spinner__nib--7"></div>
            <div className="mini-pulse-spinner__nib mini-pulse-spinner__nib--8"></div>
          </div>
        </div>
      </div>
    </>
  );
}
