import Photo from "./Photo";

/** Card image picked by name — lets content data reference photos as a string. */
export default function Scene({ name, sizes = "(max-width: 600px) 100vw, (max-width: 900px) 50vw, 400px" }) {
  return <Photo name={name} sizes={sizes} />;
}

export function ImpactIcon({ name }) {
  const paths = {
    people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5m2 3.5c1.8.6 3 2.4 3 5.5",
    check: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-4-9 3 3 5-6",
    leaf: "M5 19c0-9 5-14 15-15-1 10-6 15-15 15Zm0 0 7-7",
    bin: "M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7",
    pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
