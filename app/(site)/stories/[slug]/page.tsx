import Link from "next/link";
import { notFound } from "next/navigation";
import Photo from "@/components/site/Photo";
import { ArrowRight, Kicker } from "@/components/site/ui";
import { STORIES } from "@/components/site/data";

export function generateStaticParams() {
  return STORIES.map((s) => ({ slug: s.slug }));
}

type StoryParams = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: StoryParams) {
  const { slug } = await params;
  const story = STORIES.find((s) => s.slug === slug);
  return story ? { title: story.title, description: story.text } : {};
}

export default async function StoryPage({ params }: StoryParams) {
  const { slug } = await params;
  const story = STORIES.find((s) => s.slug === slug);
  if (!story) notFound();
  const others = STORIES.filter((s) => s.slug !== slug);

  return (
    <article className="article">
      <header className="wrap article__head">
        <Link href="/#stories" className="text-link">
          ← All stories
        </Link>
        <Kicker>
          {story.tag} · {story.date}
        </Kicker>
        <h1>{story.title}</h1>
        <p className="lead">{story.text}</p>
      </header>
      <div className="wrap">
        <div className="article__img">
          <Photo name={story.art} priority sizes="(max-width: 1240px) 100vw, 1192px" />
        </div>
      </div>
      <div className="wrap article__body">
        {story.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <aside className="wrap article__more">
        <h2>More stories</h2>
        <div className="article__links">
          {others.map((s) => (
            <Link key={s.slug} href={`/stories/${s.slug}`}>
              <small>
                {s.tag} · {s.date}
              </small>
              <strong>{s.title}</strong>
              <ArrowRight />
            </Link>
          ))}
        </div>
      </aside>
    </article>
  );
}
