import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Birthday Circle" },
      {
        name: "description",
        content: "Join Birthday Circle to share your birthday and send friends virtual cards.",
      },
      { property: "og:title", content: "Sign in — Birthday Circle" },
      {
        property: "og:description",
        content: "Join Birthday Circle to share your birthday and send friends virtual cards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      if (!data.session) return setCheckEmail(true);
      navigate({ to: "/settings" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
      navigate({ to: "/" });
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error("Google sign-in failed.");
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <main className="bg-aurora min-h-screen px-4 pt-10 pb-16">
      <div className="mx-auto max-w-sm">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-base font-semibold text-primary-foreground">
            B
          </span>
          <span className="font-semibold tracking-tight">Birthday Circle</span>
        </Link>

        <h1 className="mt-8 text-3xl font-medium tracking-tight text-balance">
          {mode === "signup" ? "Join the circle" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Share your birthday, collect cards, and never miss a friend's day.
        </p>

        {checkEmail ? (
          <div className="glass mt-6 rounded-2xl p-4 text-sm ring-1 ring-border">
            Check your inbox to confirm your email, then come back and sign in.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                required
                className="w-full rounded-xl bg-secondary/60 px-3 py-3 text-sm ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-xl bg-secondary/60 px-3 py-3 text-sm ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full rounded-xl bg-secondary/60 px-3 py-3 text-sm ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
        )}

        <button
          onClick={google}
          className="mt-3 w-full rounded-xl bg-secondary/70 py-3 text-sm font-medium ring-1 ring-border"
        >
          Continue with Google
        </button>

        <button
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setCheckEmail(false);
          }}
          className="mt-5 w-full text-center text-xs text-muted-foreground"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </main>
  );
}
