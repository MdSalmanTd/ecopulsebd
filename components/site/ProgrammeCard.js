import Scene from "./Scene";
import { ArrowRight } from "./ui";

export default function ProgrammeCard({ status, title, place, text, progress, art, mission }) {
  const canJoin = mission && status !== "Completed";
  return (
    <article className="prog">
      <div className="prog__img">
        <Scene name={art} />
        <span className={`status-tag status-tag--${status.toLowerCase()}`}>{status}</span>
      </div>
      <div className="prog__body">
        <small>{place}</small>
        <h3>{title}</h3>
        <p>{text}</p>
        {status === "Ongoing" && (
          <div className="prog__bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${title} progress`}>
            <span style={{ width: `${progress}%` }} />
            <em>{progress}%</em>
          </div>
        )}
        <div className="prog__cta">
          {canJoin ? (
            // Goes into the app; signed-out visitors are asked to sign in first.
            <a href={`/missions?open=${mission}`} className="pill-btn pill-btn--dark pill-btn--sm">
              Join this mission <ArrowRight />
            </a>
          ) : status === "Completed" ? (
            <span className="prog__done">✓ Completed — thank you, volunteers!</span>
          ) : (
            <a href="/contact#partner" className="pill-btn pill-btn--sm">
              Get involved <ArrowRight />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
