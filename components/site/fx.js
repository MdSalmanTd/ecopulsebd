"use client";

import { useEffect, useRef, useState } from "react";

/** Adds `.is-in` to every `.reveal` element as it scrolls into view (site-wide). */
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("fx");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    const watch = () => document.querySelectorAll(".reveal:not(.is-in)").forEach((el) => io.observe(el));
    watch();
    // Pages change on client navigation — watch new content too.
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove("fx");
    };
  }, []);
  return null;
}

function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

/** Counts up to a value like "12.4K", "7,090 kg" or "120+" when it scrolls into view. */
export function CountUp({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  const m = String(value).match(/^([\d,.]+)(.*)$/);
  const target = m ? parseFloat(m[1].replace(/,/g, "")) : 0;
  const decimals = m && m[1].includes(".") ? m[1].split(".")[1].length : 0;
  const suffix = m ? m[2] : "";
  const [n, setN] = useState(null);

  useEffect(() => {
    if (!inView || !m) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(target);
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1400);
      setN(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const shown =
    n == null || !m
      ? value
      : `${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  return (
    <strong ref={ref} aria-label={String(value)}>
      <span aria-hidden="true">{shown}</span>
    </strong>
  );
}

/** Wraps children and adds `is-in` once visible (used to animate the plastics bars). */
export function InView({ as: Tag = "div", className = "", children }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  return (
    <Tag ref={ref} className={`${className}${inView ? " is-in" : ""}`}>
      {children}
    </Tag>
  );
}

/** Horizontal card scroller with previous/next buttons. */
export function Scroller({ className = "", label, children }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(update, []);
  const by = (dir) => {
    const el = ref.current;
    const card = el.firstElementChild;
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 260) + 16), behavior: "smooth" });
  };
  return (
    <div className="scroller">
      <div ref={ref} className={className} tabIndex={0} aria-label={label} onScroll={update}>
        {children}
      </div>
      <div className="scroller__nav">
        <button type="button" className="round-btn round-btn--glass" aria-label="Previous" disabled={edge.start} onClick={() => by(-1)}>
          <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </button>
        <button type="button" className="round-btn round-btn--glass" aria-label="Next" disabled={edge.end} onClick={() => by(1)}>
          <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
