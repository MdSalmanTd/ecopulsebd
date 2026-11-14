"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useShop } from "@/lib/cart";
import { DELIVERY_FEE, FREE_DELIVERY_FROM, SEED_PARTNERS, SEED_PRODUCTS, SHOP_CATEGORIES, taka, type ShopCategory } from "@/lib/shop";
import { useSignedIn } from "@/lib/useUser";
import { CartBar, PartnerChip, ProductCard, VoucherCard } from "./parts";

type Sort = "featured" | "low" | "high";

export default function ShopBoard() {
  const { shop, error } = useShop();
  const signedIn = useSignedIn();
  const [cat, setCat] = useState<ShopCategory | "all">("all");
  const [partner, setPartner] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("featured");

  // The starter catalogue stands in until the live one (with stock) has loaded.
  const products = shop?.products ?? SEED_PRODUCTS;
  const partners = shop?.partners ?? SEED_PARTNERS;
  const coins = shop?.coins ?? null;

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter(
      (p) =>
        (cat === "all" || p.category === cat) &&
        (partner === "all" || p.partnerId === partner) &&
        (!q || `${p.name} ${p.description} ${p.partnerName}`.toLowerCase().includes(q)),
    );
    if (sort === "low") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, cat, partner, search, sort]);

  const filtered = cat !== "all" || partner !== "all" || search.trim() !== "";
  const reset = () => {
    setCat("all");
    setPartner("all");
    setSearch("");
  };

  return (
    <>
      <section className="shophero">
        <div className="wrap shophero__inner">
          <div>
            <p className="shophero__kicker">EcoPulse Shop</p>
            <h1>Good for you. Lighter on Bangladesh.</h1>
            <p className="shophero__lead">
              Everyday eco products from local partners. Pay with cash on delivery or online — and use the Eco Coins
              you earn from missions and reports to pay less, or nothing at all.
            </p>
            <ul className="shophero__perks">
              <li>🚚 Delivery {taka(DELIVERY_FEE)} · free over {taka(FREE_DELIVERY_FROM)}</li>
              <li>💵 Cash on delivery</li>
              <li>🪙 1 Eco Coin = ৳1 off</li>
            </ul>
          </div>
          <aside className="coinbox">
            <small>YOUR ECO COINS</small>
            {signedIn ? (
              <>
                <strong>🪙 {coins == null ? "…" : coins.toLocaleString("en-US")}</strong>
                <p>Worth {coins == null ? "…" : taka(coins)} off anything in the shop.</p>
                <Link href="/shop/orders" className="text-link">
                  My orders →
                </Link>
              </>
            ) : (
              <>
                <strong>🪙 380</strong>
                <p>New members start with 380 Eco Coins. Join missions and report problems to earn more.</p>
                <a href="/sign-in?mode=signup&next=%2Fshop" className="text-link">
                  Create a free account →
                </a>
              </>
            )}
          </aside>
        </div>
      </section>

      <section className="wrap shop">
        <div className="shop__bar">
          <div className="chips" role="group" aria-label="Category">
            <button type="button" className={cat === "all" ? "on" : undefined} aria-pressed={cat === "all"} onClick={() => setCat("all")}>
              All products
            </button>
            {SHOP_CATEGORIES.map((c) => (
              <button key={c.key} type="button" className={cat === c.key ? "on" : undefined} aria-pressed={cat === c.key} onClick={() => setCat(c.key)}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="shop__tools">
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" aria-label="Search products" />
            <select value={partner} onChange={(e) => setPartner(e.target.value)} aria-label="Partner">
              <option value="all">All partners</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </div>
        </div>

        {error && !shop && (
          <p className="shop__warn" role="alert">
            We couldn’t load live stock just now. You can still browse — prices are confirmed at checkout.
          </p>
        )}

        {shown.length ? (
          <div className="pgrid">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} coins={coins} />
            ))}
          </div>
        ) : (
          <div className="shop__empty">
            <h3>No products match that.</h3>
            <p>Try a different word or clear the filters.</p>
            <button type="button" className="pill-btn" onClick={reset}>
              Clear filters
            </button>
          </div>
        )}
        {filtered && shown.length > 0 && (
          <p className="shop__count">
            Showing {shown.length} of {products.length} products ·{" "}
            <button type="button" onClick={reset}>
              Clear filters
            </button>
          </p>
        )}
      </section>

      <section className="section section--tint" id="vouchers">
        <div className="wrap">
          <header className="shop__head">
            <h2>Partner vouchers</h2>
            <p>
              Claim a voucher, then use it at checkout here — or show the code at the partner’s own shop, like any
              discount card. Some are free; others you unlock with Eco Coins.
            </p>
          </header>
          <div className="vgrid">
            {(shop?.vouchers ?? []).map((v) => (
              <VoucherCard key={v.code} voucher={v} coins={coins} />
            ))}
          </div>
          {!shop && <p className="shop__count">Loading vouchers…</p>}
        </div>
      </section>

      <section className="section wrap">
        <header className="shop__head shop__head--row">
          <div>
            <h2>Our partners</h2>
            <p>Local shops and makers who sell through EcoPulse and give members a better price.</p>
          </div>
          <Link href="/partners" className="pill-btn pill-btn--dark">
            Be our partner →
          </Link>
        </header>
        <div className="pchips">
          {partners.map((p) => (
            <PartnerChip key={p.id} partner={p} />
          ))}
        </div>
      </section>

      <CartBar />
    </>
  );
}
