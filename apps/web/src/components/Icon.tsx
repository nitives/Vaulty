import { icons } from "@/types/icons";

export type IconName = keyof typeof icons;

interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className = "" }: IconProps) {
  return (
    <span className={`glyphs ${className}`} aria-hidden="true">
      {icons[name]}
    </span>
  );
}
