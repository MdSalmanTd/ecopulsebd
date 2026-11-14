// Eco Shop: shared types, the starter catalogue and the pricing rules.
// The pricing function runs in the browser (live preview) and on the server (the real total).

export type ShopCategory = "zero-waste" | "food" | "home" | "clothing";

export const SHOP_CATEGORIES: { key: ShopCategory; label: string }[] = [
  { key: "zero-waste", label: "Zero-waste living" },
  { key: "food", label: "Organic food" },
  { key: "home", label: "Home & garden" },
  { key: "clothing", label: "Clothing" },
];

export interface Partner {
  id: string;
  name: string;
  kind: string;
  blurb: string;
  area: string;
  color: string;
}

export interface Product {
  id: string;
  name: string;
  category: ShopCategory;
  description: string;
  /** Price in taka. */
  price: number;
  unit: string;
  /** images.unsplash.com photo id */
  photo: string;
  partnerId: string;
  partnerName: string;
  stock: number;
  badge: string | null;
}

export interface Voucher {
  code: string;
  /** null = an EcoPulse voucher that works on every item. */
  partnerId: string | null;
  partnerName: string;
  title: string;
  percent: number;
  minSpend: number;
  maxDiscount: number | null;
  /** Eco Coins needed to claim it (0 = free). */
  coinCost: number;
  /** Also accepted at the partner's physical shop. */
  inStore: boolean;
  claimed: boolean;
  used: boolean;
}

export type PaymentMethod = "cod" | "online" | "coins";
export type PayChannel = "bkash" | "nagad" | "card";

export const PAY_CHANNELS: { key: PayChannel; label: string }[] = [
  { key: "bkash", label: "bKash" },
  { key: "nagad", label: "Nagad" },
  { key: "card", label: "Card" },
];

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  photo: string;
  partnerId: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  voucherCode: string | null;
  voucherDiscount: number;
  coinsUsed: number;
  delivery: number;
  total: number;
  payment: PaymentMethod;
  paid: boolean;
  payChannel: PayChannel | null;
  status: "placed" | "cancelled";
  name: string;
  phone: string;
  address: string;
  createdAt: string;
  canCancel: boolean;
}

export interface ShopResponse {
  products: Product[];
  partners: Partner[];
  vouchers: Voucher[];
  /** The signed-in user's Eco Coin balance; null when signed out. */
  coins: number | null;
}

export interface CartLine {
  id: string;
  qty: number;
}

export const PARTNER_KINDS = ["Shop or retailer", "Maker or artisan", "Farm or food producer", "Café or restaurant", "Brand or company", "Other"];
export type PartnerOffer = "products" | "voucher" | "both";

// ---------- Pricing ----------

export const DELIVERY_FEE = 60;
export const FREE_DELIVERY_FROM = 1500;
/** 1 Eco Coin = ৳1 off. */
export const COIN_VALUE = 1;
export const MAX_QTY = 20;

export interface Totals {
  subtotal: number;
  voucherDiscount: number;
  /** Why the chosen voucher gives nothing (e.g. minimum spend not reached). */
  voucherNote: string | null;
  delivery: number;
  /** Amount before coins. */
  beforeCoins: number;
  /** The most coins this order can take. */
  maxCoins: number;
  coinsUsed: number;
  total: number;
}

type PricedLine = { price: number; qty: number; partnerId: string };
type VoucherRule = Pick<Voucher, "partnerId" | "partnerName" | "percent" | "minSpend" | "maxDiscount">;

export function computeTotals(
  lines: PricedLine[],
  voucher: VoucherRule | null,
  coinsWanted: number,
  coinBalance: number,
): Totals {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);

  let voucherDiscount = 0;
  let voucherNote: string | null = null;
  if (voucher) {
    const eligible = voucher.partnerId
      ? lines.filter((l) => l.partnerId === voucher.partnerId).reduce((s, l) => s + l.price * l.qty, 0)
      : subtotal;
    if (eligible === 0) voucherNote = `Add something from ${voucher.partnerName} to use this voucher.`;
    else if (eligible < voucher.minSpend)
      voucherNote = `Spend ৳${voucher.minSpend}${voucher.partnerId ? ` on ${voucher.partnerName}` : ""} to use this voucher.`;
    else {
      voucherDiscount = Math.round((eligible * voucher.percent) / 100);
      if (voucher.maxDiscount != null) voucherDiscount = Math.min(voucherDiscount, voucher.maxDiscount);
    }
  }

  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
  const beforeCoins = subtotal - voucherDiscount + delivery;
  const maxCoins = Math.max(0, Math.min(Math.floor(coinBalance), Math.floor(beforeCoins / COIN_VALUE)));
  const coinsUsed = Math.max(0, Math.min(Math.floor(coinsWanted) || 0, maxCoins));
  return {
    subtotal,
    voucherDiscount,
    voucherNote,
    delivery,
    beforeCoins,
    maxCoins,
    coinsUsed,
    total: beforeCoins - coinsUsed * COIN_VALUE,
  };
}

export const taka = (n: number): string => `৳${n.toLocaleString("en-US")}`;

// ---------- Starter catalogue (seeded into the database on first run) ----------

export const SEED_PARTNERS: Partner[] = [
  { id: "bamboo-bd", name: "Bamboo & Co.", kind: "Zero-waste store", blurb: "Plastic-free everyday swaps made from bamboo, jute and soy wax.", area: "Dhanmondi, Dhaka", color: "#3f7d55" },
  { id: "prokriti", name: "Prokriti Organics", kind: "Organic grocer", blurb: "Chemical-free rice, honey, oil and spices sourced straight from farmer co-ops.", area: "Mirpur 10, Dhaka", color: "#b07a2c" },
  { id: "mati", name: "Mati Studio", kind: "Pottery & plants", blurb: "Hand-thrown clay homeware and easy indoor plants.", area: "Mohammadpur, Dhaka", color: "#c4663b" },
  { id: "shobuj", name: "Shobuj Threads", kind: "Sustainable clothing", blurb: "Handloom organic cotton, naturally dyed.", area: "Uttara, Dhaka", color: "#3d6fa8" },
];

