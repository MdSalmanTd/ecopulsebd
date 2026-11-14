"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { cartItems, clearCart, payOrder, placeOrder, setQty, useCart, useShop } from "@/lib/cart";
import { computeTotals, FREE_DELIVERY_FROM, PAY_CHANNELS, taka, type Order, type PayChannel } from "@/lib/shop";
import { useUserName } from "@/lib/useUser";
import { ProductPhoto, QtyStepper } from "./parts";

const useHydrated = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function Checkout() {
  const hydrated = useHydrated();
  const cart = useCart();
  const { shop, error: loadError } = useShop();
  const profileName = useUserName();

  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"cod" | "online">("cod");
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const [coins, setCoins] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);

  if (order) return <AfterOrder order={order} onPaid={setOrder} />;

  if (!hydrated || (!shop && !loadError)) return <p className="checkout__state">Loading your cart…</p>;
  if (!shop) {
    return (
      <div className="checkout__state" role="alert">
        <h2>We couldn’t load the shop.</h2>
        <p>Check your connection and reload the page. Your cart is saved.</p>
      </div>
    );
  }

  const items = cartItems(cart, shop.products);
  if (!items.length) {
    return (
      <div className="checkout__state">
        <h2>Your cart is empty.</h2>
        <p>Add a few things from the shop and come back here to check out.</p>
        <Link href="/shop" className="pill-btn pill-btn--dark">
          Browse the shop →
        </Link>
      </div>
    );
  }

  const balance = shop.coins ?? 0;
  const mine = shop.vouchers.filter((v) => v.claimed && !v.used);
  const picked = mine.find((v) => v.code === voucherCode) ?? null;
  const t = computeTotals(items, picked, coins, balance);
  const voucherApplies = picked != null && !t.voucherNote;
  const free = t.total === 0;
  const overStock = items.find((i) => i.qty > i.stock);
  const fullName = name ?? (profileName === "EcoPulse member" ? "" : profileName);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const placed = await placeOrder({
        items: items.map((i) => ({ id: i.id, qty: i.qty })),
        name: fullName,
        phone,
        address,
        payment,
        voucher: voucherApplies ? picked.code : null,
        coins: t.coinsUsed,
      });
      clearCart();
      setOrder(placed);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(message(err, "We couldn’t place the order. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="checkout" onSubmit={onSubmit}>
      <div className="checkout__main">
        <fieldset className="cobox">
          <legend>1. Delivery details</legend>
          <div className="cobox__row">
            <label>
              Full name
              <input value={fullName} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" />
            </label>
            <label>
              Mobile number
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" inputMode="tel" autoComplete="tel" placeholder="01712345678" />
            </label>
          </div>
          <label>
            Delivery address
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} required minLength={10} maxLength={300} rows={3} autoComplete="street-address" placeholder="House, road, area, city" />
          </label>
        </fieldset>

        <fieldset className="cobox">
          <legend>2. Vouchers &amp; Eco Coins</legend>
          {mine.length ? (
            <div className="copick" role="radiogroup" aria-label="Voucher">
              <label className="copick__opt">
                <input type="radio" name="voucher" checked={!picked} onChange={() => setVoucherCode(null)} />
                <span>
                  <strong>No voucher</strong>
                </span>
              </label>
              {mine.map((v) => (
                <label key={v.code} className="copick__opt">
                  <input type="radio" name="voucher" checked={picked?.code === v.code} onChange={() => setVoucherCode(v.code)} />
                  <span>
                    <strong>
                      {v.percent}% off · {v.partnerName}
                    </strong>
                    <small>{v.title}</small>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="cobox__hint">
              You have no vouchers yet. <Link href="/shop#vouchers">Claim a partner voucher</Link> to save more.
            </p>
          )}
          {picked && t.voucherNote && (
            <p className="cobox__warn" role="status">
              {t.voucherNote}
            </p>
          )}

          <div className="cocoins">
            <div className="cocoins__top">
              <label htmlFor="coins">
                Use Eco Coins <small>You have 🪙 {balance.toLocaleString("en-US")} · 1 coin = ৳1 off</small>
              </label>
              <strong>🪙 {t.coinsUsed}</strong>
            </div>
            {t.maxCoins > 0 ? (
              <>
                <input id="coins" type="range" min={0} max={t.maxCoins} value={t.coinsUsed} onChange={(e) => setCoins(Number(e.target.value))} />
                <div className="cocoins__btns">
                  <button type="button" onClick={() => setCoins(0)}>
                    None
                  </button>
                  <button type="button" onClick={() => setCoins(t.maxCoins)}>
                    Use the most I can (🪙 {t.maxCoins})
                  </button>
                </div>
              </>
            ) : (
              <p className="cobox__hint">You have no Eco Coins to spend yet. Join a mission or report a problem to earn some.</p>
            )}
          </div>
        </fieldset>

        <fieldset className="cobox">
          <legend>3. Payment</legend>
          {free ? (
            <p className="cobox__free">🎉 Your Eco Coins cover this whole order. There is nothing to pay.</p>
          ) : (
            <div className="copick" role="radiogroup" aria-label="Payment method">
              <label className="copick__opt">
                <input type="radio" name="payment" checked={payment === "cod"} onChange={() => setPayment("cod")} />
                <span>
                  <strong>💵 Cash on delivery</strong>
                  <small>Pay {taka(t.total)} to the rider when your order arrives.</small>
                </span>
              </label>
              <label className="copick__opt">
                <input type="radio" name="payment" checked={payment === "online"} onChange={() => setPayment("online")} />
                <span>
                  <strong>📱 Pay online</strong>
                  <small>bKash, Nagad or card. You pay on the next step.</small>
                </span>
              </label>
            </div>
          )}
        </fieldset>
      </div>

      <aside className="summary" aria-label="Order summary">
        <h2>Your order</h2>
        <ul className="summary__items">
          {items.map((i) => (
            <li key={i.id}>
              <span className="summary__img">
                <ProductPhoto photo={i.photo} alt="" size={96} />
              </span>
              <div>
                <strong>{i.name}</strong>
                <small>
                  {taka(i.price)} · {i.unit}
                </small>
                {i.qty > i.stock && <small className="summary__low">Only {i.stock} left</small>}
              </div>
              <QtyStepper id={i.id} qty={i.qty} max={i.stock} name={i.name} />
              <b>{taka(i.price * i.qty)}</b>
            </li>
          ))}
        </ul>
        <dl className="summary__lines">
          <div>
            <dt>Subtotal</dt>
            <dd>{taka(t.subtotal)}</dd>
          </div>
          {t.voucherDiscount > 0 && (
            <div className="is-off">
              <dt>Voucher {picked?.code}</dt>
              <dd>−{taka(t.voucherDiscount)}</dd>
            </div>
          )}
          <div>
            <dt>Delivery</dt>
            <dd>{t.delivery ? taka(t.delivery) : "Free"}</dd>
          </div>
          {t.coinsUsed > 0 && (
            <div className="is-off">
              <dt>Eco Coins (🪙 {t.coinsUsed})</dt>
              <dd>−{taka(t.coinsUsed)}</dd>
            </div>
          )}
          <div className="summary__total">
            <dt>To pay</dt>
            <dd>{free ? "Free" : taka(t.total)}</dd>
          </div>
        </dl>
        {t.delivery > 0 && <p className="summary__tip">Add {taka(FREE_DELIVERY_FROM - t.subtotal)} more for free delivery.</p>}
        {error && (
          <p className="cobox__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="pill-btn pill-btn--dark pill-btn--lg summary__go" disabled={busy || Boolean(overStock)}>
          {busy ? "Placing order…" : free ? "Get it free" : payment === "online" ? `Continue to pay ${taka(t.total)}` : `Place order · ${taka(t.total)}`}
        </button>
        <Link href="/shop" className="summary__back">
          ← Keep shopping
        </Link>
      </aside>
    </form>
  );
}

/** Shown once the order exists: the online payment step, then the confirmation. */
function AfterOrder({ order, onPaid }: { order: Order; onPaid: (o: Order) => void }) {
  const [channel, setChannel] = useState<PayChannel>("bkash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const awaitingPayment = order.payment === "online" && !order.paid;

  async function pay() {
    setBusy(true);
    setError("");
    try {
      onPaid(await payOrder(order.id, channel));
    } catch (e) {
      setError(message(e, "The payment didn’t go through. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (awaitingPayment) {
    return (
      <div className="paybox">
        <small>Order {order.id}</small>
        <h2>Pay {taka(order.total)}</h2>
        <div className="paybox__channels" role="radiogroup" aria-label="Pay with">
          {PAY_CHANNELS.map((c) => (
            <label key={c.key} className={channel === c.key ? "on" : undefined}>
              <input type="radio" name="channel" checked={channel === c.key} onChange={() => setChannel(c.key)} />
              {c.label}
            </label>
          ))}
        </div>
        <p className="paybox__demo">Demo payment: no real money is taken. A live payment gateway will replace this step.</p>
        {error && (
          <p className="cobox__error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="pill-btn pill-btn--dark pill-btn--lg" onClick={pay} disabled={busy}>
          {busy ? "Paying…" : `Pay ${taka(order.total)}`}
        </button>
        <Link href="/shop/orders" className="summary__back">
          Pay later from My orders
        </Link>
      </div>
    );
  }

  return (
    <div className="paybox paybox--done" role="status">
      <span className="paybox__tick" aria-hidden="true">✓</span>
      <small>Order {order.id}</small>
      <h2>Thank you — your order is placed.</h2>
      <p>
        {order.payment === "coins"
          ? `Paid in full with 🪙 ${order.coinsUsed} Eco Coins.`
          : order.payment === "online"
            ? `We received ${taka(order.total)}.`
            : `Please keep ${taka(order.total)} ready for the rider.`}{" "}
        We’ll call {order.phone} before delivery, usually within 2–4 days.
      </p>
      <div className="paybox__actions">
        <Link href="/shop/orders" className="pill-btn pill-btn--dark">
          View my orders
        </Link>
        <Link href="/shop" className="pill-btn">
          Keep shopping
        </Link>
      </div>
    </div>
  );
}
