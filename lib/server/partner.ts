import "server-only";
import { randomBytes } from "node:crypto";
import { query } from "./db";
import { HttpError } from "./errors";
import { PRODUCT_COLS, toProduct } from "./shop";
import {
  LOW_STOCK,
  MAX_COIN_COST,
  MAX_PRICE,
  MAX_STOCK,
  SHOP_CATEGORIES,
  VOUCHER_PERCENT,
  type OrderItem,
  type Partner,
  type PartnerDashboard,
  type PartnerOrder,
  type PartnerProduct,
  type PartnerVoucher,
} from "../shop";
import type { User } from "../types";

const MAX_PHOTO = 2 * 1024 * 1024; // the dashboard shrinks photos before upload

/** The store this user manages, or 403 for anyone who isn't a partner. */
function partnerIdOf(user: User): string {
  if (user.role !== "partner" || !user.partner_id) throw new HttpError(403, "Only partner accounts can use the partner dashboard.");
  return user.partner_id;
}

const orderId = (n: number | string): string => `EP-${10000 + Number(n)}`;
const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const blank = (v: unknown): boolean => v == null || (typeof v === "string" && v.trim() === "");

/** A whole number within [min, max], or a 400 with `message`. */
function int(v: unknown, min: number, max: number, message: string): number {
  const n = blank(v) ? NaN : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, message);
  return n;
}

function isImage(buf: Uint8Array, type: string | null | undefined): boolean {
  if (type === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === "image/png") return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return false;
}

// ---------- Dashboard ----------

/** Products, vouchers, recent orders and sales totals for the partner's store. */
export async function getPartnerDashboard(user: User): Promise<PartnerDashboard> {
  const pid = partnerIdOf(user);
  const [partners, products, sold, totals, vouchers, orders] = await Promise.all([
    query<Partner>("SELECT id, name, kind, blurb, area, color FROM partners WHERE id = $1", [pid]),
    query(
      `SELECT ${PRODUCT_COLS} FROM products p JOIN partners pr ON pr.id = p.partner_id
       WHERE p.partner_id = $1 ORDER BY p.active DESC, p.sort, p.name`,
      [pid],
    ),
    query<{ id: string; sold: number }>(
      `SELECT i->>'id' AS id, SUM((i->>'qty')::int)::int AS sold
       FROM orders o, jsonb_array_elements(o.items) i
       WHERE o.status = 'placed' AND i->>'partnerId' = $1 GROUP BY i->>'id'`,
      [pid],
    ),
    query<{ revenue: number; units: number; orders: number }>(
      `SELECT COALESCE(SUM((i->>'price')::int * (i->>'qty')::int), 0)::int AS revenue,
              COALESCE(SUM((i->>'qty')::int), 0)::int AS units,
              COUNT(DISTINCT o.id)::int AS orders
       FROM orders o, jsonb_array_elements(o.items) i
       WHERE o.status = 'placed' AND i->>'partnerId' = $1`,
      [pid],
    ),
    query(
      `SELECT v.code, v.title, v.percent, v.min_spend, v.max_discount, v.coin_cost, v.in_store, v.active,
              (SELECT COUNT(*) FROM user_vouchers uv WHERE uv.code = v.code)::int AS claims,
              (SELECT COUNT(*) FROM user_vouchers uv WHERE uv.code = v.code AND uv.used_order IS NOT NULL)::int AS uses
       FROM vouchers v WHERE v.partner_id = $1 ORDER BY v.active DESC, v.created_at DESC, v.sort`,
      [pid],
    ),
    query(
      `SELECT id, items, status, payment, paid, name, phone, address, created_at FROM orders
       WHERE items @> $1::jsonb ORDER BY created_at DESC, id DESC LIMIT 50`,
      [JSON.stringify([{ partnerId: pid }])],
    ),
  ]);
  if (!partners[0]) throw new HttpError(404, "Your store could not be found. Please contact the EcoPulse team.");

  const soldBy = new Map(sold.map((r) => [r.id, r.sold]));
  const list: PartnerProduct[] = products.map((r) => ({ ...toProduct(r), sold: soldBy.get(r.id) ?? 0, active: r.active }));

  const voucherList: PartnerVoucher[] = vouchers.map((v) => ({
    code: v.code,
    title: v.title,
    percent: v.percent,
    minSpend: v.min_spend,
    maxDiscount: v.max_discount,
    coinCost: v.coin_cost,
    inStore: v.in_store,
    active: v.active,
    claims: v.claims,
    uses: v.uses,
  }));

  const orderList: PartnerOrder[] = orders.map((o) => {
    const all: OrderItem[] = typeof o.items === "string" ? JSON.parse(o.items) : o.items;
    const items = all.filter((i) => i.partnerId === pid);
    return {
      id: orderId(o.id),
      createdAt: new Date(o.created_at).toISOString(),
      status: o.status,
      payment: o.payment,
      paid: o.paid,
      items,
      subtotal: items.reduce((sum, i) => sum + i.price * i.qty, 0),
      name: o.name,
      phone: o.phone,
      address: o.address,
    };
  });

  const t = totals[0];
  return {
    partner: partners[0],
    products: list,
    vouchers: voucherList,
    orders: orderList,
    stats: {
      revenue: t?.revenue ?? 0,
      unitsSold: t?.units ?? 0,
      orders: t?.orders ?? 0,
      lowStock: list.filter((p) => p.active && p.stock <= LOW_STOCK).length,
    },
  };
}

// ---------- Products ----------

const priceOf = (v: unknown) =>
  int(v, 1, MAX_PRICE, `Price must be a whole number of taka between 1 and ${MAX_PRICE.toLocaleString("en-US")}.`);
