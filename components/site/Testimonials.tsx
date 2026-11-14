"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight } from "./ui";

// Sample voices for the design — replace with real community quotes.
const QUOTES = [
  {
    text: "I reported a blocked drain on my lane on a Monday. By Thursday the ward team had cleared it, and I could follow every step in the app.",
    name: "Farhana Akter",
    role: "Resident, West Shewrapara",
    initials: "FA",
    color: "#c4663b",
  },
  {
    text: "The AQI alerts changed how I plan my mornings. On bad days I move my run indoors, and my kids wear masks to school.",
    name: "Tanvir Ahmed",
    role: "Teacher, Mirpur 10",
    initials: "TA",
    color: "#7b5ea7",
  },
  {
    text: "Organising the Green Mirpur drive took one post. Forty neighbours showed up and we planted 120 saplings in a single afternoon.",
    name: "Sumaiya Islam",
    role: "Organizer, Green Mirpur",
    initials: "SI",
    color: "#a8476b",
  },
];

export default function Testimonials() {
  const [i, setI] = useState(0);
  const q = QUOTES[i];
  const [paused, setPaused] = useState(false);
  const go = (d: number) => setI((v) => (v + d + QUOTES.length) % QUOTES.length);

  // Auto-advance every 7s; pauses on hover/focus and for reduced-motion users.
  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % QUOTES.length), 7000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section
      className="voices wrap"
      aria-roledescription="carousel"
      aria-label="What our neighbours say"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="voices__intro">
        <h2>What our neighbours say</h2>
        <p>Real change happens street by street. Here is how people across Dhaka use EcoPulse.</p>
        <div className="voices__nav">
          <button type="button" aria-label="Previous quote" onClick={() => go(-1)} className="round-btn">
            <span className="flip">
              <ArrowRight />
            </span>
          </button>
          <button type="button" aria-label="Next quote" onClick={() => go(1)} className="round-btn round-btn--dark">
            <ArrowRight />
          </button>
          <div className="dots" role="group" aria-label="Choose a quote">
            {QUOTES.map((qq, n) => (
              <button key={qq.name} type="button" aria-label={`Quote ${n + 1}`} aria-current={n === i} className={n === i ? "on" : undefined} onClick={() => setI(n)} />
            ))}
          </div>
        </div>
      </div>

      <figure className="voices__card" key={i}>
        <div className="voices__portrait" style={{ "--c": q.color } as CSSProperties}>
          <span>{q.initials}</span>
        </div>
        <div className="voices__body">
          <svg className="voices__mark" viewBox="0 0 40 30" aria-hidden="true">
            <path d="M0 30V17C0 7 5 1 15 0v6c-5 1-7 4-7 9h7v15Zm22 0V17c0-10 5-16 15-17v6c-5 1-7 4-7 9h7v15Z" />
          </svg>
          <blockquote>{q.text}</blockquote>
          <figcaption>
            <strong>{q.name}</strong>
            <span>{q.role}</span>
          </figcaption>
        </div>
      </figure>
    </section>
  );
}
