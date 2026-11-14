import Link from "next/link";
import Orders from "@/components/shop/Orders";

export const metadata = { title: "My orders" };

export default function OrdersPage() {
  return (
    <section className="wrap shoppage">
      <header className="shoppage__head shoppage__head--row">
        <div>
          <h1>My orders</h1>
          <p>Everything you have bought from the Eco Shop.</p>
        </div>
        <Link href="/shop" className="pill-btn">
          Back to the shop
        </Link>
      </header>
      <Orders />
    </section>
  );
}
