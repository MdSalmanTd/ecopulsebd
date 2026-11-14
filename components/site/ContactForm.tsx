"use client";

import { useState } from "react";
import { ArrowUpRight } from "./ui";

const TOPICS = ["General question", "Partner with us", "Organise a mission", "Press", "Report a bug"];

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="cform cform--done" role="status">
        <h3>Message received</h3>
        <p>Thanks for reaching out. Our team usually replies within two working days.</p>
        <button type="button" className="pill-btn" onClick={() => setSent(false)}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      className="cform"
      onSubmit={(e) => {
        e.preventDefault();
        // No backend yet — confirm locally.
        setSent(true);
      }}
    >
      <div className="cform__row">
        <label>
          Full name
          <input name="name" required autoComplete="name" placeholder="Nadia Rahman" />
        </label>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </label>
      </div>
      <fieldset className="cform__topics">
        <legend>What is it about?</legend>
        {TOPICS.map((t, i) => (
          <label key={t} className="topic">
            <input type="radio" name="topic" value={t} defaultChecked={i === 0} />
            <span>{t}</span>
          </label>
        ))}
      </fieldset>
      <label>
        Message
        <textarea name="message" rows={5} required maxLength={1000} placeholder="Tell us a little more…" />
      </label>
      <button type="submit" className="pill-btn pill-btn--dark">
        Send message <ArrowUpRight />
      </button>
    </form>
  );
}
