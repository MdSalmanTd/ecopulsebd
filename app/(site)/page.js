import Link from "next/link";
import Photo from "@/components/site/Photo";
import { ArrowRight, ArrowUpRight, Kicker, SectionHead } from "@/components/site/ui";
import Scene, { ImpactIcon } from "@/components/site/Scene";
import PlasticsChart from "@/components/site/PlasticsChart";
import { CountUp, InView, Scroller } from "@/components/site/fx";
import Testimonials from "@/components/site/Testimonials";
import ProgrammeCard from "@/components/site/ProgrammeCard";
import { IMPACT, AREAS, PROGRAMMES, STORIES } from "@/components/site/data";

const FEATURES = [
  {
    title: "Report a problem",
    text: "Snap a photo of dumping, a blocked drain or a damaged tree. We route it to the right local team.",
    href: "/reports",
  },
  {
    title: "Join a mission",
    text: "Find tree plantings, clean-ups and drain checks near you, and sign up in one tap.",
    href: "/programmes",
  },
  {
    title: "Earn rewards",
    text: "Verified actions build your Eco Score, unlock badges and climb your ward’s leaderboard.",
    href: "/profile?tab=rewards",
  },
  {
    title: "Ask the assistant",
    text: "Is it safe to jog today? What does UV 8 mean? Get answers from live local readings.",
    href: "/assistant",
  },
];

const BARS = [38, 44, 40, 52, 48, 56, 60, 58, 66, 70, 68, 76, 80, 84, 88, 92];

