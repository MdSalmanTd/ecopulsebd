import "@/styles/brand.css";
import "@/styles/styles.css";
import "@/styles/rewards.css";
import "@/styles/assistant.css";
import "@/styles/app-ui.css";
import { ToastProvider } from "@/components/app/Toast";
import { HelpBeacon } from "@/components/app/Help";

export const metadata = {
  title: { default: "EcoPulse BD", template: "%s — EcoPulse BD" },
  icons: { icon: "/images/logo.svg" },
};

export const viewport = { themeColor: "#f1f8f3" };

export default function AppLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <ToastProvider>
          {children}
          {/* Keeps sharing live location while the user has an active help request */}
          <HelpBeacon />
        </ToastProvider>
      </body>
    </html>
  );
}
