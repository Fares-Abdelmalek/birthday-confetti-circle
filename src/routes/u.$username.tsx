import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { PersonAvatar } from "@/components/Avatar";
import { AppHeader } from "@/components/AppHeader";
import { SendGiftSheet } from "@/components/SendGiftSheet";
import { Confetti } from "@/components/Confetti";
import { statusLabel } from "@/lib/cart";
import {
  cardClasses,
  cardGlyph,
  displayName,
  isBirthdayToday,
  turningAge,
  type Profile,
} from "@/lib/birthday";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Birthday Circle` },
      {
        name: "description",
        content: `See @${params.username}'s birthday, wishlist and the cards they've received on Birthday Circle.`,
      },
      { property: "og:title", content: `@${params.username} — Birthday Circle` },
      {
        property: "og:description",
        content: `See @${params.username}'s birthday, wishlist and the cards they've received.`,
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user, loading } = useSession();
  const qc = useQueryClient();
  const [giftOpen, setGiftOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-by-username", username],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, birth_date")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const { data: gifts } = useQuery({
    queryKey: ["gifts", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gifts")
        .select("id, card_style, message, created_at, sender_id")
        .eq("recipient_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const senderIds = [...new Set(rows.map((r) => r.sender_id))];
      const senders = senderIds.length
        ? ((
            await supabase
              .from("profiles")
              .select("id, full_name, username")
              .in("id", senderIds)
          ).data ?? [])
        : [];
      return rows.map((row) => ({
        ...row,
        senderName:
          senders.find((s) => s.id === row.sender_id)?.full_name ??
          senders.find((s) => s.id === row.sender_id)?.username ??
          "a friend",
      }));
    },
  });


  const { data: giftOrders } = useQuery({
    queryKey: ["profile-gift-orders", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_orders")
        .select("id, status, quantity, message, created_at, sender_id, product_id, product_title, product_emoji")
        .eq("recipient_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const productIds = [...new Set(rows.map((r) => r.product_id).filter(Boolean))] as string[];
      const senderIds = [...new Set(rows.map((r) => r.sender_id))];
      const [products, senders] = await Promise.all([
        productIds.length
          ? supabase.from("gift_products").select("id, name, emoji").in("id", productIds)
          : Promise.resolve({ data: [] as { id: string; name: string; emoji: string }[] }),
        senderIds.length
          ? supabase.from("profiles").select("id, full_name, username").in("id", senderIds)
          : Promise.resolve({
              data: [] as { id: string; full_name: string | null; username: string | null }[],
            }),
      ]);
      return rows.map((r) => {
        const p = (products.data ?? []).find((x) => x.id === r.product_id);
        const s = (senders.data ?? []).find((x) => x.id === r.sender_id);
        return {
          ...r,
          productName: r.product_title ?? p?.name ?? "Gift",
          emoji: r.product_emoji ?? p?.emoji ?? "🎁",
          senderName: s?.full_name || s?.username || "a friend",
        };
      });
    },
  });

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, title, url")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!loading && !user) {
    return (
      <main className="bg-aurora min-h-screen">
        <AppHeader user={null} />
        <div className="mx-auto max-w-md px-4 pt-20 text-center">
          <h1 className="text-2xl font-medium tracking-tight">Sign in to see @{username}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Birthday Circle profiles are visible to members.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const birthdayToday = isBirthdayToday(profile?.birth_date ?? null);

  return (
    <main className="bg-aurora min-h-screen pb-20">
      {birthdayToday && <Confetti count={18} />}
      <AppHeader user={user} />

      <div className="mx-auto max-w-md px-4">
        {isLoading && <p className="pt-16 text-center text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && !profile && (
          <div className="pt-16 text-center">
            <h1 className="text-2xl font-medium tracking-tight">No one here yet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn't find @{username} in the circle.
            </p>
          </div>
        )}

        {profile && (
          <>
            <section className="glass rise mt-5 rounded-2xl p-4 ring-1 ring-border">
              <div className="flex items-center gap-3">
                <PersonAvatar profile={profile} size="lg" />
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold tracking-tight">
                    {displayName(profile)}
                  </h1>
                  <p className="truncate font-mono text-[11px] text-ice/70">@{profile.username}</p>
                  {birthdayToday && (
                    <span className="mt-1 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/30">
                      Birthday today · turning {turningAge(profile.birth_date)}
                    </span>
                  )}
                </div>
              </div>
              {profile.bio && <p className="mt-3 text-sm text-muted-foreground">{profile.bio}</p>}
              {user && user.id !== profile.id && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setGiftOpen(true)}
                    className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
                  >
                    Send card
                  </button>
                  <Link
                    to="/store"
                    search={profile.username ? { to: profile.username } : {}}
                    className="rounded-xl bg-secondary/70 px-4 py-3 text-sm font-medium ring-1 ring-border"
                  >
                    Gift store
                  </Link>
                </div>
              )}
              {user?.id === profile.id && (
                <Link
                  to="/settings"
                  className="mt-4 block rounded-xl bg-secondary/70 py-3 text-center text-sm font-medium ring-1 ring-border"
                >
                  Edit profile & wishlist
                </Link>
              )}
            </section>

            <section className="mt-6">
              <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                Cards received · {gifts?.length ?? 0}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(gifts ?? []).map((gift) => (
                  <article
                    key={gift.id}
                    className={`rounded-xl p-3 ring-1 ring-border ${cardClasses(gift.card_style)}`}
                  >
                    <p className="text-lg leading-none">{cardGlyph(gift.card_style)}</p>
                    <p className="mt-2 text-[13px] leading-snug font-semibold">{gift.message}</p>
                    <p className="mt-2 text-[10px] opacity-70">— {gift.senderName}</p>
                  </article>
                ))}
                {gifts?.length === 0 && (
                  <p className="col-span-2 rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
                    No cards yet — be the first to send one.
                  </p>
                )}
              </div>
            </section>

            {(giftOrders?.length ?? 0) > 0 && (
              <section className="mt-6">
                <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                  Real gifts · {giftOrders?.length}
                </h2>
                <ul className="mt-3 space-y-2">
                  {(giftOrders ?? []).map((o) => (
                    <li
                      key={o.id}
                      className="flex items-start gap-3 rounded-xl bg-card p-3 ring-1 ring-border"
                    >
                      <span className="text-xl">{o.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {o.productName}
                          {o.quantity > 1 && ` ×${o.quantity}`}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          from {o.senderName}
                          {o.message && ` · “${o.message}”`}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] ring-1 ring-border">
                        {statusLabel(o.status)}
                      </span>
                    </li>
                  ))}
                </ul>
                {user?.id === profile.id && (
                  <Link to="/orders" className="mt-2 inline-block text-xs text-ice underline">
                    Track deliveries
                  </Link>
                )}
              </section>
            )}

            <section className="mt-6">
              <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                Wishlist
              </h2>
              <ul className="mt-3 space-y-2">
                {(wishlist ?? []).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-border"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="shrink-0 text-xs text-ice underline"
                      >
                        Open
                      </a>
                    )}
                  </li>
                ))}
                {wishlist?.length === 0 && (
                  <li className="rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
                    Nothing on the wishlist yet.
                  </li>
                )}
              </ul>
            </section>
          </>
        )}
      </div>

      {giftOpen && profile && user && (
        <SendGiftSheet
          recipient={profile}
          senderId={user.id}
          onClose={() => setGiftOpen(false)}
          onSent={() => qc.invalidateQueries({ queryKey: ["gifts", profile.id] })}
        />
      )}
    </main>
  );
}
