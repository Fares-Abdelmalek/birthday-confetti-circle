import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { AppHeader } from "@/components/AppHeader";
import { PersonAvatar } from "@/components/Avatar";
import { OrderGiftSheet, money, type GiftProduct } from "@/components/OrderGiftSheet";
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
  const qc = useQueryClient();
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [picked, setPicked] = useState<GiftProduct | null>(null);
  const [wishFilter, setWishFilter] = useState(false);

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

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_orders")
        .select("id, status, amount_cents, currency, ship_to_name, created_at, product_id")
        .eq("sender_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const wishTitles = (wishlist ?? []).map((w) => w.title.toLowerCase());
  const matchesWish = (p: GiftProduct) =>
    wishTitles.some(
      (t) => t.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(t.split(" ")[0]!),
    );

  const shown = (products ?? []).filter((p) => !wishFilter || matchesWish(p));

  return (
    <main className="bg-aurora min-h-screen pb-20">
      <AppHeader user={user} />

      <div className="mx-auto max-w-md px-4">
        <h1 className="mt-4 text-2xl font-medium tracking-tight">Gift store</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real gifts, shipped to their door. Pick who it's for, then choose the item.
        </p>

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
                  <span className="text-muted-foreground"> · {birthdayLabel(recipient.birth_date)}</span>
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
          {shown.map((p) => (
            <article key={p.id} className="rounded-2xl bg-card p-3 ring-1 ring-border">
              <span className="text-2xl">{p.emoji}</span>
              <h2 className="mt-2 text-sm leading-tight font-semibold">{p.name}</h2>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-sm text-primary">
                  {money(p.price_cents, p.currency)}
                </span>
                <button
                  onClick={() => {
                    if (!recipient) return;
                    setPicked(p);
                  }}
                  disabled={!recipient}
                  className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </article>
          ))}
          {shown.length === 0 && (
            <p className="col-span-2 rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
              No items match their wishlist — turn the filter off to see everything.
            </p>
          )}
        </section>

        {(orders?.length ?? 0) > 0 && (
          <section className="mt-7">
            <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              My orders
            </h2>
            <ul className="mt-2 space-y-2">
              {(orders ?? []).map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between rounded-xl bg-card p-3 text-sm ring-1 ring-border"
                >
                  <span className="truncate">To {o.ship_to_name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {money(o.amount_cents, o.currency)}
                    </span>
                    <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] ring-1 ring-border">
                      {o.status.replace("_", " ")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {picked && recipient && user && (
        <OrderGiftSheet
          product={picked}
          recipient={recipient}
          senderId={user.id}
          onClose={() => setPicked(null)}
          onOrdered={() => qc.invalidateQueries({ queryKey: ["my-orders", user.id] })}
        />
      )}
    </main>
  );
}
