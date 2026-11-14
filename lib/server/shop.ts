import "server-only";
import { query, tx, type QueryFn, type Row } from "./db";
import { HttpError } from "./errors";
import {
  computeTotals,
  MAX_QTY,
  PARTNER_KINDS,
  PAY_CHANNELS,
  type Order,
  type OrderItem,
  type Partner,
  type PayChannel,
  type Product,
  type ShopResponse,
  type Voucher,
} from "../shop";
import type { User } from "../types";

// ---------- Catalogue ----------

const orderId = (n: number | string): string => `EP-${10000 + Number(n)}`;
const parseOrderId = (id: string): number => {
  const m = /^EP-(\d+)$/.exec(String(id));
  return m ? Number(m[1]) - 10000 : -1;
};

const toProduct = (r: Row): Product => ({
  id: r.id,
  name: r.name,
  category: r.category,
  description: r.description,
  price: r.price,
  unit: r.unit,
  photo: r.photo,
  partnerId: r.partner_id,
  partnerName: r.partner_name,
  stock: r.stock,
  badge: r.badge,
});

const toVoucher = (r: Row): Voucher => ({
  code: r.code,
  partnerId: r.partner_id,
  partnerName: r.partner_name ?? "EcoPulse Shop",
  title: r.title,
  percent: r.percent,
  minSpend: r.min_spend,
  maxDiscount: r.max_discount,
  coinCost: r.coin_cost,
  inStore: r.in_store,
  claimed: Boolean(r.claimed),
  used: Boolean(r.used),
});

const VOUCHER_SQL = `
  SELECT v.*, pr.name AS partner_name,
         (uv.user_id IS NOT NULL) AS claimed, (uv.used_order IS NOT NULL) AS used
  FROM vouchers v
  LEFT JOIN partners pr ON pr.id = v.partner_id
  LEFT JOIN user_vouchers uv ON uv.code = v.code AND uv.user_id = $1::int`;

/** Everything the shop pages need. Public: `userId` is null when signed out. */
export async function listShop(userId: number | null): Promise<ShopResponse> {
  const [products, partners, vouchers, me] = await Promise.all([
    query(
      `SELECT p.*, pr.name AS partner_name FROM products p JOIN partners pr ON pr.id = p.partner_id
       ORDER BY p.sort, p.name`,
    ),
    query<Partner>("SELECT id, name, kind, blurb, area, color FROM partners ORDER BY created_at, name"),
    query(`${VOUCHER_SQL} WHERE v.active ORDER BY v.sort, v.code`, [userId]),
    userId == null ? Promise.resolve([]) : query("SELECT eco_coins FROM users WHERE id = $1", [userId]),
  ]);
  return {
    products: products.map(toProduct),
    partners,
    vouchers: vouchers.map(toVoucher),
    coins: me[0]?.eco_coins ?? null,
  };
}

// ---------- Vouchers ----------

/** Claims a partner voucher, paying its Eco Coin cost (if any). */
export async function claimVoucher(userId: number, code: string): Promise<{ voucher: Voucher; coins: number }> {
  return tx(async (q) => {
    const [v] = await q("SELECT code, coin_cost FROM vouchers WHERE code = $1 AND active", [code]);
    if (!v) throw new HttpError(404, "Voucher not found.");
    const added = await q(
      "INSERT INTO user_vouchers (user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING code",
      [userId, v.code],
    );
    if (!added.length) throw new HttpError(409, "You already have this voucher.");
    const paid = await q(
      "UPDATE users SET eco_coins = eco_coins - $2 WHERE id = $1 AND eco_coins >= $2 RETURNING eco_coins",
      [userId, v.coin_cost],
    );
    // Throwing rolls the claim back.
    if (!paid.length) throw new HttpError(400, `You need ${v.coin_cost} Eco Coins to claim this voucher.`);
    const [row] = await q(`${VOUCHER_SQL} WHERE v.code = $2`, [userId, v.code]);
    return { voucher: toVoucher(row), coins: paid[0].eco_coins };
  });
}

// ---------- Orders ----------

