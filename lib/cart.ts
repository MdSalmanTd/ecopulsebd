"use client";

// The shopping cart: kept in this browser (localStorage) so it survives sign-in and page reloads.
import { useSyncExternalStore } from "react";
import { api, mutate, revalidate, useApi } from "./api-client";
import { MAX_QTY, type CartLine, type Order, type PayChannel, type Product, type ShopResponse, type Voucher } from "./shop";

const KEY = "ecopulse_cart";
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let lines: CartLine[] | null = null; // null = not read from storage yet

function read(): CartLine[] {
  if (lines) return lines;
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    lines = Array.isArray(raw)
      ? raw.filter((l): l is CartLine => typeof l?.id === "string" && Number.isInteger(l?.qty) && l.qty > 0)
      : [];
  } catch {
    lines = [];
  }
  return lines;
}

function write(next: CartLine[]): void {
  lines = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {} // private mode / storage full: the cart still works for this visit
  listeners.forEach((fn) => fn());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // Another tab changed the cart.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    lines = null;
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Sets how many of a product are in the cart (0 removes it). */
export function setQty(id: string, qty: number): void {
  const q = Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));
  const cur = read();
  const has = cur.some((l) => l.id === id);
  if (q === 0) write(cur.filter((l) => l.id !== id));
  else if (has) write(cur.map((l) => (l.id === id ? { id, qty: q } : l)));
  else write([...cur, { id, qty: q }]);
}

export function addToCart(id: string): void {
  setQty(id, (read().find((l) => l.id === id)?.qty ?? 0) + 1);
}

export function clearCart(): void {
  write([]);
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

// ---------- Shop data ----------

const SHOP = "/api/shop";
const ORDERS = "/api/shop/orders";
type OrdersResponse = { orders: Order[] };

/** A cart line joined with its product. */
export interface CartItem extends Product {
  qty: number;
}

export function useShop() {
  const { data, error, loading } = useApi<ShopResponse>(SHOP);

  async function claim(code: string): Promise<Voucher> {
    const res = await api<{ voucher: Voucher; coins: number }>(`/api/shop/vouchers/${encodeURIComponent(code)}/claim`, { method: "POST" });
    mutate<ShopResponse>(SHOP, (d) => d && { ...d, coins: res.coins, vouchers: d.vouchers.map((v) => (v.code === code ? res.voucher : v)) });
    revalidate("/api/me");
    return res.voucher;
  }

  return { shop: data, error, loading, claim };
}

/** Cart lines that still match a product on sale. */
export function cartItems(cart: CartLine[], products: Product[] | undefined): CartItem[] {
  if (!products) return [];
  return cart.flatMap((l) => {
    const p = products.find((x) => x.id === l.id);
    return p ? [{ ...p, qty: l.qty }] : [];
  });
}

export interface OrderInput {
  items: CartLine[];
  name: string;
  phone: string;
  address: string;
  payment: "cod" | "online";
  voucher: string | null;
  coins: number;
}

const afterOrderChange = () => {
  revalidate(SHOP);
  revalidate(ORDERS);
  revalidate("/api/me");
};

export async function placeOrder(input: OrderInput): Promise<Order> {
  const { order } = await api<{ order: Order }>(ORDERS, { method: "POST", json: input });
  afterOrderChange();
  return order;
}

export async function payOrder(id: string, channel: PayChannel): Promise<Order> {
  const { order } = await api<{ order: Order }>(`${ORDERS}/${id}/pay`, { method: "POST", json: { channel } });
  mutate<OrdersResponse>(ORDERS, (d) => d && { orders: d.orders.map((o) => (o.id === id ? order : o)) });
  return order;
}

export async function cancelOrder(id: string): Promise<Order> {
  const { order } = await api<{ order: Order }>(`${ORDERS}/${id}`, { method: "DELETE" });
  mutate<OrdersResponse>(ORDERS, (d) => d && { orders: d.orders.map((o) => (o.id === id ? order : o)) });
  revalidate(SHOP);
  revalidate("/api/me");
  return order;
}

export function useOrders() {
  const { data, error, loading } = useApi<OrdersResponse>(ORDERS);
  return { orders: data?.orders, error, loading };
}
