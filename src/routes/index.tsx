import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { AppHeader } from "@/components/AppHeader";
import { PersonAvatar } from "@/components/Avatar";
import { SendGiftSheet } from "@/components/SendGiftSheet";
import { Confetti } from "@/components/Confetti";
import { displayName, isBirthdayToday, todayLabel, turningAge, type Profile } from "@/lib/birthday";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Birthday Circle — today's birthdays, cards and wishlists" },
      {
        name: "description",
        content:
          "See which friends have a birthday today, send them a virtual card, and share your own wishlist.",
      },
      { property: "og:title", content: "Birthday Circle — today's birthdays" },
      {
        property: "og:description",
        content:
          "See which friends have a birthday today, send them a virtual card, and share your own wishlist.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, loading } = useSession();
  const [search, setSearch] = useState("");
  const [giftTo, setGiftTo] = useState<Profile | null>(null);

  const { data: people, isLoading } = useQuery({
    queryKey: ["people"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, birth_date")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const term = search.trim().toLowerCase();
  const matches = (p: Profile) =>
    !term ||
    (p.full_name ?? "").toLowerCase().includes(term) ||
    (p.username ?? "").toLowerCase().includes(term);

  const birthdays = (people ?? []).filter((p) => isBirthdayToday(p.birth_date) && matches(p));
  const searchResults = term ? (people ?? []).filter(matches) : [];
  const [featured, ...rest] = birthdays;

  if (!loading && !user) {
    return (
      <main className="bg-aurora min-h-screen">
        <AppHeader user={null} />
        <div className="mx-auto max-w-md px-4 pt-16 pb-20 text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] text-ice/70 uppercase">
            {todayLabel()}
          </p>
          <h1 className="mt-3 text-4xl font-medium tracking-tight text-balance">
            Nobody's birthday should go unnoticed
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Share your birth date, see who's celebrating today, and send a card in seconds.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Join the circle
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-aurora min-h-screen pb-20">
      {birthdays.length > 0 && <Confetti count={14} />}
      <AppHeader user={user} />

      <div className="mx-auto max-w-md px-4">
        <div className="mt-4 flex items-baseline justify-between">
          <h1 className="text-2xl font-medium tracking-tight">Today's birthdays</h1>
          <span className="font-mono text-[11px] tracking-[0.18em] text-ice/70 uppercase">
            {todayLabel()}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2 ring-1 ring-border">
          <span className="font-mono text-primary">/</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a name or @handle"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {term ? (
          <section className="mt-4 space-y-2">
            <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              Results · {searchResults.length}
            </h2>
            {searchResults.map((p) => (
              <PersonRow key={p.id} profile={p} onGift={() => setGiftTo(p)} me={user?.id} />
            ))}
            {searchResults.length === 0 && (
              <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
                No one matches "{search}".
              </p>
            )}
          </section>
        ) : (
          <>
            {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading the circle…</p>}

            {!isLoading && birthdays.length === 0 && (
              <div className="glass mt-4 rounded-2xl p-5 ring-1 ring-border">
                <p className="text-sm">No birthdays today.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your own birth date so friends can celebrate you.
                </p>
                <Link
                  to="/settings"
                  className="mt-4 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Set my birthday
                </Link>
              </div>
            )}

            {featured && (
              <section className="glass rise mt-4 rounded-2xl p-4 ring-1 ring-border">
                <div className="flex items-center gap-3">
                  <PersonAvatar profile={featured} size="lg" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] leading-tight font-semibold">
                        {displayName(featured)}
                      </span>
                      <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/30">
                        turning {turningAge(featured.birth_date)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-ice/70">
                      @{featured.username ?? "member"}
                    </p>
                    {featured.bio && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {featured.bio}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {user?.id !== featured.id && (
                    <button
                      onClick={() => setGiftTo(featured)}
                      className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
                    >
                      Send gift
                    </button>
                  )}
                  {featured.username && (
                    <Link
                      to="/u/$username"
                      params={{ username: featured.username }}
                      className="rounded-xl bg-secondary/70 px-4 py-2.5 text-sm font-medium ring-1 ring-border"
                    >
                      View
                    </Link>
                  )}
                </div>
              </section>
            )}

            <section className="mt-3 space-y-2">
              {rest.map((p) => (
                <PersonRow key={p.id} profile={p} onGift={() => setGiftTo(p)} me={user?.id} />
              ))}
            </section>
          </>
        )}
      </div>

      {giftTo && user && (
        <SendGiftSheet recipient={giftTo} senderId={user.id} onClose={() => setGiftTo(null)} />
      )}
    </main>
  );
}

function PersonRow({
  profile,
  onGift,
  me,
}: {
  profile: Profile;
  onGift: () => void;
  me: string | undefined;
}) {
  const age = turningAge(profile.birth_date);
  return (
    <div className="rise flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-border">
      <PersonAvatar profile={profile} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{displayName(profile)}</p>
        <p className="truncate font-mono text-[10px] text-ice/60">
          @{profile.username ?? "member"}
          {age !== null && ` · ${age}`}
        </p>
      </div>
      {profile.username && (
        <Link
          to="/u/$username"
          params={{ username: profile.username }}
          className="shrink-0 rounded-lg bg-secondary/60 px-3 py-1.5 text-[13px] font-medium ring-1 ring-border"
        >
          View
        </Link>
      )}
      {me !== profile.id && (
        <button
          onClick={onGift}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground"
        >
          Gift
        </button>
      )}
    </div>
  );
}
