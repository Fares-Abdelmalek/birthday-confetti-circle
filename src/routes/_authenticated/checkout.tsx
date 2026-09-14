import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { AppHeader } from "@/components/AppHeader";
import { Confetti } from "@/components/Confetti";
import { money } from "@/components/OrderGiftSheet";
import { useCart, type CartLine } from "@/lib/cart";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Birthday Circle" },
      {
        name: "description",
        content: "Review your gift cart, add a delivery address and pay for birthday gifts.",
      },
      { property: "og:title", content: "Checkout — Birthday Circle" },
      {
        property: "og:description",
        content: "Review your gift cart and send real birthday gifts to friends.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

type Address = {
  ship_to_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  message: string;
};

const emptyAddress = (name: string): Address => ({
  ship_to_name: name,
  address_line1: "",
  address_line2: "",
  city: "",
  postal_code: "",
  country: "",
  message: "",
});

const field =
  "mt-1 w-full rounded-xl bg-secondary/60 p-3 text-sm ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";
const label = "font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase";

function CheckoutPage() {
  const { user } = useSession();
  const { lines, totalCents, setQty, remove, clear } = useCart();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Record<string, Address>>({});
  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, { recipientId: string; recipientName: string; items: CartLine[] }>();
    for (const l of lines) {
      const g = map.get(l.recipientId) ?? {
        recipientId: l.recipientId,
        recipientName: l.recipientName,
        items: [],
      };
      g.items.push(l);
      map.set(l.recipientId, g);
    }
    return [...map.values()];
  }, [lines]);

  const addressFor = (recipientId: string, name: string) =>
    addresses[recipientId] ?? emptyAddress(name);

  const setAddress = (recipientId: string, name: string, key: keyof Address, value: string) =>
    setAddresses((prev) => ({
      ...prev,
      [recipientId]: { ...addressFor(recipientId, name), [key]: value },
    }));

  const digits = card.number.replace(/\D/g, "");

  async function pay() {
    if (!user) return;
    for (const g of groups) {
      const a = addressFor(g.recipientId, g.recipientName);
      if (!a.address_line1.trim() || !a.city.trim() || !a.country.trim()) {
        toast.error(`Add a delivery address for ${g.recipientName}.`);
        return;
      }
    }
    if (digits.length < 12 || !card.exp.trim() || card.cvc.trim().length < 3) {
      toast.error("Enter complete card details.");
      return;
    }

    setPaying(true);
    const groupId = crypto.randomUUID();
    const last4 = digits.slice(-4);
    const rows = groups.flatMap((g) => {
      const a = addressFor(g.recipientId, g.recipientName);
      return g.items.map((item) => ({
        sender_id: user.id,
        recipient_id: g.recipientId,
        product_id: item.productId,
        wishlist_item_id: item.wishlistItemId,
        quantity: item.qty,
        message: a.message.trim() || null,
        ship_to_name: a.ship_to_name.trim() || g.recipientName,
        address_line1: a.address_line1.trim(),
        address_line2: a.address_line2.trim() || null,
        city: a.city.trim(),
        postal_code: a.postal_code.trim(),
        country: a.country.trim(),
        amount_cents: item.priceCents * item.qty,
        currency: item.currency,
        order_group_id: groupId,
        status: "paid",
        paid_at: new Date().toISOString(),
        card_last4: last4,
      }));
    });

    const { error } = await supabase.from("gift_orders").insert(rows);
    setPaying(false);
    if (error) {
      toast.error("Payment couldn't be completed — check the details and try again.");
      return;
    }
    setDone(true);
    clear();
    qc.invalidateQueries({ queryKey: ["gift-orders", user.id] });
    toast.success("Paid — your gifts are on the way 🎁");
    setTimeout(() => navigate({ to: "/orders" }), 1600);
  }

  return (
    <main className="bg-aurora min-h-screen pb-20">
      {done && <Confetti />}
      <AppHeader user={user} />

      <div className="mx-auto max-w-md px-4">
        <h1 className="mt-4 text-2xl font-medium tracking-tight">Checkout</h1>

        {lines.length === 0 && (
          <div className="mt-6 rounded-2xl bg-card p-5 text-center ring-1 ring-border">
            <p className="text-sm text-muted-foreground">Your gift cart is empty.</p>
            <Link
              to="/store"
              search={{}}
              className="mt-4 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Browse the store
            </Link>
          </div>
        )}

        {groups.map((g) => {
          const a = addressFor(g.recipientId, g.recipientName);
          return (
            <section key={g.recipientId} className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
              <h2 className="text-sm font-semibold">For {g.recipientName}</h2>

              <ul className="mt-3 space-y-2">
                {g.items.map((item) => (
                  <li key={item.key} className="flex items-center gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{item.name}</p>
                      {item.wishlistItemId && (
                        <p className="text-[10px] text-mint">from their wishlist</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() => setQty(item.key, item.qty - 1)}
                        className="size-6 rounded-md bg-secondary/70 text-sm ring-1 ring-border"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-mono text-xs">{item.qty}</span>
                      <button
                        aria-label="Increase quantity"
                        onClick={() => setQty(item.key, item.qty + 1)}
                        className="size-6 rounded-md bg-secondary/70 text-sm ring-1 ring-border"
                      >
                        +
                      </button>
                    </div>
                    <span className="w-16 shrink-0 text-right font-mono text-xs text-primary">
                      {money(item.priceCents * item.qty, item.currency)}
                    </span>
                    <button
                      aria-label="Remove item"
                      onClick={() => remove(item.key)}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <p className="mt-4 font-mono text-[10px] tracking-[0.15em] text-ice/70 uppercase">
                Delivery address
              </p>
              <label className="mt-2 block">
                <span className={label}>Ships to</span>
                <input
                  value={a.ship_to_name}
                  onChange={(e) =>
                    setAddress(g.recipientId, g.recipientName, "ship_to_name", e.target.value)
                  }
                  className={field}
                />
              </label>
              <label className="mt-3 block">
                <span className={label}>Address</span>
                <input
                  value={a.address_line1}
                  placeholder="Street and number"
                  onChange={(e) =>
                    setAddress(g.recipientId, g.recipientName, "address_line1", e.target.value)
                  }
                  className={field}
                />
              </label>
              <label className="mt-3 block">
                <span className={label}>Apartment, floor (optional)</span>
                <input
                  value={a.address_line2}
                  onChange={(e) =>
                    setAddress(g.recipientId, g.recipientName, "address_line2", e.target.value)
                  }
                  className={field}
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className={label}>City</span>
                  <input
                    value={a.city}
                    onChange={(e) =>
                      setAddress(g.recipientId, g.recipientName, "city", e.target.value)
                    }
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className={label}>Postal code</span>
                  <input
                    value={a.postal_code}
                    onChange={(e) =>
                      setAddress(g.recipientId, g.recipientName, "postal_code", e.target.value)
                    }
                    className={field}
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className={label}>Country</span>
                <input
                  value={a.country}
                  onChange={(e) =>
                    setAddress(g.recipientId, g.recipientName, "country", e.target.value)
                  }
                  className={field}
                />
              </label>
              <label className="mt-3 block">
                <span className={label}>Gift note (optional)</span>
                <textarea
                  value={a.message}
                  rows={2}
                  placeholder="Happy birthday — enjoy!"
                  onChange={(e) =>
                    setAddress(
                      g.recipientId,
                      g.recipientName,
                      "message",
                      e.target.value.slice(0, 240),
                    )
                  }
                  className={`${field} resize-none`}
                />
              </label>
            </section>
          );
        })}

        {lines.length > 0 && (
          <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
            <h2 className="text-sm font-semibold">Payment</h2>
            <label className="mt-3 block">
              <span className={label}>Card number</span>
              <input
                value={card.number}
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                onChange={(e) => setCard((c) => ({ ...c, number: e.target.value.slice(0, 23) }))}
                className={field}
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className={label}>Expiry</span>
                <input
                  value={card.exp}
                  placeholder="MM/YY"
                  onChange={(e) => setCard((c) => ({ ...c, exp: e.target.value.slice(0, 5) }))}
                  className={field}
                />
              </label>
              <label className="block">
                <span className={label}>CVC</span>
                <input
                  value={card.cvc}
                  inputMode="numeric"
                  placeholder="123"
                  onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value.slice(0, 4) }))}
                  className={field}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm ring-1 ring-border">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono text-primary">
                {money(totalCents, lines[0]?.currency ?? "usd")}
              </span>
            </div>

            <button
              onClick={pay}
              disabled={paying}
              className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {paying ? "Processing…" : `Pay ${money(totalCents, lines[0]?.currency ?? "usd")}`}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Live card processing isn't switched on yet, so payments run in test mode — orders are
              created and tracked as paid.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
