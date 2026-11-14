import type { ReactNode } from "react";
import "@/styles/brand.css";
import "@/styles/site.css";
import "@/styles/shop.css";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { RevealOnScroll } from "@/components/site/fx";

export const metadata = {
  title: {
    default: "EcoPulse BD — Know your air. Act with your neighbours.",
    template: "%s — EcoPulse BD",
  },
  description:
    "Citizen-powered environmental action for Bangladesh: live air quality, flood risk, community missions and problem reports.",
  icons: { icon: "/images/logo.svg" },
};

export const viewport = { themeColor: "#ffffff" };

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="site">
        <SiteNav />
        <main>{children}</main>
        <SiteFooter />
        <RevealOnScroll />
      </body>
    </html>
  );
}
