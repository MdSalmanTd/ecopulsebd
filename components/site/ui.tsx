import Link from "next/link";
import type { ReactNode } from "react";
import BrandLogo from "@/components/BrandLogo";

export function Logo({ light = false }: { light?: boolean }) {
  return <BrandLogo light={light} />;
}

export function ArrowUpRight() {
  return (
    <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function ArrowRight() {
  return (
    <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Small pill label above section headings ("ECO EDUCATION"). */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="kicker">
      <span className="kicker__dot" aria-hidden="true" />
      {children}
    </p>
  );
}

interface SectionHeadProps {
  kicker?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  align?: string;
}

export function SectionHead({ kicker, title, children, align = "center" }: SectionHeadProps) {
  return (
    <header className={`shead shead--${align}`}>
      {kicker && <Kicker>{kicker}</Kicker>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </header>
  );
}

/** Page hero used by inner pages. */
interface PageHeroProps {
  kicker?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  art?: ReactNode;
}

export function PageHero({ kicker, title, children, art }: PageHeroProps) {
  return (
    <section className="phero wrap">
      <div className="phero__text">
        {kicker && <Kicker>{kicker}</Kicker>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {art && <div className="phero__art">{art}</div>}
    </section>
  );
}