const P: Record<string, string> = Object.fromEntries(SEED_PARTNERS.map((p) => [p.id, p.name]));

type SeedProduct = Omit<Product, "partnerName">;
const PRODUCTS: SeedProduct[] = [
  { id: "bamboo-toothbrush", name: "Bamboo toothbrush set", category: "zero-waste", description: "Four toothbrushes with compostable bamboo handles and soft BPA-free bristles.", price: 220, unit: "Pack of 4", photo: "1607613009820-a29f7bb81c04", partnerId: "bamboo-bd", stock: 120, badge: "Plastic-free" },
  { id: "sundarbans-honey", name: "Sundarbans wildflower honey", category: "food", description: "Raw, unpasteurised honey collected by Mouli foragers and packed in a reusable glass jar.", price: 650, unit: "500 g jar", photo: "1558642452-9d2a7deb7f62", partnerId: "prokriti", stock: 60, badge: "Best seller" },
  { id: "jute-tote", name: "Everyday tote bag", category: "zero-waste", description: "A sturdy reusable shopping bag that replaces hundreds of polythene bags.", price: 180, unit: "1 bag", photo: "1544816155-12df9643f363", partnerId: "bamboo-bd", stock: 200, badge: "Reusable" },
  { id: "clay-vases", name: "Speckled clay bottle vases", category: "home", description: "Three hand-thrown stoneware vases with a matte speckled glaze.", price: 890, unit: "Set of 3", photo: "1565193566173-7a0ee3dbe261", partnerId: "mati", stock: 25, badge: "Handmade" },
  { id: "herbal-tea", name: "Sylhet herbal tea", category: "food", description: "Whole-leaf tea with tulsi and lemongrass in plastic-free pyramid bags.", price: 320, unit: "20 bags", photo: "1576092768241-dec231879fc3", partnerId: "prokriti", stock: 90, badge: "Organic" },
  { id: "desk-succulent", name: "Desk succulent in a pot", category: "home", description: "A low-maintenance haworthia in a ceramic pot. Water it twice a month.", price: 350, unit: "1 plant", photo: "1485955900006-10f4d324d411", partnerId: "mati", stock: 40, badge: "Air-friendly" },
  { id: "cotton-shirt", name: "Handloom cotton shirt", category: "clothing", description: "Breathable organic cotton with three-quarter sleeves, dyed with natural indigo.", price: 1250, unit: "Sizes S–XL", photo: "1596755094514-f87e34085b2c", partnerId: "shobuj", stock: 35, badge: "Natural dye" },
  { id: "aromatic-rice", name: "Kataribhog aromatic rice", category: "food", description: "Fragrant heritage rice from Dinajpur, grown with compost instead of chemical fertiliser.", price: 380, unit: "2 kg", photo: "1586201375761-83865001e31c", partnerId: "prokriti", stock: 80, badge: "Organic" },
  { id: "soy-candle", name: "Soy wax candle", category: "zero-waste", description: "A clean-burning candle in a glass you can refill or reuse. About 40 hours of light.", price: 480, unit: "220 g", photo: "1603006905003-be475563bc59", partnerId: "bamboo-bd", stock: 50, badge: "Refillable" },
  { id: "spice-box", name: "Stone-ground spice box", category: "food", description: "Turmeric, chilli, coriander, cumin and garam masala, sun-dried and stone-ground.", price: 450, unit: "5 × 100 g", photo: "1596040033229-a9821ebd058d", partnerId: "prokriti", stock: 70, badge: "No additives" },
  { id: "stoneware-plates", name: "Stoneware dinner plates", category: "home", description: "Hand-shaped plates with a soft blue glaze. Each one is slightly different.", price: 1100, unit: "Set of 4", photo: "1578749556568-bc2c40e68b61", partnerId: "mati", stock: 20, badge: "Handmade" },
  { id: "mustard-oil", name: "Cold-pressed mustard oil", category: "food", description: "Pressed in a wooden ghani at low temperature and bottled in glass.", price: 420, unit: "1 litre", photo: "1474979266404-7eaacbcd87c5", partnerId: "prokriti", stock: 65, badge: "Cold-pressed" },
];

export const SEED_PRODUCTS: Product[] = PRODUCTS.map((p) => ({ ...p, partnerName: P[p.partnerId] }));

export const SEED_VOUCHERS: Omit<Voucher, "claimed" | "used">[] = [
  { code: "PROKRITI10", partnerId: "prokriti", partnerName: P.prokriti, title: "10% off organic groceries", percent: 10, minSpend: 300, maxDiscount: null, coinCost: 0, inStore: true },
  { code: "BAMBOO20", partnerId: "bamboo-bd", partnerName: P["bamboo-bd"], title: "20% off zero-waste swaps", percent: 20, minSpend: 0, maxDiscount: 250, coinCost: 80, inStore: true },
  { code: "MATI15", partnerId: "mati", partnerName: P.mati, title: "15% off pottery and plants", percent: 15, minSpend: 800, maxDiscount: 300, coinCost: 50, inStore: true },
  { code: "WELCOME5", partnerId: null, partnerName: "EcoPulse Shop", title: "5% off your whole basket", percent: 5, minSpend: 0, maxDiscount: 100, coinCost: 0, inStore: false },
];
