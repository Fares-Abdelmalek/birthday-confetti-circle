import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { AppHeader } from "@/components/AppHeader";
import { money } from "@/components/OrderGiftSheet";
import { ORDER_STEPS, statusLabel } from "@/lib/cart";
import { shortDate } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Gift orders — Birthday Circle" },
      {
        name: "description",
        content: "Track the birthday gifts you've sent and the ones on their way to you.",
      },
      { property: "og:title", content: "Gift orders — Birthday Circle" },
      {
        property: "og:description",
        content: "Track birthday gift orders from payment to delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  quantity: number;
  ship_to_name: string;
  city: string;
  country: string;
  message: string | null;
  created_at: string;
  card_last4: string | null;
  tracking_code: string | null;
  sender_id: string;
  recipient_id: string;
  product_id: string | null;
};

function dateLabel(iso: string) {
  const d = new Date(iso);
  return shortDate(d.getMonth() + 1, d.getDate());
}

function StatusTrack({ status }: { status: string }) {
  const idx = ORDER_STEPS.indexOf(status as (typeof ORDER_STEPS)[number]);
  if (status === "cancelled") {
    return <p className="mt-3 text-xs text-muted-foreground">Cancelled</p>;
  }
  return (
    <div className="mt-3 flex items-center gap-1">
      {ORDER_STEPS.map((step, i) => (
        <div key={step} className="flex-1">
          <div className={`h-1 rounded-full ${i <= idx ? "bg-primary" : "bg-secondary"}`} />
          <p
            className={`mt-1 text-[9px] ${i <= idx ? "text-foreground" : "text-muted-foreground"}`}
          >
            {statusLabel(step).split(" ")[0]}
          </p>
        </div>
      ))}
    </div>
  );
}

function OrdersPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"sent" | "received">("sent");

  const { data } = useQuery({
    queryKey: ["gift-orders", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("gift_orders")
        .select(
          "id, status, amount_cents, currency, quantity, ship_to_name, city, country, message, created_at, card_last4, tracking_code, sender_id, recipient_id, product_id, product_title, product_emoji, shopify_cart_id",
        )
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const orders = (rows ?? []) as OrderRow[];

      const productIds = [...new Set(orders.map((o) => o.product_id).filter(Boolean))] as string[];
      const peopleIds = [...new Set(orders.flatMap((o) => [o.sender_id, o.recipient_id]))];
      const [products, people] = await Promise.all([
        productIds.length
          ? supabase.from("gift_products").select("id, name, emoji").in("id", productIds)
          : Promise.resolve({ data: [] as { id: string; name: string; emoji: string }[] }),
        peopleIds.length
          ? supabase.from("profiles").select("id, full_name, username").in("id", peopleIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null; username: string | null }[] }),
      ]);
      const nameOf = (id: string) => {
        const p = (people.data ?? []).find((x) => x.id === id);
        return p?.full_name || p?.username || "someone";
      };
      return orders.map((o) => {
        const prod = (products.data ?? []).find((p) => p.id === o.product_id);
        return {
          ...o,
          productName: o.product_title ?? prod?.name ?? "Gift",
          emoji: o.product_emoji ?? prod?.emoji ?? "🎁",
          senderName: nameOf(o.sender_id),
          recipientName: nameOf(o.recipient_id),
        };
      });
    },
  });

  const sent = useMemo(() => (data ?? []).filter((o) => o.sender_id === user?.id), [data, user?.id]);
  const received = useMemo(
    () => (data ?? []).filter((o) => o.recipient_id === user?.id),
    [data, user?.id],
  );
  const shown = tab === "sent" ? sent : received;

  async function advance(id: string, status: string) {
    const { error } = await supabase
      .from("gift_orders")
      .update({
        status,
        ...(status === "shipped"
          ? { tracking_code: `BC-${id.slice(0, 8).toUpperCase()}` }
          : {}),
      })
      .eq("id", id);
    if (error) {
      toast.error("Couldn't update that order.");
      return;
    }
    toast.success(`Marked as ${statusLabel(status).toLowerCase()}.`);
    qc.invalidateQueries({ queryKey: ["gift-orders", user?.id] });
  }

  return (
    <main className="bg-aurora min-h-screen pb-20">
      <AppHeader user={user} />
      <div className="mx-auto max-w-md px-4">
        <h1 className="mt-4 text-2xl font-medium tracking-tight">Gift orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow each order from payment to the doorstep.
        </p>

        <div className="mt-4 flex gap-2">
          {(["sent", "received"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2 text-xs font-medium ring-1 ${
                tab === t ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border"
              }`}
            >
              {t === "sent" ? `Sent · ${sent.length}` : `Received · ${received.length}`}
            </button>
          ))}
        </div>

        <ul className="mt-4 space-y-3">
          {shown.map((o) => (
            <li key={o.id} className="rounded-2xl bg-card p-3 ring-1 ring-border">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{o.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {o.productName}
                    {o.quantity > 1 && ` ×${o.quantity}`}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {tab === "sent" ? `To ${o.recipientName}` : `From ${o.senderName}`} ·{" "}
                    {dateLabel(o.created_at)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm text-primary">
                  {money(o.amount_cents, o.currency)}
                </span>
              </div>
              {o.message && <p className="mt-2 text-xs text-muted-foreground">“{o.message}”</p>}
              <StatusTrack status={o.status} />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {statusLabel(o.status)}
                {o.card_last4 && ` · card ••${o.card_last4}`}
                {o.tracking_code && ` · ${o.tracking_code}`}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Ships to {o.ship_to_name}, {o.city}, {o.country}
              </p>
              {tab === "sent" && o.status === "paid" && (
                <button
                  onClick={() => advance(o.id, "shipped")}
                  className="mt-3 w-full rounded-xl bg-secondary/70 py-2 text-xs font-medium ring-1 ring-border"
                >
                  Mark as shipped
                </button>
              )}
              {tab === "received" && o.status === "shipped" && (
                <button
                  onClick={() => advance(o.id, "delivered")}
                  className="mt-3 w-full rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground"
                >
                  Confirm it arrived
                </button>
              )}
            </li>
          ))}
          {shown.length === 0 && (
            <li className="rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
              {tab === "sent" ? (
                <>
                  No orders yet —{" "}
                  <Link to="/store" search={{}} className="text-ice underline">
                    browse the gift store
                  </Link>
                  .
                </>
              ) : (
                "Nothing on its way to you yet."
              )}
            </li>
          )}
        </ul>
      </div>
    </main>
  );
}
