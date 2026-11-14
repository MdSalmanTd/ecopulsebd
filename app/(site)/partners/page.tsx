import Link from "next/link";
import { PageHero, SectionHead } from "@/components/site/ui";
import Photo from "@/components/site/Photo";
import PartnerForm from "@/components/shop/PartnerForm";
import { PartnerChip } from "@/components/shop/parts";
import { SEED_PARTNERS } from "@/lib/shop";

export const metadata = {
  title: "Be our partner",
  description: "Sell eco-friendly products in the EcoPulse Shop or offer our members a voucher at your own store.",
};

const BENEFITS = [
  { title: "Reach people who care", text: "12,400+ neighbours use EcoPulse to act on their environment. They are looking for greener choices." },
  { title: "Vouchers that bring footfall", text: "Offer 10% off (or any deal you like). Members claim it in the app and show the code at your counter." },
  { title: "Sell without building a store", text: "List your products in the Eco Shop. We handle the storefront, cash on delivery and online payment." },
];

const STEPS = [
  { n: "01", title: "Apply", text: "Tell us about your business with the form below. It takes two minutes." },
  { n: "02", title: "We verify", text: "Our team checks that your products or services fit our eco standards and calls you back." },
  { n: "03", title: "Go live", text: "Your products and vouchers appear in the shop, and members start finding you." },
];

export default function PartnersPage() {
  return (
    <>
      <PageHero kicker="Partners" title="Be our partner." art={<Photo name="hands" sizes="(max-width: 900px) 100vw, 40vw" />}>
        Shops, makers, farms and brands: reach thousands of people who want to buy greener. Sell in the Eco Shop, or
        give members a voucher for your own store.
      </PageHero>

      <section className="section section--tight wrap">
        <div className="benefits">
          {BENEFITS.map((b) => (
            <article key={b.title}>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--tint">
        <div className="wrap">
          <SectionHead kicker="How it works" title="From application to first customer" />
          <ol className="psteps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span>{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section wrap partnerapply" id="apply">
        <div className="partnerapply__info">
          <h2>Apply to partner with EcoPulse</h2>
          <p>There is no fee to apply. You don’t need an EcoPulse account.</p>
          <h4>Already with us</h4>
          <div className="pchips pchips--col">
            {SEED_PARTNERS.map((p) => (
              <PartnerChip key={p.id} partner={p} />
            ))}
          </div>
          <Link href="/shop" className="text-link">
            See the Eco Shop →
          </Link>
        </div>
        <PartnerForm />
      </section>
    </>
  );
}
