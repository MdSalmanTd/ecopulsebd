// Commonly cited decomposition estimates (years). Figures vary widely between sources.
const ITEMS = [
  { name: "Milk carton", min: 5, max: 5 },
  { name: "Rubber boot sole", min: 50, max: 80 },
  { name: "Aluminium can", min: 80, max: 200 },
  { name: "Beverage holder", min: 200, max: 450 },
  { name: "Disposable diaper", min: 250, max: 500 },
  { name: "Plastic bottle", min: 450, max: 450 },
  { name: "Styrofoam cup", min: 500, max: 500 },
  { name: "Fishing line", min: 600, max: 650 },
  { name: "Polythene bag", min: 10, max: 1000 },
];

const SCALE = 1000;
const pct = (v: number) => `${Math.max((v / SCALE) * 100, 4)}%`;
const label = ({ min, max }: { min: number; max: number }) => (min === max ? `${min} years` : `${min} to ${max} years`);

function Warn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17v.5" strokeLinecap="round" />
    </svg>
  );
}

export default function PlasticsChart() {
  return (
    <div className="plastics">
      <ul className="plastics__rows">
        {ITEMS.map((it) => (
          <li key={it.name} className="plastics__row">
            <span className="plastics__max" style={{ width: pct(it.max) }} />
            <span className="plastics__min" style={{ width: pct(it.min) }} />
            <span className="plastics__name">
              <Warn />
              {it.name}
            </span>
            <span className="plastics__years">{label(it)}</span>
          </li>
        ))}
      </ul>
      <div className="plastics__legend">
        <span>Estimated minimum and maximum, on a 1,000-year scale</span>
        <span>
          <i className="sw sw--min" /> Minimum <i className="sw sw--max" /> Maximum
        </span>
      </div>
    </div>
  );
}
