"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { api, mutate, useApi } from "@/lib/api-client";
import { useMe } from "@/lib/app-state";
import { useToast } from "@/components/app/Toast";
import { ProductPhoto } from "@/components/shop/parts";
import { checkImageFile, dataUrlToBlob, shrinkImage } from "@/lib/image";
import {
  LOW_STOCK,
  MAX_COIN_COST,
  MAX_PRICE,
  MAX_STOCK,
  SHOP_CATEGORIES,
  VOUCHER_PERCENT,
  taka,
  type PartnerDashboard,
  type PartnerOrder,
  type PartnerProduct,
  type PartnerVoucher,
} from "@/lib/shop";

const KEY = "/api/partner";

const PAYMENT: Record<PartnerOrder["payment"], string> = { cod: "Cash on delivery", online: "Online", coins: "Eco Coins" };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong. Please try again.");

/** Every partner endpoint answers with the fresh dashboard, so one call keeps the whole page in sync. */
async function send(url: string, opts: Parameters<typeof api>[1]): Promise<void> {
  const fresh = await api<PartnerDashboard>(url, opts);
  mutate<PartnerDashboard>(KEY, () => fresh);
}

export default function PartnerBoard() {
  const { user, loaded } = useMe();
  const isPartner = user?.role === "partner";
  const { data, error, loading } = useApi<PartnerDashboard>(isPartner && KEY);
  const [dialog, setDialog] = useState<"product" | "voucher" | null>(null);

  if (!loaded) return <p className="loading">Loading…</p>;
  if (!isPartner) {
    return (
      <section className="partner">
        <div className="card empty">
          <h2>This page is for Eco Shop partners</h2>
          <p>
            Partner accounts manage a store’s products and orders. Want to sell in the Eco Shop?{" "}
            <Link href="/partners">Apply to become a partner</Link>.
          </p>
        </div>
      </section>
    );
  }
  if (error) return <p className="empty">{error.message}</p>;
  if (loading || !data) return <p className="loading">Loading your store…</p>;

  const { partner, products, vouchers, orders, stats } = data;
  return (
    <section className="partner">
      <header className="page-head">
        <span className="eyebrow eyebrow--dark">PARTNER DASHBOARD</span>
        <h1>{partner.name}</h1>
        <p className="partner__sub">
          {partner.kind} · {partner.area} · <Link href="/shop">See your store in the Eco Shop</Link>
        </p>
      </header>

      <div className="stats partner__stats">
        <div className="stat stat--dark">
          <small>SALES</small>
          <strong>{taka(stats.revenue)}</strong>
          <span>Before vouchers &amp; coins</span>
        </div>
        <div className="stat stat--cream">
          <small>UNITS SOLD</small>
          <strong>{stats.unitsSold.toLocaleString("en-US")}</strong>
          <span>Across {stats.orders.toLocaleString("en-US")} orders</span>
        </div>
        <div className="stat">
          <small>LOW STOCK</small>
          <strong>{stats.lowStock}</strong>
          <span>{stats.lowStock ? `Products with ${LOW_STOCK} or fewer left` : "Everything is well stocked"}</span>
        </div>
      </div>

      <div className="card partner__card">
        <div className="partner__head">
          <div>
            <h3>Your products</h3>
            <small className="muted">Changes show in the shop straight away</small>
          </div>
          <button type="button" className="btn btn--dark btn--sm" onClick={() => setDialog("product")}>
            + Add product
          </button>
        </div>
        {products.length ? (
          <ul className="pprod-list">
            {products.map((p) => (
              <ProductRow key={`${p.id}:${p.price}:${p.stock}:${p.active}`} product={p} />
            ))}
          </ul>
        ) : (
          <p className="empty">No products in your store yet. Add your first one to start selling.</p>
        )}
      </div>

      <div className="card partner__card">
        <div className="partner__head">
          <div>
            <h3>Your vouchers</h3>
            <small className="muted">Discounts shoppers can claim for your products</small>
          </div>
          <button type="button" className="btn btn--dark btn--sm" onClick={() => setDialog("voucher")}>
            + Add voucher
          </button>
        </div>
        {vouchers.length ? (
          <ul className="pvoucher-list">
            {vouchers.map((v) => (
              <VoucherRow key={`${v.code}:${v.active}`} voucher={v} />
            ))}
          </ul>
        ) : (
          <p className="empty">No vouchers yet. A voucher is a simple way to bring new shoppers to your store.</p>
        )}
      </div>

      <div className="card partner__card">
        <div className="card__title">
          <h3>Recent orders</h3>
          <small className="muted">Only items from your store are shown</small>
        </div>
        {orders.length ? (
          <ul className="porder-list">
            {orders.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </ul>
        ) : (
          <p className="empty">No orders yet. They’ll appear here as soon as someone buys from your store.</p>
        )}
      </div>

      {dialog === "product" && <AddProduct onClose={() => setDialog(null)} />}
      {dialog === "voucher" && <AddVoucher prefix={partner.name} onClose={() => setDialog(null)} />}
    </section>
  );
}

// ---------- Products ----------

function ProductRow({ product: p }: { product: PartnerProduct }) {
  const toast = useToast();
  const [price, setPrice] = useState(String(p.price));
  const [stock, setStock] = useState(String(p.stock));
  const [busy, setBusy] = useState(false);
  const changed = price !== String(p.price) || stock !== String(p.stock);

  async function update(active: boolean, done: string) {
    setBusy(true);
    try {
      await send(`/api/partner/products/${encodeURIComponent(p.id)}`, {
        method: "PATCH",
        json: { price: Number(price), stock: Number(stock), active },
      });
      toast(done);
    } catch (err) {
      toast(errorText(err));
      setBusy(false);
    }
  }

  function save(e: FormEvent) {
    e.preventDefault();
    void update(p.active, `“${p.name}” updated.`);
  }

  const tag = !p.active ? (
    <span className="tag tag--outline">Hidden from shop</span>
  ) : p.stock === 0 ? (
    <span className="tag tag--warn">Sold out</span>
  ) : p.stock <= LOW_STOCK ? (
    <span className="tag tag--warn">Low stock</span>
  ) : null;

  return (
    <li className={`pprod${p.active ? "" : " pprod--hidden"}`}>
      <div className="pprod__photo">
        <ProductPhoto photo={p.photo} alt="" size={96} />
      </div>
      <div className="pprod__info">
        <strong>{p.name}</strong>
        <small>
          {p.unit ? `${p.unit} · ` : ""}
          {p.sold.toLocaleString("en-US")} sold {tag}
        </small>
      </div>
      <form className="pprod__form" onSubmit={save}>
        <label>
          Price (৳)
          <input type="number" inputMode="numeric" min={1} max={MAX_PRICE} step={1} required value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label>
          Stock
          <input type="number" inputMode="numeric" min={0} max={MAX_STOCK} step={1} required value={stock} onChange={(e) => setStock(e.target.value)} />
        </label>
        <button type="submit" className="btn btn--dark btn--sm" disabled={!changed || busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          disabled={busy}
          onClick={() => update(!p.active, p.active ? `“${p.name}” is hidden from the shop.` : `“${p.name}” is back in the shop.`)}
        >
          {p.active ? "Hide" : "Show"}
        </button>
      </form>
    </li>
  );
}

function AddProduct({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) {
      setError(problem);
      e.target.value = "";
      return;
    }
    try {
      setPhoto(await shrinkImage(file, 960, 0.82));
      setError("");
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!photo) {
      setError("Add a photo of the product.");
      return;
    }
    const form = new FormData(e.currentTarget);
    form.set("photo", await dataUrlToBlob(photo), "product.jpg");
    setBusy(true);
    setError("");
    try {
      await send("/api/partner/products", { method: "POST", form });
      toast(`“${String(form.get("name"))}” is now in the shop.`);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="Add a product" onClose={onClose} onSubmit={submit} busy={busy} submitLabel="Add to shop" error={error}>
      <label>
        Photo
        <span className="pphoto-pick">
          {photo ? <img src={photo} alt="Selected product photo" /> : <span>JPG or PNG</span>}
          <input type="file" accept="image/jpeg,image/png" onChange={pick} />
        </span>
      </label>
      <label>
        Product name
        <input name="name" required minLength={2} maxLength={80} placeholder="Bamboo cutlery set" />
      </label>
      <label>
        Category
        <select name="category" required defaultValue="">
          <option value="" disabled>
            Choose a category
          </option>
          {SHOP_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Description
        <textarea name="description" required minLength={10} maxLength={400} rows={3} placeholder="What is it made of, and why is it a greener choice?" />
      </label>
      <div className="pform-row">
        <label>
          Price (৳)
          <input name="price" type="number" inputMode="numeric" required min={1} max={MAX_PRICE} step={1} />
        </label>
        <label>
          Stock
          <input name="stock" type="number" inputMode="numeric" required min={0} max={MAX_STOCK} step={1} />
        </label>
      </div>
      <div className="pform-row">
        <label>
          Size or unit <small>(optional)</small>
          <input name="unit" maxLength={40} placeholder="Set of 4" />
        </label>
        <label>
          Label <small>(optional)</small>
          <input name="badge" maxLength={24} placeholder="Plastic-free" />
        </label>
      </div>
    </Modal>
  );
}

// ---------- Vouchers ----------

function VoucherRow({ voucher: v }: { voucher: PartnerVoucher }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await send(`/api/partner/vouchers/${encodeURIComponent(v.code)}`, { method: "PATCH", json: { active: !v.active } });
      toast(v.active ? `${v.code} is turned off.` : `${v.code} is live again.`);
    } catch (err) {
      toast(errorText(err));
      setBusy(false);
    }
  }

  const rules = [
    v.minSpend ? `min. spend ${taka(v.minSpend)}` : "no minimum",
    v.maxDiscount ? `up to ${taka(v.maxDiscount)} off` : null,
    v.coinCost ? `${v.coinCost} Eco Coins to claim` : "free to claim",
    v.inStore ? "also in store" : null,
  ].filter(Boolean);

  return (
    <li className={`pvoucher${v.active ? "" : " pvoucher--off"}`}>
      <span className="pvoucher__pct">{v.percent}%</span>
      <div className="pvoucher__info">
        <strong>
          {v.title} <code>{v.code}</code>
        </strong>
        <small>{rules.join(" · ")}</small>
        <small>
          {v.claims} claimed · {v.uses} used {v.active ? null : <span className="tag tag--outline">Off</span>}
        </small>
      </div>
      <button type="button" className="btn btn--outline btn--sm" disabled={busy} onClick={toggle}>
        {v.active ? "Turn off" : "Turn on"}
      </button>
    </li>
  );
}

function AddVoucher({ prefix, onClose }: { prefix: string; onClose: () => void }) {
  const toast = useToast();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const suggested = prefix.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const val = (k: string) => String(f.get(k) ?? "");
    setBusy(true);
    setError("");
    try {
      await send("/api/partner/vouchers", {
        method: "POST",
        json: {
          code: val("code"),
          title: val("title"),
          percent: val("percent"),
          minSpend: val("minSpend"),
          maxDiscount: val("maxDiscount"),
          coinCost: val("coinCost"),
          inStore: f.get("inStore") === "on",
        },
      });
      toast(`${val("code").toUpperCase()} is live in the shop.`);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="Add a voucher" onClose={onClose} onSubmit={submit} busy={busy} submitLabel="Create voucher" error={error}>
      <p className="pform-note">The discount applies to your products only. Shoppers claim it in the Eco Shop, then use it at checkout.</p>
      <div className="pform-row">
        <label>
          Code
          <input
            name="code"
            required
            pattern="[A-Za-z0-9]{4,16}"
            minLength={4}
            maxLength={16}
            placeholder={`${suggested || "SHOP"}25`}
            title="4–16 letters and numbers"
            style={{ textTransform: "uppercase" }}
          />
        </label>
        <label>
          Discount (%)
          <input name="percent" type="number" inputMode="numeric" required min={VOUCHER_PERCENT.min} max={VOUCHER_PERCENT.max} step={1} placeholder="15" />
        </label>
      </div>
      <label>
        Title
        <input name="title" required minLength={4} maxLength={60} placeholder="15% off zero-waste swaps" />
      </label>
      <div className="pform-row">
        <label>
          Minimum spend (৳) <small>(optional)</small>
          <input name="minSpend" type="number" inputMode="numeric" min={0} max={MAX_PRICE} step={1} placeholder="0" />
        </label>
        <label>
          Max discount (৳) <small>(optional)</small>
          <input name="maxDiscount" type="number" inputMode="numeric" min={1} max={MAX_PRICE} step={1} placeholder="No cap" />
        </label>
      </div>
      <label>
        Eco Coins to claim <small>(0 = free)</small>
        <input name="coinCost" type="number" inputMode="numeric" min={0} max={MAX_COIN_COST} step={1} placeholder="0" />
      </label>
      <label className="pform-check">
        <input name="inStore" type="checkbox" /> Also accepted at our physical shop
      </label>
    </Modal>
  );
}

// ---------- Shared dialog ----------

interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  submitLabel: string;
  error: string;
  children: ReactNode;
}