export default function LandingPage() {
  return (
    <>
      {/* ============ HERO ============ */}
      <section className="hero2" aria-labelledby="hero-title">
        <div className="hero2__bg" aria-hidden="true" />
        <div className="wrap hero2__inner">
          <div className="hero2__text">
            <a href="/map" className="livechip">
              <span className="livechip__dot" aria-hidden="true" />
              Live in Dhaka now · <b>AQI 142</b>
              <span className="livechip__extra"> · Unhealthy for sensitive groups</span>
              <ArrowRight />
            </a>

            <h1 id="hero-title">
              Know your air.
              <br />
              <span className="hero2__accent">Act with your neighbours.</span>
            </h1>

            <p className="hero2__lead">
              Live air and flood alerts, a community map, missions and one-tap help when the water
              rises. EcoPulse BD turns what neighbours see into action on your street.
            </p>

            <div className="hero__cta">
              <a href="/sign-in?mode=signup&next=%2Ffeed" className="pill-btn pill-btn--dark pill-btn--lg">
                Get started — it’s free <ArrowUpRight />
              </a>
              <a href="/map" className="pill-btn pill-btn--lg">
                See the live map
              </a>
            </div>

            <div className="hero2__trust">
              <div className="hero2__faces" aria-hidden="true">
                {[
                  ["NR", "#3f7d55"],
                  ["TA", "#7b5ea7"],
                  ["FA", "#c4663b"],
                  ["RH", "#3d6fa8"],
                  ["SI", "#a8476b"],
                ].map(([t, c]) => (
                  <span key={t} style={{ "--c": c }}>
                    {t}
                  </span>
                ))}
              </div>
              <p>
                <strong>12,400+ neighbours</strong> across 38 wards are already flagging problems and
                joining missions.
              </p>
            </div>

            <ul className="hero2__features">
              <li>
                <span className="hero2__ficon hero2__ficon--sos" aria-hidden="true">SOS</span>
                <span>
                  <strong>Ask for help</strong>
                  <small>Share your live location in a flood</small>
                </span>
              </li>
              <li>
                <span className="hero2__ficon" aria-hidden="true">🗺</span>
                <span>
                  <strong>Live map</strong>
                  <small>Reports, missions, recycling</small>
                </span>
              </li>
              <li>
                <span className="hero2__ficon" aria-hidden="true">✦</span>
                <span>
                  <strong>AI eco assistant</strong>
                  <small>Is it safe to go out today?</small>
                </span>
              </li>
              <li>
                <span className="hero2__ficon" aria-hidden="true">🌱</span>
                <span>
                  <strong>Missions &amp; rewards</strong>
                  <small>Plant, clean, earn badges</small>
                </span>
              </li>
            </ul>
          </div>

          <div className="hero2__visual" aria-hidden="true">
            <div className="hero2__photo">
              <Photo name="delta" priority sizes="(max-width: 900px) 100vw, 46vw" />
            </div>

            {/* Floating "live" cards (illustrative) */}
            <div className="fcard fcard--aqi">
              <div className="fcard__gauge" style={{ "--p": 57 }}>
                <span>142</span>
              </div>
              <div>
                <small>Air right now · Mirpur 10</small>
                <strong>Unhealthy for sensitive groups</strong>
                <em>Mask up outdoors before 5 PM</em>
              </div>
            </div>

            <div className="fcard fcard--sos">
              <span className="fcard__sosdot">SOS</span>
              <div>
                <strong>Flood help · Kalshi</strong>
                <small>Karim is on the way · 2 min ago</small>
              </div>
            </div>

            <div className="fcard fcard--mission">
              <div className="fcard__thumb">
                <Photo name="seedlings" sizes="56px" />
              </div>
              <div>
                <strong>Green Mirpur Drive</strong>
                <small>15 – 20 Nov · 1,206 joined</small>
              </div>
              <span className="fcard__join">Join</span>
            </div>

            <div className="statcard fcard--stats">
              <div className="statcard__top">
                <strong>2,450</strong>
                <span className="up">+24%</span>
                <small>reports resolved</small>
              </div>
              <div className="statcard__bars">
                {BARS.map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} className={i > 11 ? "is-dim" : undefined} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ IMPACT ============ */}
      <section className="impact wrap reveal" aria-label="Our impact so far">
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

      {/* ============ FEATURES ============ */}
      <section className="section wrap">
        <SectionHead kicker="What you can do" title="Small actions, together, at city scale">
          One app for the whole loop: see what’s wrong, flag it, fix it with your neighbours, and get
          recognised for it.
        </SectionHead>

        <div className="feat__media reveal">
          <div className="media-card">
            <Photo name="seedlings" sizes="(max-width: 600px) 100vw, 40vw" />
          </div>
          <div className="media-card media-card--wide">
            <Photo name="hills" sizes="(max-width: 600px) 100vw, 60vw" />
          </div>
        </div>

        <ul className="feat__list reveal">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <a href={f.href} className="feat__row">
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <span className="round-btn" aria-hidden="true">
                  <ArrowUpRight />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* ============ AREAS (dark) ============ */}
      <section className="dark">
        <div className="wrap dark__inner">
          <div className="dark__intro">
            <Kicker>Areas of action</Kicker>
            <h2>A cleaner Bangladesh starts with a single choice.</h2>
            <p>
              Every report filed, every sapling planted and every bag kept out of a drain moves your
              neighbourhood one step closer to healthier living.
            </p>
            <Link href="/programmes" className="pill-btn pill-btn--light">
              See programmes <ArrowRight />
            </Link>
          </div>

          <Scroller className="areas" label="Areas of action, scrollable">
            {AREAS.map((a) => (
              <article key={a.n} className="area">
                <Scene name={a.art} />
                <div className="area__shade" />
                <span className="area__n">{a.n}</span>
                <div className="area__body">
                  <h3>{a.title}</h3>
                  <p>{a.text}</p>
                </div>
              </article>
            ))}
          </Scroller>
        </div>
      </section>

      {/* ============ PLASTICS ============ */}
      <section className="section wrap" id="plastics">
        <SectionHead kicker="Eco education" title="How plastics decompose over time">
          Understanding how long waste stays around — and why keeping it out of our drains and
          rivers matters for a healthier delta.
        </SectionHead>
        <InView className="reveal">
          <PlasticsChart />
        </InView>
      </section>

      {/* ============ PROGRAMMES ============ */}
      <section className="section section--tint">
        <div className="wrap">
          <div className="row-head">
            <SectionHead kicker="Programmes" title="What we’re working on" align="left" />
            <Link href="/programmes" className="pill-btn">
              All programmes <ArrowRight />
            </Link>
          </div>
          <div className="cards3 reveal">
            {PROGRAMMES.slice(0, 3).map((p) => (
              <ProgrammeCard key={p.title} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ VOICES ============ */}
      <Testimonials />

      {/* ============ STORIES ============ */}
      <section className="section wrap" id="stories">
        <SectionHead title="Stories and tips from the field" />
        <div className="cards3 reveal">
          {STORIES.map((s) => (
            <Link key={s.title} href={`/stories/${s.slug}`} className="story">
              <div className="story__img">
                <Scene name={s.art} />
              </div>
              <small>
                {s.date} · {s.tag}
              </small>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <span className="pill-btn pill-btn--sm">
                Read more <ArrowRight />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ VOLUNTEER BAND ============ */}
      <section className="band">
        <div className="band__art">
          <img className="photo" src="/images/forest-road.jpg" alt="" loading="lazy" decoding="async" />
        </div>
        <div className="wrap">
          <div className="band__card reveal">
            <div>
              <h3>Volunteer</h3>
              <p>Join missions near you. No experience needed, just a couple of hours.</p>
              <a href="/sign-in?mode=signup&next=%2Ffeed" className="text-link">
                Sign up <ArrowRight />
              </a>
            </div>
            <div>
              <h3>Organise</h3>
              <p>Run a clean-up or planting in your ward with our organizer tools.</p>
              <a href="/sign-in?mode=signup&type=organizer" className="text-link">
                Become an organizer <ArrowRight />
              </a>
            </div>
            <div>
              <h3>Partner</h3>
              <p>Schools, companies and ward offices: let’s plan something together.</p>
              <Link href="/contact" className="text-link">
                Talk to us <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