const stockOf = (v: unknown) =>
  int(v, 0, MAX_STOCK, `Stock must be a whole number between 0 and ${MAX_STOCK.toLocaleString("en-US")}.`);

/** Changes the price and stock of one of the partner's own products, and optionally shows/hides it. */
export async function updatePartnerProduct(user: User, productId: string, input: Record<string, unknown>): Promise<void> {
  const pid = partnerIdOf(user);
  const price = priceOf(input.price);
  const stock = stockOf(input.stock);
  const active = typeof input.active === "boolean" ? input.active : null;
  const rows = await query(
    "UPDATE products SET price = $3, stock = $4, active = COALESCE($5::boolean, active) WHERE id = $1 AND partner_id = $2 RETURNING id",
    [productId, pid, price, stock, active],
  );
  if (!rows.length) throw new HttpError(404, "That product isn’t in your store.");
}

export interface NewProductInput {
  name: unknown;
  category: unknown;
  description: unknown;
  price: unknown;
  unit: unknown;
  stock: unknown;
  badge: unknown;
  photo: Buffer | null;
  photoType: string | null;
}

/** Adds a product to the partner's store. It appears in the shop straight away. */
export async function createPartnerProduct(user: User, input: NewProductInput): Promise<void> {
  const pid = partnerIdOf(user);
  const name = text(input.name);
  if (name.length < 2 || name.length > 80) throw new HttpError(400, "Give the product a name (2–80 characters).");
  const category = text(input.category);
  if (!SHOP_CATEGORIES.some((c) => c.key === category)) throw new HttpError(400, "Choose a category.");
  const description = text(input.description);
  if (description.length < 10 || description.length > 400) throw new HttpError(400, "Describe the product in 10–400 characters.");
  const price = priceOf(input.price);
  const stock = stockOf(input.stock);
  const unit = text(input.unit);
  if (unit.length > 40) throw new HttpError(400, "Keep the size or unit under 40 characters, like “500 g jar”.");
  const badge = text(input.badge);
  if (badge.length > 24) throw new HttpError(400, "Keep the label under 24 characters, like “Handmade”.");
  const { photo, photoType } = input;
  if (!photo) throw new HttpError(400, "Add a photo of the product.");
  if (photo.length > MAX_PHOTO) throw new HttpError(413, "That photo is too large (max 2 MB).");
  if (!isImage(photo, photoType)) throw new HttpError(415, "Photos must be JPG or PNG.");

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "product";
  const id = `${slug}-${randomBytes(3).toString("hex")}`;
  await query(
    `INSERT INTO products (id, name, category, description, price, unit, photo, partner_id, stock, badge, sort, image, image_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,(SELECT COALESCE(MAX(sort), 0) + 1 FROM products),$11,$12)`,
    [id, name, category, description, price, unit, `/api/shop/products/${id}/photo`, pid, stock, badge || null, photo, photoType],
  );
}

/** An uploaded product photo (public, like the shop itself). */
export async function productImage(id: string): Promise<{ body: Uint8Array; type: string } | null> {
  const [r] = await query<{ image: Uint8Array | null; image_type: string }>(
    "SELECT image, image_type FROM products WHERE id = $1",
    [id],
  );
  return r?.image ? { body: r.image, type: r.image_type } : null;
}

// ---------- Vouchers ----------

/** Creates a voucher for the partner's own products. It shows in the shop straight away. */
export async function createPartnerVoucher(user: User, input: Record<string, unknown>): Promise<void> {
  const pid = partnerIdOf(user);
  const code = text(input.code).toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(code)) throw new HttpError(400, "Use 4–16 letters and numbers for the code, like BAMBOO25.");
  const title = text(input.title);
  if (title.length < 4 || title.length > 60) throw new HttpError(400, "Give the voucher a short title (4–60 characters).");
  const percent = int(
    input.percent,
    VOUCHER_PERCENT.min,
    VOUCHER_PERCENT.max,
    `The discount must be between ${VOUCHER_PERCENT.min}% and ${VOUCHER_PERCENT.max}%.`,
  );
  const minSpend = blank(input.minSpend) ? 0 : int(input.minSpend, 0, MAX_PRICE, "Minimum spend must be a whole number of taka.");
  const maxDiscount = blank(input.maxDiscount) ? null : int(input.maxDiscount, 1, MAX_PRICE, "The discount cap must be a whole number of taka.");
  const coinCost = blank(input.coinCost) ? 0 : int(input.coinCost, 0, MAX_COIN_COST, `Eco Coin cost must be between 0 and ${MAX_COIN_COST}.`);
  const inStore = input.inStore === true;

  const rows = await query(
    `INSERT INTO vouchers (code, partner_id, title, percent, min_spend, max_discount, coin_cost, in_store, sort)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,(SELECT COALESCE(MAX(sort), 0) + 1 FROM vouchers))
     ON CONFLICT (code) DO NOTHING RETURNING code`,
    [code, pid, title, percent, minSpend, maxDiscount, coinCost, inStore],
  );
  if (!rows.length) throw new HttpError(409, `The code ${code} is already taken. Try another one.`);
}

/** Turns one of the partner's vouchers on or off. While off it can't be claimed or used at checkout. */
export async function setPartnerVoucherActive(user: User, code: string, input: Record<string, unknown>): Promise<void> {
  const pid = partnerIdOf(user);
  if (typeof input.active !== "boolean") throw new HttpError(400, "Say whether the voucher should be active.");
  const rows = await query("UPDATE vouchers SET active = $3 WHERE code = $1 AND partner_id = $2 RETURNING code", [
    code,
    pid,
    input.active,
  ]);
  if (!rows.length) throw new HttpError(404, "That voucher isn’t one of yours.");
}
