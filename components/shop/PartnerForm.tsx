"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { PARTNER_KINDS, type PartnerOffer } from "@/lib/shop";
import { ArrowUpRight } from "@/components/site/ui";

const OFFERS: { key: PartnerOffer; label: string; hint: string }[] = [
  { key: "products", label: "Sell in the Eco Shop", hint: "List your eco-friendly products for our members." },
  { key: "voucher", label: "Offer a voucher", hint: "Give members a discount at your own shop, like 10% off." },
  { key: "both", label: "Both", hint: "Sell here and offer an in-store voucher." },
];

export default function PartnerForm() {
  const [offer, setOffer] = useState<PartnerOffer>("voucher");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    try {
      await api("/api/partners", { method: "POST", json: { ...data, offer } });
      setSent(String(data.business));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn’t send your application. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="cform cform--done" role="status">
        <h3>Application received</h3>
        <p>
          Thank you — we have the details for {sent}. Our partnerships team reviews every application and will
          contact you within three working days.
        </p>
        <button type="button" className="pill-btn" onClick={() => setSent("")}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form className="cform" onSubmit={onSubmit}>
      <div className="cform__row">
        <label>
          Business name
          <input name="business" required minLength={2} maxLength={80} autoComplete="organization" placeholder="Prokriti Organics" />
        </label>
        <label>
          Contact person
          <input name="contact" required minLength={2} maxLength={80} autoComplete="name" placeholder="Nadia Rahman" />
        </label>
      </div>
      <div className="cform__row">
        <label>
          Email
          <input name="email" type="email" required maxLength={120} autoComplete="email" placeholder="you@business.com" />
        </label>
        <label>
          Mobile number
          <input name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="01712345678" />
        </label>
      </div>
      <label>
        What kind of business are you?
        <select name="kind" required defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          {PARTNER_KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      <fieldset className="cform__topics">
        <legend>How would you like to partner?</legend>
        {OFFERS.map((o) => (
          <label key={o.key} className="topic" title={o.hint}>
            <input type="radio" name="offerChoice" checked={offer === o.key} onChange={() => setOffer(o.key)} />
            <span>{o.label}</span>
          </label>
        ))}
        <p className="cform__hint">{OFFERS.find((o) => o.key === offer)?.hint}</p>
      </fieldset>
      {offer !== "products" && (
        <label>
          Voucher discount you have in mind (optional)
          <span className="cform__pct">
            <input name="percent" type="number" min={5} max={70} step={1} placeholder="10" inputMode="numeric" />
            <span>% off for EcoPulse members</span>
          </span>
        </label>
      )}
      <label>
        Tell us about your products or shop (optional)
        <textarea name="message" rows={4} maxLength={600} placeholder="What you sell, where you are, and what makes it eco-friendly." />
      </label>
      {error && (
        <p className="cobox__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="pill-btn pill-btn--dark" disabled={busy}>
        {busy ? "Sending…" : "Apply to be a partner"} <ArrowUpRight />
      </button>
    </form>
  );
}
