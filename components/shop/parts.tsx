"use client";

// Building blocks shared by the home page shop section, the shop page and checkout.
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { addToCart, cartItems, setQty, useCart, useShop } from "@/lib/cart";
import { MAX_QTY, taka, type Partner, type Product, type Voucher } from "@/lib/shop";
import { unsplash } from "@/components/site/Photo";
import { useSignedIn } from "@/lib/useUser";

export function ProductPhoto({ photo, alt, size = 480 }: { photo: string; alt: string; size?: number }) {
  return (
    <img
      src={unsplash(photo, size, size)}
      srcSet={`${unsplash(photo, size, size)} 1x, ${unsplash(photo, size * 2, size * 2)} 2x`}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

export function QtyStepper({ id, qty, max, name }: { id: string; qty: number; max: number; name: string }) {
  return (
    <div className="qty" role="group" aria-label={`Quantity of ${name}`}>
      <button type="button" onClick={() => setQty(id, qty - 1)} aria-label={qty === 1 ? `Remove ${name}` : "One fewer"}>
        −
      </button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={() => setQty(id, qty + 1)} disabled={qty >= Math.min(max, MAX_QTY)} aria-label="One more">
        +
      </button>
    </div>
  );
}

/** `coins` is the viewer's balance (null when signed out) — used for the "free with coins" hint. */
export function ProductCard({ product: p, coins }: { product: Product; coins: number | null }) {
  const cart = useCart();
  const qty = cart.find((l) => l.id === p.id)?.qty ?? 0;
  const soldOut = p.stock <= 0;

  return (
    <article className={`pcard${soldOut ? " is-out" : ""}`}>
      <div className="pcard__img">
        <ProductPhoto photo={p.photo} alt={p.name} />
        {p.badge && <span className="pcard__badge">{p.badge}</span>}
      </div>
      <div className="pcard__body">
        <small className="pcard__by">{p.partnerName}</small>
        <h3>{p.name}</h3>
        <p className="pcard__desc">{p.description}</p>
        <div className="pcard__foot">
          <div className="pcard__price">
            <strong>{taka(p.price)}</strong>
            <small>{p.unit}</small>
          </div>
          {soldOut ? (
            <span className="pcard__out">Sold out</span>
          ) : qty > 0 ? (
            <QtyStepper id={p.id} qty={qty} max={p.stock} name={p.name} />
          ) : (
            <button type="button" className="pill-btn pill-btn--dark pill-btn--sm" onClick={() => addToCart(p.id)} aria-label={`Add ${p.name} to cart`}>
              Add to cart
            </button>
          )}
        </div>
        {!soldOut && coins != null && coins >= p.price && <small className="pcard__coins">🪙 You can get this free with your Eco Coins</small>}
      </div>
    </article>
  );
}

export function VoucherCard({ voucher: v, coins }: { voucher: Voucher; coins: number | null }) {
  const { claim } = useShop();
  const signedIn = useSignedIn();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const short = !v.claimed && coins != null && coins < v.coinCost;

  const terms = [
    v.minSpend > 0 ? `Min. spend ${taka(v.minSpend)}` : null,
    v.maxDiscount != null ? `Up to ${taka(v.maxDiscount)} off` : null,
    v.inStore ? "Online & in store" : "Online only",
  ].filter(Boolean);

  async function onClaim() {
    setBusy(true);
    setError("");
    try {
      await claim(v.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t claim the voucher.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`vcard${v.used ? " is-used" : ""}`}>
      <div className="vcard__pct">
        <strong>{v.percent}%</strong>
        <span>OFF</span>
      </div>
      <div className="vcard__body">
        <small>{v.partnerName}</small>
        <h3>{v.title}</h3>
        <p>{terms.join(" · ")}</p>
        {v.claimed ? (
          <div className="vcard__code">
            <code>{v.code}</code>
            <span>{v.used ? "Used" : v.inStore ? "Show this code in store, or pick it at checkout" : "Pick it at checkout"}</span>
          </div>
        ) : signedIn ? (
          <button type="button" className="pill-btn pill-btn--sm" onClick={onClaim} disabled={busy || short}>
            {busy ? "Claiming…" : v.coinCost ? `Claim for 🪙 ${v.coinCost}` : "Claim free"}
          </button>
        ) : (
          <a className="pill-btn pill-btn--sm" href="/sign-in?next=%2Fshop%23vouchers">
            Sign in to claim{v.coinCost ? ` · 🪙 ${v.coinCost}` : ""}
          </a>
        )}
        {short && <small className="vcard__note">You need {v.coinCost - (coins ?? 0)} more Eco Coins.</small>}
        {error && (
          <small className="vcard__note vcard__note--err" role="alert">
            {error}
          </small>
        )}
      </div>
    </article>
  );
}

export function PartnerChip({ partner: p }: { partner: Partner }) {
  return (
    <div className="pchip">
      <span className="pchip__logo" style={{ "--c": p.color } as CSSProperties} aria-hidden="true">
        {p.name[0]}
      </span>
      <div>
        <strong>{p.name}</strong>
        <small>
          {p.kind} · {p.area}
        </small>
      </div>
    </div>
  );
}

/** Floating "cart" pill shown while there is something in the cart. */
export function CartBar() {
  const cart = useCart();
  const { shop } = useShop();
  const items = cartItems(cart, shop?.products);
  const count = items.reduce((n, i) => n + i.qty, 0);
  if (!count) return null;
  const sum = items.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <Link href="/shop/checkout" className="cartbar">
      <span className="cartbar__count">{count}</span>
      <span>
        {count === 1 ? "1 item" : `${count} items`} · {taka(sum)}
      </span>
      <b>Checkout →</b>
    </Link>
  );
}
