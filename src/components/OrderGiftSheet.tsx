import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { displayName, type Profile } from "@/lib/birthday";
import { Confetti } from "@/components/Confetti";

export type GiftProduct = {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  price_cents: number;
  currency: string;
  category: string | null;
};

export function money(cents: number, currency = "usd") {
  const c = currency.toLowerCase();
  if (c === "usd") return `$${(cents / 100).toFixed(2)}`;
  if (c === "eur") return `€${(cents / 100).toFixed(2)}`;
  return `${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency.toUpperCase()}`;
}

export function OrderGiftSheet({
  product,
  recipient,
  senderId,
  wishlistItemId,
  onClose,
  onOrdered,
}: {
  product: GiftProduct;
  recipient: Profile;
  senderId: string;
  wishlistItemId?: string;
  onClose: () => void;
  onOrdered?: () => void;
}) {
  const [form, setForm] = useState({
    ship_to_name: displayName(recipient),
    address_line1: "",
    address_line2: "",
    city: "",
    postal_code: "",
    country: "",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function placeOrder() {
    if (!form.address_line1.trim() || !form.city.trim() || !form.country.trim()) {
      toast.error("Please fill in the delivery address.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("gift_orders").insert({
      sender_id: senderId,
      recipient_id: recipient.id,
      product_id: product.id,
      wishlist_item_id: wishlistItemId ?? null,
      message: message.trim() || null,
      ship_to_name: form.ship_to_name.trim() || displayName(recipient),
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || null,
      city: form.city.trim(),
      postal_code: form.postal_code.trim(),
      country: form.country.trim(),
      amount_cents: product.price_cents,
      currency: product.currency,
    });
    setSaving(false);
    if (error) {
      toast.error(
        senderId === recipient.id
          ? "You can't order a gift for yourself."
          : "Couldn't place that order.",
      );
      return;
    }
    setDone(true);
    onOrdered?.();
    toast.success(`${product.name} reserved for ${displayName(recipient)} 🎁`);
    setTimeout(onClose, 1600);
  }

  const field =
    "mt-1 w-full rounded-xl bg-secondary/60 p-3 text-sm ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";
  const label = "font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {done && <Confetti />}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div className="rise relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card px-5 pt-4 pb-6 ring-1 ring-border">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/40" />

        <div className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-3 ring-1 ring-border">
          <span className="text-2xl">{product.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{product.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              For {displayName(recipient)}
              {wishlistItemId && " · from their wishlist"}
            </p>
          </div>
          <span className="shrink-0 font-mono text-sm text-primary">
            {money(product.price_cents, product.currency)}
          </span>
        </div>

        <label className="mt-4 block">
          <span className={label}>Gift note (optional)</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 240))}
            rows={2}
            placeholder="Happy birthday — enjoy!"
            className={`${field} resize-none`}
          />
        </label>

        <p className="mt-5 font-mono text-[10px] tracking-[0.15em] text-ice/70 uppercase">
          Delivery address
        </p>

        <label className="mt-2 block">
          <span className={label}>Ships to</span>
          <input value={form.ship_to_name} onChange={set("ship_to_name")} className={field} />
        </label>
        <label className="mt-3 block">
          <span className={label}>Address</span>
          <input
            value={form.address_line1}
            onChange={set("address_line1")}
            placeholder="Street and number"
            className={field}
          />
        </label>
        <label className="mt-3 block">
          <span className={label}>Apartment, floor (optional)</span>
          <input value={form.address_line2} onChange={set("address_line2")} className={field} />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className={label}>City</span>
            <input value={form.city} onChange={set("city")} className={field} />
          </label>
          <label className="block">
            <span className={label}>Postal code</span>
            <input value={form.postal_code} onChange={set("postal_code")} className={field} />
          </label>
        </div>
        <label className="mt-3 block">
          <span className={label}>Country</span>
          <input value={form.country} onChange={set("country")} className={field} />
        </label>

        <div className="mt-5 flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm ring-1 ring-border">
          <span className="text-muted-foreground">Total</span>
          <span className="font-mono text-primary">
            {money(product.price_cents, product.currency)}
          </span>
        </div>

        <button
          onClick={placeOrder}
          disabled={saving}
          className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Placing order…" : "Place order 🎁"}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Card payment isn't switched on yet — the order is saved as awaiting payment.
        </p>
      </div>
    </div>
  );
}
