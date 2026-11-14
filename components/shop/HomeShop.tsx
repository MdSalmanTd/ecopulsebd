"use client";

// The shop section on the home page: a few products, how paying works, and the partner invite.
import Link from "next/link";
import { useShop } from "@/lib/cart";
import { SEED_PRODUCTS, SEED_VOUCHERS } from "@/lib/shop";
import { ArrowRight, Kicker } from "@/components/site/ui";
import { CartBar, ProductCard } from "./parts";

const WAYS = [
  { icon: "💵", title: "Cash on delivery or online", text: "Pay the rider at your door, or pay ahead with bKash, Nagad or card." },
  { icon: "🪙", title: "Eco Coins take taka off", text: "Every coin you earn from missions and reports is ৳1 off. Enough coins and the item is free." },
  { icon: "🎟️", title: "Partner vouchers", text: "Claim 10–20% vouchers from partner shops and use them here or in their real-life store." },
];

export default function HomeShop() {
  const { shop } = useShop();
  const products = (shop?.products ?? SEED_PRODUCTS).slice(0, 4);
  const vouchers = (shop?.vouchers ?? SEED_VOUCHERS).slice(0, 3);

  return (
    <section className="section section--tint homeshop" id="shop" aria-labelledby="homeshop-title">
      <div className="wrap">
        <div className="row-head">
          <header className="shead shead--left">
            <Kicker>Eco Shop</Kicker>
            <h2 id="homeshop-title">Shop green. Pay with your impact.</h2>
            <p>Eco-friendly essentials from local partners — open to everyone, cheaper for members who take action.</p>
          </header>
          <Link href="/shop" className="pill-btn pill-btn--dark">
            Visit the shop <ArrowRight />
          </Link>
        </div>

        <div className="pgrid pgrid--4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} coins={shop?.coins ?? null} />
          ))}
        </div>

        <ul className="ways">
          {WAYS.map((w) => (
            <li key={w.title}>
              <span aria-hidden="true">{w.icon}</span>
              <div>
                <strong>{w.title}</strong>
                <p>{w.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="homeshop__split">
          <div className="deals">
            <div className="deals__head">
              <h3>This week from our partners</h3>
              <Link href="/shop#vouchers" className="text-link">
                All vouchers <ArrowRight />
              </Link>
            </div>
            <ul>
              {vouchers.map((v) => (
                <li key={v.code}>
                  <b>{v.percent}% off</b>
                  <span>
                    <strong>{v.partnerName}</strong>
                    <small>{v.coinCost ? `Unlock for 🪙 ${v.coinCost}` : "Free to claim"}{v.inStore ? " · also in store" : ""}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="partnercta">
            <Kicker>For businesses</Kicker>
            <h3>Be our partner</h3>
            <p>
              Sell your eco products in the shop, or offer members a voucher — like 10% off at your store. We bring
              you customers who care; you help them live greener.
            </p>
            <Link href="/partners" className="pill-btn pill-btn--light">
              Become a partner <ArrowRight />
            </Link>
          </div>
        </div>
      </div>
      <CartBar />
    </section>
  );
}
