"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="news__done" role="status">Thanks! You’re on the list.</p>;
  }

  return (
    <form
      className="news"
      onSubmit={(e) => {
        e.preventDefault();
        // No mailing backend yet — just confirm locally.
        setDone(true);
      }}
    >
      <input type="email" required placeholder="Your email" aria-label="Email address" />
      <button type="submit">Subscribe</button>
    </form>
  );
}
