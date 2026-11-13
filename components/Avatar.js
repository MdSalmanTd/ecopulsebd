import { initials } from "@/lib/useUser";

/**
 * A person's profile photo, or their initials on a coloured circle when they have none.
 * size: "sm" (30px) | "md" (40px, default) | any extra classes via className.
 */
export default function Avatar({ name = "", src, color = "var(--green-500)", size = "md", className = "", ...rest }) {
  const cls = `avatar${size === "sm" ? " avatar--sm" : ""} ${className}`.trim();
  if (src) return <img className={`${cls} avatar--photo`} src={src} alt="" {...rest} />;
  return (
    <span className={`${cls} avatar--init`} style={{ "--c": color }} {...rest}>
      {initials(name)}
    </span>
  );
}
