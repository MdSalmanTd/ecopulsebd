import Link from "next/link";
import { Logo } from "./ui";
import Photo from "./Photo";
import NewsletterForm from "./NewsletterForm";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { href: "/reports", label: "Report a problem" },
      { href: "/profile?tab=rewards", label: "Rewards" },
      { href: "/assistant", label: "AI assistant" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/programmes", label: "Programmes" },
      { href: "/#plastics", label: "Plastics & time" },
      { href: "/how-it-works#faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact" },
      { href: "/contact#partner", label: "Partner with us" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="sfoot">
      <div className="sfoot__art">
        <Photo name="forest" />
      </div>
      <div className="sfoot__shade" />

      <div className="wrap sfoot__inner">
        <div className="sfoot__top">
          <div className="sfoot__brand">
            <Logo light />
            <p>
              Citizen-powered environmental action for Bangladesh. Know your air, flag
              problems, and act with your neighbours.
            </p>
          </div>
          <div className="sfoot__news">
            <h3>Start your eco-friendly journey</h3>
            <p>A short monthly note on air, floods and missions near you.</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="sfoot__cols">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4>Reach us</h4>
            <ul>
              <li>Gulshan, Dhaka-1212</li>
              <li>
                <a href="tel:+8801999907883">01999907883</a>
              </li>
              <li>
                <a href="mailto:hello@ecopulse.bd">hello@ecopulse.bd</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="sfoot__bottom">
          <span>© {new Date().getFullYear()} EcoPulse BD. All rights reserved.</span>
          <span>
            Photos from{" "}
            <a href="https://unsplash.com/?utm_source=ecopulse_bd&utm_medium=referral" target="_blank" rel="noopener">
              Unsplash
            </a>
            . Guidance only — follow official alerts from BWDB and local authorities.
          </span>
        </div>
      </div>
    </footer>
  );
}
