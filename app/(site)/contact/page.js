import { PageHero } from "@/components/site/ui";
import ContactForm from "@/components/site/ContactForm";

export const metadata = { title: "Contact" };

const CHANNELS = [
  { label: "Email", value: "hello@ecopulse.bd", href: "mailto:hello@ecopulse.bd" },
  { label: "Phone", value: "01999907883", href: "tel:+8801999907883" },
  { label: "Office", value: "Gulshan, Dhaka-1212, Bangladesh" },
  { label: "Hours", value: "Sun–Thu, 10:00–18:00" },
];

export default function ContactPage() {
  return (
    <>
      <PageHero kicker="Contact" title="Let’s talk about your neighbourhood.">
        Questions, partnerships, press or a mission idea — send us a note and we’ll get back to you.
      </PageHero>

      <section className="section wrap contact" id="partner">
        <aside className="contact__info">
          {CHANNELS.map((c) => (
            <div key={c.label}>
              <small>{c.label}</small>
              {c.href ? <a href={c.href}>{c.value}</a> : <p>{c.value}</p>}
            </div>
          ))}
          <div className="contact__note">
            <strong>Emergency?</strong>
            <p>
              EcoPulse is not an emergency service. For floods or fires call <b>999</b> and follow
              official alerts.
            </p>
          </div>
        </aside>
        <ContactForm />
      </section>
    </>
  );
}
