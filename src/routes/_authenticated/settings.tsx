import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { PersonAvatar } from "@/components/Avatar";
import type { Profile } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Your profile — Birthday Circle" },
      {
        name: "description",
        content: "Set your username, avatar, bio, birth date and wishlist on Birthday Circle.",
      },
      { property: "og:title", content: "Your profile — Birthday Circle" },
      {
        property: "og:description",
        content: "Set your username, avatar, bio, birth date and wishlist on Birthday Circle.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    avatar_url: "",
    bio: "",
    birth_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [wishTitle, setWishTitle] = useState("");
  const [wishUrl, setWishUrl] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, birth_date")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, title, url")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        username: profile.username ?? "",
        full_name: profile.full_name ?? "",
        avatar_url: profile.avatar_url ?? "",
        bio: profile.bio ?? "",
        birth_date: profile.birth_date ?? "",
      });
    }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: form.username.trim().toLowerCase().replace(/^@/, "") || null,
      full_name: form.full_name.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      bio: form.bio.trim() || null,
      birth_date: form.birth_date || null,
    });
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "That username is taken." : "Couldn't save your profile.",
      );
      return;
    }
    qc.invalidateQueries();
    toast.success("Profile saved 🎉");
  }

  async function addWish(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !wishTitle.trim()) return;
    const { error } = await supabase.from("wishlist_items").insert({
      user_id: user.id,
      title: wishTitle.trim(),
      url: wishUrl.trim() || null,
    });
    if (error) {
      toast.error("Couldn't add that item.");
      return;
    }
    setWishTitle("");
    setWishUrl("");
    qc.invalidateQueries({ queryKey: ["wishlist", user.id] });
  }

  async function removeWish(id: string) {
    await supabase.from("wishlist_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["wishlist", user?.id] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const input =
    "w-full rounded-xl bg-secondary/60 px-3 py-3 text-sm ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

  return (
    <main className="bg-aurora min-h-screen pb-16">
      <div className="mx-auto max-w-md px-4 pt-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground">
            ← Today
          </Link>
          <button onClick={signOut} className="text-xs text-muted-foreground">
            Sign out
          </button>
        </div>

        <h1 className="mt-5 text-2xl font-medium tracking-tight">Your profile</h1>

        <div className="mt-4 flex items-center gap-3">
          <PersonAvatar
            profile={{
              full_name: form.full_name,
              username: form.username,
              avatar_url: form.avatar_url || null,
            }}
            size="lg"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{form.full_name || "Add your name"}</p>
            <p className="truncate font-mono text-[11px] text-ice/70">
              @{form.username || "username"}
            </p>
            {form.username && (
              <Link
                to="/u/$username"
                params={{ username: form.username }}
                className="mt-1 inline-block text-[11px] text-muted-foreground underline"
              >
                View public page
              </Link>
            )}
          </div>
        </div>

        <form onSubmit={save} className="mt-5 space-y-3">
          <input
            className={input}
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            className={input}
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <input
            className={input}
            placeholder="Avatar image link"
            value={form.avatar_url}
            onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
          />
          <textarea
            className={`${input} resize-none`}
            rows={3}
            placeholder="A line about you"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
          <label className="block">
            <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
              Birth date
            </span>
            <input
              type="date"
              className={`${input} mt-1`}
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>

        {user && <ReminderSettings userId={user.id} />}

        <section className="mt-8">
          <h2 className="text-lg font-medium tracking-tight">Wishlist</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Add links to things you'd love to receive.
          </p>
          <form onSubmit={addWish} className="mt-3 space-y-2">
            <input
              className={input}
              placeholder="Item name"
              value={wishTitle}
              onChange={(e) => setWishTitle(e.target.value)}
            />
            <input
              className={input}
              placeholder="Link (optional)"
              value={wishUrl}
              onChange={(e) => setWishUrl(e.target.value)}
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-secondary/70 py-2.5 text-sm font-medium ring-1 ring-border"
            >
              Add to wishlist
            </button>
          </form>

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
                    Link
                  </a>
                )}
                <button
                  onClick={() => removeWish(item.id)}
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
