import Checkout from "@/components/shop/Checkout";

export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <section className="wrap shoppage">
      <header className="shoppage__head">
        <h1>Checkout</h1>
        <p>Review your order, then choose how to pay.</p>
      </header>
      <Checkout />
    </section>
  );
}
