import clsx from "clsx";

interface ProgressiveBlurProps {
  height?: number | string;
  steps?: number;
  maxBlur?: number;
  className?: string;
  /**
   * The direction of the blur gradient. Can be a common value like "to top", "to bottom", "to left", "to right", or any valid CSS angle (e.g., "45deg").
   */
  direction?: "to top" | "to bottom" | "to left" | "to right" | (string & {});
}

export const ProgressiveBlur = ({
  height = 100,
  steps = 8,
  maxBlur = 64,
  className,
  direction = "to bottom",
}: ProgressiveBlurProps) => {
  return (
    <div
      id="vaulty-progressive-blur"
      className={clsx(className, "pointer-events-none")}
      style={{
        transformOrigin: "center top 0px",
        height: typeof height === "number" ? `${height}px` : height,
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 0,
          width: "100%",
          height: "100%",
          background: `linear-gradient(${direction}, rgb(from rgba(69, 69, 69, 0) r g b / alpha) 0%, rgb(from rgba(69, 69, 69, 0) r g b / 0%) 100%)`,
        }}
      >
        {Array.from({ length: steps }).map((_, i) => {
          const start = 5;
          const stepSize = (100 - start) / steps;
          const stop = (j: number) => start + j * stepSize;

          let maskImage = "";

          if (i === 0) {
            maskImage = `linear-gradient(${direction}, rgba(0, 0, 0, 1) ${stop(0)}%, rgba(0, 0, 0, 0) ${stop(1)}%)`;
          } else if (i === 1) {
            maskImage = `linear-gradient(${direction}, rgba(0, 0, 0, 1) ${stop(0)}%, rgba(0, 0, 0, 1) ${stop(1)}%, rgba(0, 0, 0, 0) ${stop(2)}%)`;
          } else {
            maskImage = `linear-gradient(${direction}, rgba(0, 0, 0, 0) ${stop(i - 2)}%, rgba(0, 0, 0, 1) ${stop(i - 1)}%, rgba(0, 0, 0, 1) ${stop(i)}%, rgba(0, 0, 0, 0) ${stop(i + 1)}%)`;
          }

          const blurValue = maxBlur / Math.pow(2, i);

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                zIndex: i + 1,
                inset: 0,
                mask: maskImage,
                WebkitMask: maskImage,
                backdropFilter: `blur(${blurValue}px)`,
                WebkitBackdropFilter: `blur(${blurValue}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
