import Link from "next/link";
import Photo from "@/components/site/Photo";
import { ArrowRight, PageHero, SectionHead } from "@/components/site/ui";
import { ImpactIcon } from "@/components/site/Scene";
import { IMPACT } from "@/components/site/data";
import { CountUp } from "@/components/site/fx";

export const metadata = { title: "About" };

const VALUES = [
  {
    icon: "pin",
    title: "Local first",
    text: "Data and action at the scale of your ward, your lane and your school, not just the city average.",
  },
  {
    icon: "people",
    title: "Built with neighbours",
    text: "Residents, organizers and ward offices share one picture of what needs fixing, and who is fixing it.",
  },
  {
    icon: "check",
    title: "Honest and open",
    text: "We show where readings come from and never replace official warnings from BWDB and local authorities.",
  },
];

const TIMELINE = [
  { year: "2024", text: "A group of Mirpur residents start mapping blocked drains on a shared spreadsheet." },
  { year: "2025", text: "First version of EcoPulse launches in three wards with live AQI and photo reports." },
  { year: "2026", text: "Missions, rewards and the AI assistant arrive. 38 wards and 12,000+ citizens on board." },
  { year: "Next", text: "Expanding to Chattogram and Khulna, and opening our data to researchers and city planners." },
];

const TEAM = [
  { name: "Md. Mahidul Islam", role: "Front-End Developer", photo: "mahidul" },
  { name: "Md. Salman Talukdar", role: "Full Stack & Project Manager", photo: "salman" },
  { name: "Samiya Sultana", role: "Front-End Developer & QA", photo: "samiya" },
  { name: "Jannatul Mawya", role: "Front-End Developer & UI/UX Designer", photo: "jannatul" },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        kicker="About EcoPulse BD"
        title="We help neighbours take care of the places they live."
        art={<Photo name="paddy" priority sizes="(max-width: 900px) 100vw, 45vw" />}
      >
        Bangladesh is on the front line of climate change. EcoPulse BD gives every citizen the
        live information and the tools to act, together, on the problems they see every day.
      </PageHero>

      <section className="section wrap split">
        <div>
          <SectionHead kicker="Our mission" title="Turn concern into coordinated action" align="left" />
        </div>
        <div className="split__text">
          <p>
            Air quality alerts, flood forecasts and waste complaints usually live in different
            places, and rarely reach the people who can act on them. We bring them together in one
            app, built around the neighbourhood.
          </p>
          <p>
            When a resident flags a blocked drain, it lands with the local organizer and ward office.
            When the AQI spikes, schools nearby get a heads-up. And when a mission needs hands,
            the people around the corner are the first to know.
          </p>
        </div>
      </section>

      <section className="section section--tint">
        <div className="wrap">
          <SectionHead kicker="What we stand for" title="Our values" />
          <div className="cards3">
            {VALUES.map((v) => (
              <div key={v.title} className="value">
                <span className="impact__icon">
                  <ImpactIcon name={v.icon} />
                </span>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="impact wrap" aria-label="Our impact so far">
        {IMPACT.map((s) => (
          <div key={s.label} className="impact__item">
            <span className="impact__icon">
              <ImpactIcon name={s.icon} />
            </span>
            <CountUp value={s.value} />
            <small>{s.label}</small>
          </div>
        ))}
      </section>

      <section className="section wrap">
        <SectionHead kicker="Our story" title="From a spreadsheet to a city-wide network" />
        <ol className="timeline reveal">
          {TIMELINE.map((t) => (
            <li key={t.year}>
              <strong>{t.year}</strong>
              <p>{t.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section wrap">
        <SectionHead kicker="Team" title="The people behind EcoPulse" />
        <ul className="team reveal">
          {TEAM.map((m) => (
            <li key={m.name} className="team__card">
              <div className="team__photo">
                <img
                  src={`/images/team/${m.photo}.jpg`}
                  alt={`Portrait of ${m.name}`}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="team__body">
                <h3>{m.name}</h3>
                <p className="team__role">{m.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="cta-wide">
        <div className="cta-wide__art">
          <Photo name="greenHills" />
        </div>
        <div className="wrap cta-wide__inner">
          <h2>Want to bring EcoPulse to your ward?</h2>
          <Link href="/contact#partner" className="pill-btn pill-btn--dark pill-btn--lg">
            Partner with us <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  );
}
