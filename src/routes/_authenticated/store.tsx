import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { AppHeader } from "@/components/AppHeader";
import { PersonAvatar } from "@/components/Avatar";
import { money, type GiftProduct } from "@/components/OrderGiftSheet";
import { useCart } from "@/lib/cart";
import { birthdayLabel, displayName, type Profile } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/store")({
  head: () => ({
    meta: [
      { title: "Gift store — Birthday Circle" },
      {
        name: "description",
        content: "Browse physical birthday gifts, match them to a friend's wishlist and ship them.",
      },
      { property: "og:title", content: "Gift store — Birthday Circle" },
      {
        property: "og:description",
        content: "Browse physical birthday gifts and ship them straight to a friend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { to?: string } =>
    typeof search["to"] === "string" ? { to: search["to"] } : {},
  component: StorePage,
});

function StorePage() {
  const { to } = Route.useSearch();
  const { user } = useSession();
  const { add, count, totalCents } = useCart();
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [wishFilter, setWishFilter] = useState(false);
  const [cat, setCat] = useState("all");
  const [term, setTerm] = useState("");

  const { data: products } = useQuery({
    queryKey: ["gift-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_products")
        .select("id, name, description, emoji, price_cents, currency, category")
        .eq("active", true)
        .order("price_cents", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GiftProduct[];
    },
  });

  const { data: people } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, birth_date")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const others = useMemo(
    () => (people ?? []).filter((p) => p.id !== user?.id),
    [people, user?.id],
  );
  const fromSearch = to ? others.find((p) => p.username === to) : undefined;
  const recipient = others.find((p) => p.id === recipientId) ?? fromSearch ?? null;

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist", recipient?.id],
    enabled: !!recipient?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, title, url")
        .eq("user_id", recipient!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const wishMatch = (p: GiftProduct) =>
    (wishlist ?? []).find((w) => {
      const t = w.title.toLowerCase();
      const n = p.name.toLowerCase();
      return t.includes(n) || n.includes(t.split(" ")[0]!);
    }) ?? null;

  const categories = useMemo(
    () => ["all", ...new Set((products ?? []).map((p) => p.category ?? "other"))],
    [products],
  );
  const q = term.trim().toLowerCase();
  const shown = (products ?? [])
    .filter((p) => !wishFilter || wishMatch(p))
    .filter((p) => cat === "all" || (p.category ?? "other") === cat)
    .filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );

  function addToCart(p: GiftProduct) {
    if (!recipient) return;
    const match = wishMatch(p);
    add({
      productId: p.id,
      name: p.name,
      emoji: p.emoji,
      priceCents: p.price_cents,
      currency: p.currency,
      recipientId: recipient.id,
      recipientName: displayName(recipient),
      wishlistItemId: match?.id ?? null,
    });
    toast.success(`${p.name} added for ${displayName(recipient)}`);
  }

  return (
    <main className="bg-aurora min-h-screen pb-28">
      <AppHeader user={user} />

      <div className="mx-auto max-w-md px-4">
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Gift store</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Real gifts, shipped to their door. Pick who it's for, then add items to your cart.
            </p>
          </div>
          <Link
            to="/orders"
            className="mt-1 shrink-0 rounded-full bg-secondary/70 px-3 py-1.5 text-xs font-medium ring-1 ring-border"
          >
            Orders
          </Link>
        </div>

        <section className="mt-4">
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Sending to
          </p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {others.map((p) => {
              const active = recipient?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setRecipientId(p.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-2 py-1.5 ring-1 ${
                    active ? "bg-primary/15 ring-primary/40" : "bg-card ring-border"
                  }`}
                >
                  <PersonAvatar profile={p} size="sm" />
                  <span className="pr-1 text-xs font-medium">{displayName(p)}</span>
                </button>
              );
            })}
            {others.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No one else in the circle yet — invite a friend.
              </p>
            )}
          </div>
        </section>

        {recipient && (
          <section className="glass mt-4 rounded-2xl p-3 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                <span className="font-semibold">{displayName(recipient)}</span>
                {recipient.birth_date && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {birthdayLabel(recipient.birth_date)}
                  </span>
                )}
              </p>
              {recipient.username && (
                <Link
                  to="/u/$username"
                  params={{ username: recipient.username }}
                  className="text-xs text-ice underline"
                >
                  Profile
                </Link>
              )}
            </div>
            <p className="mt-2 font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
              Their wishlist
            </p>
            <ul className="mt-1 space-y-1">
              {(wishlist ?? []).map((w) => (
                <li key={w.id} className="text-sm text-muted-foreground">
                  · {w.title}
                </li>
              ))}
              {wishlist?.length === 0 && (
                <li className="text-sm text-muted-foreground">Nothing listed yet.</li>
              )}
            </ul>
            {(wishlist?.length ?? 0) > 0 && (
              <button
                onClick={() => setWishFilter((v) => !v)}
                className={`mt-3 w-full rounded-xl py-2 text-xs font-medium ring-1 ${
                  wishFilter
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-secondary/60 ring-border"
                }`}
              >
                {wishFilter ? "Showing wishlist matches" : "Only show wishlist matches"}
              </button>
            )}
          </section>
        )}

        <section className="mt-5 grid grid-cols-2 gap-2">
          {shown.map((p) => {
            const match = recipient ? wishMatch(p) : null;
            return (
              <article key={p.id} className="rounded-2xl bg-card p-3 ring-1 ring-border">
                <span className="text-2xl">{p.emoji}</span>
                <h2 className="mt-2 text-sm leading-tight font-semibold">{p.name}</h2>
                {match && (
                  <p className="mt-1 text-[10px] font-medium text-mint">On their wishlist</p>
                )}
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-sm text-primary">
                    {money(p.price_cents, p.currency)}
                  </span>
                  <button
                    onClick={() => addToCart(p)}
                    disabled={!recipient}
                    className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </article>
            );
          })}
          {shown.length === 0 && (
            <p className="col-span-2 rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
              No items match their wishlist — turn the filter off to see everything.
            </p>
          )}
        </section>
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
          <Link
            to="/checkout"
            className="mx-auto flex max-w-md items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            <span>
              Checkout · {count} item{count > 1 ? "s" : ""}
            </span>
            <span className="font-mono">{money(totalCents)}</span>
          </Link>
        </div>
      )}
    </main>
  );
}
