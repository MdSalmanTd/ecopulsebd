import Photo from "@/components/site/Photo";
import { PageHero } from "@/components/site/ui";
import ProgrammesExplorer from "@/components/site/ProgrammesExplorer";
import { AREAS } from "@/components/site/data";

export const metadata = { title: "Programmes" };

export default function ProgrammesPage() {
  return (
    <>
      <PageHero kicker="Programmes" title="Community programmes across Dhaka" art={<Photo name="cleanup" priority sizes="(max-width: 900px) 100vw, 45vw" />}>
        From tree planting to pre-monsoon drain checks, these are the programmes residents are
        running with EcoPulse. Join one, or start your own.
      </PageHero>

      <section className="section wrap section--tight">
        <div className="focus reveal">
          {AREAS.map((a) => (
            <div key={a.n} className="focus__item">
              <span>{a.n}</span>
              <strong>{a.title}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section wrap section--tight">
        <ProgrammesExplorer />
      </section>
    </>
  );
}
