import Link from "next/link";

/**
 * The one EcoPulse BD logo used everywhere (website, app, sign-in):
 * the green leaf mark (/images/logo.svg) + "EcoPulse BD" wordmark.
 * Styles live in styles/brand.css, which every layout imports.
 */
export default function BrandLogo({ light = false, size = "md", href = "/", className = "" }) {
  return (
    <Link href={href} className={`brandlogo brandlogo--${size}${light ? " brandlogo--light" : ""} ${className}`} aria-label="EcoPulse BD home">
      <img src="/images/logo.svg" alt="" className="brandlogo__mark" />
      <span className="brandlogo__word">
        EcoPulse <b>BD</b>
      </span>
    </Link>
  );
}
