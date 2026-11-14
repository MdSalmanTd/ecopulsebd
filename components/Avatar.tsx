import type { CSSProperties, HTMLAttributes } from "react";
import { initials } from "@/lib/useUser";

interface AvatarProps extends HTMLAttributes<HTMLElement> {
  name?: string;
  src?: string | null;
  color?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * A person's profile photo, or their initials on a coloured circle when they have none.
 * size: "sm" (30px) | "md" (40px, default) | any extra classes via className.
 */
export default function Avatar({ name = "", src, color = "var(--green-500)", size = "md", className = "", ...rest }: AvatarProps) {
  const cls = `avatar${size === "sm" ? " avatar--sm" : ""} ${className}`.trim();
  if (src) return <img className={`${cls} avatar--photo`} src={src} alt="" {...rest} />;
  return (
    <span className={`${cls} avatar--init`} style={{ "--c": color } as CSSProperties} {...rest}>
      {initials(name)}
    </span>
  );
}
