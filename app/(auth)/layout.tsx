import type { ReactNode } from "react";
import "@/styles/brand.css";
import "@/styles/sign-in.css";

// Separate root layout so the sign-in stylesheet never mixes with the app styles.
export const metadata = {
  title: { default: "EcoPulse BD", template: "%s | EcoPulse BD" },
  icons: { icon: "/images/logo.svg" },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
