// Photos served from the Unsplash CDN (free to use under the Unsplash License).
// Each entry is the images.unsplash.com photo id plus alt text describing the picture.

export const PHOTOS = {
  delta: { id: "1497436072909-60f360e1d4b1", alt: "Aerial view of dense green forest meeting turquoise water" },
  hills: { id: "1532601224476-15c79f2f7a51", alt: "Rolling green hills with wind turbines on the horizon" },
  greenHills: { id: "1501854140801-50d01698950b", alt: "Lush green rolling hills seen from above" },
  forest: { id: "1542273917363-3b1817f69a2d", alt: "Misty green forest on a hillside" },
  seedlings: { id: "1523348837708-15d4a09cfac2", alt: "Young seedlings sprouting in pots, seen from above" },
  hands: { id: "1542601906990-b4d3fb778b09", alt: "Cupped hands holding a small green plant over soil" },
  planting: { id: "1530836369250-ef72a3f5cda8", alt: "A hand planting seedlings in a tray" },
  sprouts: { id: "1625246333195-78d9c38ad449", alt: "Rows of young green crops growing in soil" },
  paddy: { id: "1574943320219-553eb213f72d", alt: "Farmers working a flooded paddy field with cattle and a tractor" },
  smog: { id: "1611273426858-450d8e3c9fce", alt: "Factory chimneys releasing thick smoke into the sky" },
  sky: { id: "1513002749550-c59d786b8e6c", alt: "Blue sky above a layer of white clouds" },
  flood: { id: "1547683905-f686c993aae5", alt: "Flood water rushing through a street with submerged cars" },
  bins: { id: "1611284446314-60a58ac0deb9", alt: "Compost, waste and recycling bins side by side" },
  litter: { id: "1530587191325-3db32d826c18", alt: "Plastic bottles and rubbish washed up on a shore" },
  bottles: { id: "1595278069441-2cf29f8005a4", alt: "A pile of discarded plastic bottles" },
  oceanPlastic: { id: "1621451537084-482c73073a0f", alt: "Plastic waste floating underwater in the ocean" },
  cleanup: { id: "1617953141905-b27fb1f17d88", alt: "Volunteers collecting rubbish on a beach" },
  volunteer: { id: "1559027615-cd4628902d4a", alt: "A volunteer in a red shirt at a community event" },
  city: { id: "1583422409516-2895a77efded", alt: "Aerial view of a dense city grid" },
  valley: { id: "1470071459604-3b5ec3a7fe05", alt: "Green valley with clouds rolling over the hills at sunrise" },
  rocks: { id: "1469474968028-56623f02e42e", alt: "Sunlight over rocky green hills" },
  wave: { id: "1559827260-dc66d52bef19", alt: "A dark ocean wave under a pink sky" },
};

export const unsplash = (id, w, h) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=${w}${h ? `&h=${h}` : ""}`;

const WIDTHS = [480, 800, 1200, 1600, 2000];

/**
 * Responsive cover photo. Fills its (positioned or sized) parent.
 * `sizes` tells the browser how wide the image will be shown so it picks the right file.
 */
export default function Photo({ name, sizes = "100vw", priority = false, className = "" }) {
  const p = PHOTOS[name] ?? PHOTOS.forest;
  return (
    <img
      className={`photo ${className}`}
      src={unsplash(p.id, 1200)}
      srcSet={WIDTHS.map((w) => `${unsplash(p.id, w)} ${w}w`).join(", ")}
      sizes={sizes}
      alt={p.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );
}
