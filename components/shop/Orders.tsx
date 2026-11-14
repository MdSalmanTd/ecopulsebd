"use client";

import Link from "next/link";
import { useState } from "react";
import { cancelOrder, payOrder, useOrders } from "@/lib/cart";
import { PAY_CHANNELS, taka, type Order, type PayChannel } from "@/lib/shop";
import { ProductPhoto } from "./parts";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function statusOf(o: Order): { label: string; tone: string } {
  if (o.status === "cancelled") return { label: "Cancelled", tone: "muted" };
  if (o.payment === "online" && !o.paid) return { label: "Waiting for payment", tone: "warn" };
  if (o.payment === "cod") return { label: "Placed · pay on delivery", tone: "ok" };
  return { label: "Placed · paid", tone: "ok" };
}

function OrderCard({ order: o }: { order: Order }) {
  const [channel, setChannel] = useState<PayChannel>("bkash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const s = statusOf(o);
  const unpaidOnline = o.status === "placed" && o.payment === "online" && !o.paid;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="ocard">
      <header>
        <div>
          <strong>{o.id}</strong>
          <small>{day(o.createdAt)}</small>
        </div>
        <span className={`ocard__status ocard__status--${s.tone}`}>{s.label}</span>
      </header>
      <ul className="ocard__items">
        {o.items.map((i) => (
          <li key={i.id}>
            <span className="summary__img">
              <ProductPhoto photo={i.photo} alt="" size={96} />
            </span>
            <span>
              {i.name} <small>× {i.qty}</small>
            </span>
            <b>{taka(i.price * i.qty)}</b>
          </li>
        ))}
      </ul>
      <p className="ocard__sum">
        {o.voucherDiscount > 0 && <span>Voucher {o.voucherCode} −{taka(o.voucherDiscount)}</span>}
        {o.coinsUsed > 0 && <span>🪙 {o.coinsUsed} Eco Coins used</span>}
        <span>Delivery {o.delivery ? taka(o.delivery) : "free"}</span>
        <strong>Total {o.total ? taka(o.total) : "Free"}</strong>
      </p>
      <p className="ocard__to">
        Deliver to {o.name}, {o.address} · {o.phone}
      </p>
      {error && (
        <p className="cobox__error" role="alert">
          {error}
        </p>
      )}
      {(unpaidOnline || o.canCancel) && (
        <footer>
          {unpaidOnline && (
            <>
              <select value={channel} onChange={(e) => setChannel(e.target.value as PayChannel)} aria-label="Pay with">
                {PAY_CHANNELS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button type="button" className="pill-btn pill-btn--dark pill-btn--sm" disabled={busy} onClick={() => run(() => payOrder(o.id, channel))}>
                Pay {taka(o.total)} (demo)
              </button>
            </>
          )}
          {o.canCancel && (
            <button
              type="button"
              className="pill-btn pill-btn--sm"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Cancel order ${o.id}? Your Eco Coins and voucher will be returned.`)) run(() => cancelOrder(o.id));
              }}
            >
              Cancel order
            </button>
          )}
        </footer>
      )}
    </article>
  );
}

export default function Orders() {
  const { orders, error } = useOrders();

  if (!orders) {
    return error ? (
      <div className="checkout__state" role="alert">
        <h2>We couldn’t load your orders.</h2>
        <p>Check your connection and reload the page.</p>
      </div>
    ) : (
      <p className="checkout__state">Loading your orders…</p>
    );
  }
  if (!orders.length) {
    return (
      <div className="checkout__state">
        <h2>No orders yet.</h2>
        <p>When you buy something from the shop, it will show up here.</p>
        <Link href="/shop" className="pill-btn pill-btn--dark">
          Browse the shop →
        </Link>
      </div>
    );
  }
  return (
    <div className="olist">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} />
      ))}
    </div>
  );
}