function toOrder(r: Row): Order {
  const items: OrderItem[] = typeof r.items === "string" ? JSON.parse(r.items) : r.items;
  const placed = r.status === "placed";
  return {
    id: orderId(r.id),
    items,
    subtotal: r.subtotal,
    voucherCode: r.voucher_code,
    voucherDiscount: r.voucher_discount,
    coinsUsed: r.coins_used,
    delivery: r.delivery,
    total: r.total,
    payment: r.payment,
    paid: r.paid,
    payChannel: r.pay_channel,
    status: r.status,
    name: r.name,
    phone: r.phone,
    address: r.address,
    createdAt: new Date(r.created_at).toISOString(),
    // Money already taken online can't be undone from here.
    canCancel: placed && !(r.payment === "online" && r.paid),
  };
}

export async function listOrders(userId: number): Promise<Order[]> {
  const rows = await query("SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 50", [userId]);
  return rows.map(toOrder);
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Bangladeshi mobile number → 01XXXXXXXXX, or null. */
function normalisePhone(v: unknown): string | null {
  const digits = text(v).replace(/[\s()-]/g, "").replace(/^\+?88/, "");
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
}

function readLines(input: unknown): { id: string; qty: number }[] {
  if (!Array.isArray(input) || !input.length) throw new HttpError(400, "Your cart is empty.");
  if (input.length > 30) throw new HttpError(400, "That is too many different items for one order.");
  const merged = new Map<string, number>();
  for (const raw of input) {
    const id = text((raw as { id?: unknown })?.id);
    const qty = Number((raw as { qty?: unknown })?.qty);
    if (!id || !Number.isInteger(qty) || qty < 1) throw new HttpError(400, "Your cart has an invalid item.");
    merged.set(id, (merged.get(id) ?? 0) + qty);
  }
  return [...merged].map(([id, qty]) => {
    if (qty > MAX_QTY) throw new HttpError(400, `You can order up to ${MAX_QTY} of each item.`);
    return { id, qty };
  });
}

/**
 * Places an order. Prices, the voucher and the coin balance are all re-checked here in one
 * transaction — nothing the browser sends about money is trusted.
 */
export async function createOrder(user: User, input: Record<string, unknown>): Promise<{ order: Order; coins: number }> {
  const lines = readLines(input.items);
  const name = text(input.name);
  if (name.length < 2 || name.length > 80) throw new HttpError(400, "Enter the name of the person receiving the order.");
  const phone = normalisePhone(input.phone);
  if (!phone) throw new HttpError(400, "Enter a valid Bangladeshi mobile number, like 01712345678.");
  const address = text(input.address);
  if (address.length < 10 || address.length > 300) throw new HttpError(400, "Enter the full delivery address (house, road, area).");
  const wantsOnline = input.payment === "online";
  if (!wantsOnline && input.payment !== "cod") throw new HttpError(400, "Choose how you want to pay.");
  const voucherCode = text(input.voucher) || null;
  const coinsWanted = Math.max(0, Math.floor(Number(input.coins) || 0));

  return tx(async (q) => {
    // Take stock first: the UPDATE only succeeds when enough is left.
    const items: OrderItem[] = [];
    for (const l of lines) {
      const [p] = await q(
        `UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2
         RETURNING id, name, price, photo, partner_id`,
        [l.id, l.qty],
      );
      if (!p) {
        const [left] = await q("SELECT name, stock FROM products WHERE id = $1", [l.id]);
        if (!left) throw new HttpError(400, "An item in your cart is no longer sold. Remove it and try again.");
        throw new HttpError(409, left.stock ? `Only ${left.stock} of “${left.name}” left.` : `“${left.name}” is sold out.`);
      }
      items.push({ id: p.id, name: p.name, price: p.price, qty: l.qty, photo: p.photo, partnerId: p.partner_id });
    }

    let voucher: Voucher | null = null;
    if (voucherCode) {
      const [v] = await q(`${VOUCHER_SQL} WHERE v.code = $2 AND v.active`, [user.id, voucherCode]);
      if (!v || !v.claimed) throw new HttpError(400, "Claim that voucher before using it.");
      if (v.used) throw new HttpError(400, "You have already used that voucher.");
      voucher = toVoucher(v);
    }

    const [me] = await q("SELECT eco_coins FROM users WHERE id = $1 FOR UPDATE", [user.id]);
    const t = computeTotals(items, voucher, coinsWanted, me.eco_coins);
    if (voucher && t.voucherNote) throw new HttpError(400, t.voucherNote);

    const free = t.total === 0;
    const [row] = await q(
      `INSERT INTO orders (user_id, items, subtotal, voucher_code, voucher_discount, coins_used, delivery, total,
                           payment, paid, name, phone, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [user.id, JSON.stringify(items), t.subtotal, voucher?.code ?? null, t.voucherDiscount, t.coinsUsed, t.delivery, t.total,
        free ? "coins" : wantsOnline ? "online" : "cod", free, name, phone, address],
    );
    if (voucher) {
      await q("UPDATE user_vouchers SET used_order = $3 WHERE user_id = $1 AND code = $2", [user.id, voucher.code, row.id]);
    }
    const [bal] = await q("UPDATE users SET eco_coins = eco_coins - $2 WHERE id = $1 RETURNING eco_coins", [user.id, t.coinsUsed]);
    return { order: toOrder(row), coins: bal.eco_coins };
  });
}

async function ownOrder(q: QueryFn, userId: number, id: string): Promise<Row> {
  const [o] = await q("SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE", [parseOrderId(id), userId]);
  if (!o) throw new HttpError(404, "Order not found.");
  return o;
}

/**
 * Marks an online order as paid.
 * DEMO GATEWAY: no money moves. Replace this with a real gateway (SSLCommerz, bKash, …) and only
 * mark the order paid from the gateway's verified callback before taking real orders.
 */
export async function payOrder(userId: number, id: string, channel: unknown): Promise<Order> {
  if (process.env.PAYMENTS_DEMO === "false") {
    throw new HttpError(503, "Online payment isn’t connected yet. Please choose cash on delivery.");
  }
  if (!PAY_CHANNELS.some((c) => c.key === channel)) throw new HttpError(400, "Choose a payment option.");
  return tx(async (q) => {
    const o = await ownOrder(q, userId, id);
    if (o.status !== "placed" || o.payment !== "online") throw new HttpError(409, "This order can’t be paid online.");
    if (o.paid) return toOrder(o);
    const [row] = await q("UPDATE orders SET paid = true, pay_channel = $2 WHERE id = $1 RETURNING *", [o.id, channel as PayChannel]);
    return toOrder(row);
  });
}

/** Cancels an order and gives back its stock, Eco Coins and voucher. */
export async function cancelOrder(userId: number, id: string): Promise<{ order: Order; coins: number }> {
  return tx(async (q) => {
    const o = await ownOrder(q, userId, id);
    if (!toOrder(o).canCancel) throw new HttpError(409, "This order can no longer be cancelled.");
    for (const it of toOrder(o).items) {
      await q("UPDATE products SET stock = stock + $2 WHERE id = $1", [it.id, it.qty]);
    }
    await q("UPDATE user_vouchers SET used_order = NULL WHERE user_id = $1 AND used_order = $2", [userId, o.id]);
    const [bal] = await q("UPDATE users SET eco_coins = eco_coins + $2 WHERE id = $1 RETURNING eco_coins", [userId, o.coins_used]);
    const [row] = await q("UPDATE orders SET status = 'cancelled' WHERE id = $1 RETURNING *", [o.id]);
    return { order: toOrder(row), coins: bal.eco_coins };
  });
}

// ---------- Partner applications ----------

const OFFERS: readonly unknown[] = ["products", "voucher", "both"];

export async function applyPartner(input: Record<string, unknown>, userId: number | null): Promise<void> {
  const business = text(input.business);
  if (business.length < 2 || business.length > 80) throw new HttpError(400, "Enter your business name.");
  const contact = text(input.contact);
  if (contact.length < 2 || contact.length > 80) throw new HttpError(400, "Enter a contact person.");
  const email = text(input.email).toLowerCase();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email address.");
  const phone = normalisePhone(input.phone);
  if (!phone) throw new HttpError(400, "Enter a valid Bangladeshi mobile number, like 01712345678.");
  const kind = text(input.kind);
  if (!PARTNER_KINDS.includes(kind)) throw new HttpError(400, "Choose what kind of business you are.");
  if (!OFFERS.includes(input.offer)) throw new HttpError(400, "Choose how you’d like to partner.");
  let percent: number | null = null;
  if (input.offer !== "products" && input.percent !== "" && input.percent != null) {
    percent = Number(input.percent);
    if (!Number.isInteger(percent) || percent < 5 || percent > 70) throw new HttpError(400, "The voucher discount should be between 5% and 70%.");
  }
  const message = text(input.message);
  if (message.length > 600) throw new HttpError(400, "Please keep the message under 600 characters.");

  await query(
    `INSERT INTO partner_applications (user_id, business, contact, email, phone, kind, offer, percent, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [userId, business, contact, email, phone, kind, input.offer, percent, message],
  );
}
