import { ArrowUpRight, PageHero, SectionHead } from "@/components/site/ui";
import Photo from "@/components/site/Photo";

export const metadata = { title: "How it works" };

const STEPS = [
  {
    n: "01",
    title: "See what’s happening",
    text: "Open the live map for your area: air quality, flood risk, waste points, missions and recent reports, refreshed every 15 minutes.",
    photo: "city",
  },
  {
    n: "02",
    title: "Flag a problem",
    text: "Take a photo, pick a category and drop a pin. Your exact address is never shown publicly.",
    photo: "litter",
  },
  {
    n: "03",
    title: "Neighbours verify, teams act",
    text: "Nearby users confirm the report and it goes to the local organizer or ward office. You can follow every status change.",
    photo: "volunteer",
  },
  {
    n: "04",
    title: "Join in and get recognised",
    text: "Sign up for missions, earn Eco Score and badges for verified actions, and see your ward climb the leaderboard.",
    photo: "cleanup",
  },
];

const FAQ = [
  {
    q: "Is EcoPulse BD free?",
    a: "Yes. The app is free for citizens. Organizer tools are free for community groups and schools.",
  },
  {
    q: "Where does the air and flood data come from?",
    a: "We combine public monitoring stations, open forecast data and community sensors. Each reading shows its source and time.",
  },
  {
    q: "Are the assistant’s answers official warnings?",
    a: "No. The assistant gives guidance based on live readings. Always follow alerts from BWDB, the Department of Environment and local authorities.",
  },
  {
    q: "What happens to my photos and location?",
    a: "Photos are shared with the people who can act on the report. Your exact address is hidden from the public map. Please avoid photographing faces.",
  },
  {
    q: "Which areas are covered?",
    a: "Today we cover 38 wards in Dhaka, with Chattogram and Khulna coming next.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero kicker="How it works" title="From “someone should fix that” to fixed." art={<Photo name="hills" priority sizes="(max-width: 900px) 100vw, 45vw" />}>
        EcoPulse BD connects what you see on your street with the people who can do something about
        it, in four simple steps.
      </PageHero>

      <section className="section wrap">
        <ol className="steps">
          {STEPS.map(({ n, title, text, photo }) => (
            <li key={n} className="step reveal">
              <div className="step__img">
                <Photo name={photo} sizes="(max-width: 900px) 100vw, 45vw" />
              </div>
              <div className="step__body">
                <span className="step__n">{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section section--tint" id="faq">
        <div className="wrap faq-wrap">
          <SectionHead kicker="FAQ" title="Questions people ask" align="left">
            Can’t find what you need? <a href="/contact">Get in touch</a>.
          </SectionHead>
          <div className="faq">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>
                  {f.q}
                  <span className="faq__icon" aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section wrap center">
        <h2 className="big">Ready to make your street better?</h2>
        <a href="/sign-in?mode=signup&next=%2Ffeed" className="pill-btn pill-btn--dark pill-btn--lg">
          Create your free account <ArrowUpRight />
        </a>
      </section>
    </>
  );
}
