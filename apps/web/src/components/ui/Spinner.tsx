"use client";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  color?: string;
  className?: string;
}

const spinnerStyles = `
.mini-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  position: relative;
  mix-blend-mode: plus-lighter;
  --spinner-color: currentColor;
}

.mini-spinner--xs {
  width: 12px;
  height: 12px;
}

.mini-spinner--sm {
  width: 16px;
  height: 16px;
}

.mini-spinner--md {
  width: 24px;
  height: 24px;
}

.mini-spinner--lg {
  width: 32px;
  height: 32px;
}

.mini-spinner--xl {
  width: 40px;
  height: 40px;
}

.mini-spinner--2xl {
  width: 48px;
  height: 48px;
}

.mini-spinner--3xl {
  width: 56px;
  height: 56px;
}

.mini-spinner--4xl {
  width: 64px;
  height: 64px;
}

.mini-pulse-spinner {
  position: relative;
  width: 100%;
  height: 100%;
}

.mini-pulse-spinner-container {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
}

.mini-spinner--xs .mini-pulse-spinner-container {
  transform: scale(0.03);
}

.mini-spinner--sm .mini-pulse-spinner-container {
  transform: scale(0.04);
}

.mini-spinner--md .mini-pulse-spinner-container {
  transform: scale(0.06);
}

.mini-spinner--lg .mini-pulse-spinner-container {
  transform: scale(0.08);
}

.mini-spinner--xl .mini-pulse-spinner-container {
  transform: scale(0.1);
}

.mini-spinner--2xl .mini-pulse-spinner-container {
  transform: scale(0.12);
}

.mini-spinner--3xl .mini-pulse-spinner-container {
  transform: scale(0.14);
}

.mini-spinner--4xl .mini-pulse-spinner-container {
  transform: scale(0.16);
}

.mini-pulse-spinner__nib {
  background: transparent;
  border-radius: 25%/50%;
  height: 28px;
  position: absolute;
  top: 50%;
  left: 50%;
  margin-left: 0;
  transform-origin: left center;
  width: 66px;
}

.mini-pulse-spinner__nib:before {
  animation-direction: normal;
  animation-duration: 0.8s;
  animation-fill-mode: none;
  animation-iteration-count: infinite;
  animation-name: mini-spinner-line-fade;
  animation-play-state: running;
  animation-timing-function: linear;
  background: var(--spinner-color);
  border-radius: 25%/50%;
  content: "";
  display: block;
  height: 100%;
  width: 100%;
}

.mini-pulse-spinner__nib--1 {
  transform: rotate(0) translate(40px);
}

.mini-pulse-spinner__nib--1:before {
  animation-delay: -0.8s;
}

.mini-pulse-spinner__nib--2 {
  transform: rotate(45deg) translate(40px);
}

.mini-pulse-spinner__nib--2:before {
  animation-delay: -0.7s;
}

.mini-pulse-spinner__nib--3 {
  transform: rotate(90deg) translate(40px);
}

.mini-pulse-spinner__nib--3:before {
  animation-delay: -0.6s;
}

.mini-pulse-spinner__nib--4 {
  transform: rotate(135deg) translate(40px);
}

.mini-pulse-spinner__nib--4:before {
  animation-delay: -0.5s;
}

.mini-pulse-spinner__nib--5 {
  transform: rotate(180deg) translate(40px);
}

.mini-pulse-spinner__nib--5:before {
  animation-delay: -0.4s;
}

.mini-pulse-spinner__nib--6 {
  transform: rotate(225deg) translate(40px);
}

.mini-pulse-spinner__nib--6:before {
  animation-delay: -0.3s;
}

.mini-pulse-spinner__nib--7 {
  transform: rotate(270deg) translate(40px);
}

.mini-pulse-spinner__nib--7:before {
  animation-delay: -0.2s;
}

.mini-pulse-spinner__nib--8 {
  transform: rotate(315deg) translate(40px);
}

.mini-pulse-spinner__nib--8:before {
  animation-delay: -0.1s;
}

@keyframes mini-spinner-line-fade {
  0%,
  100% {
    opacity: 0.55;
  }
  1% {
    opacity: 0.55;
  }
  95% {
    opacity: 0.08;
  }
}
`;

export function Spinner({ size = "md", color, className = "" }: SpinnerProps) {
  const sizeClass = size ? `mini-spinner--${size}` : "";
  const style = color
    ? ({ "--spinner-color": color } as React.CSSProperties)
    : {};

  return (
    <>
      <style>{spinnerStyles}</style>
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