function Modal({ title, onClose, onSubmit, busy, submitLabel, error, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);

  return (
    <dialog ref={ref} className="postmodal" aria-labelledby="pdialog-title" onClick={(e) => e.target === ref.current && onClose()}>
      <form onSubmit={onSubmit}>
        <header className="postmodal__head">
          <h2 id="pdialog-title">{title}</h2>
          <button type="button" className="postmodal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="postmodal__body editprofile pform">
          {children}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="postmodal__foot">
          <button type="submit" className="postmodal__post" disabled={busy}>
            {busy ? "Saving…" : submitLabel}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

// ---------- Orders ----------

function OrderRow({ order: o }: { order: PartnerOrder }) {
  const cancelled = o.status === "cancelled";
  return (
    <li className={`porder${cancelled ? " porder--cancelled" : ""}`}>
      <div className="porder__head">
        <strong>{o.id}</strong>
        <small>{date(o.createdAt)}</small>
        <span className={`tag ${cancelled ? "tag--outline" : "tag--success"}`}>{cancelled ? "Cancelled" : "Placed"}</span>
        <span className="tag tag--outline">
          {PAYMENT[o.payment]}
          {o.payment === "online" ? (o.paid ? " · paid" : " · unpaid") : ""}
        </span>
        <b className="porder__total">{taka(o.subtotal)}</b>
      </div>
      <ul className="porder__items">
        {o.items.map((i) => (
          <li key={i.id}>
            {i.qty} × {i.name} <span>{taka(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>
      {!cancelled && (
        <details className="porder__ship">
          <summary>Delivery details</summary>
          <p>
            {o.name} · <a href={`tel:${o.phone}`}>{o.phone}</a>
            <br />
            {o.address}
          </p>
        </details>
      )}
    </li>
  );
}
