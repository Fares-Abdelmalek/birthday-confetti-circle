import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CARD_STYLES, cardClasses, displayName, type Profile } from "@/lib/birthday";
import { Confetti } from "@/components/Confetti";

export function SendGiftSheet({
  recipient,
  senderId,
  onClose,
  onSent,
}: {
  recipient: Profile;
  senderId: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [style, setStyle] = useState<string>(CARD_STYLES[0].id);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  async function send() {
    const text = message.trim() || CARD_STYLES.find((c) => c.id === style)!.copy;
    setSending(true);
    const { error } = await supabase.from("gifts").insert({
      sender_id: senderId,
      recipient_id: recipient.id,
      card_style: style,
      message: text,
    });
    setSending(false);
    if (error) {
      toast.error(
        senderId === recipient.id ? "You can't send a card to yourself." : "Couldn't send the card.",
      );
      return;
    }
    setCelebrate(true);
    onSent?.();
    toast.success(`Card sent to ${displayName(recipient)} 🎉`);
    setTimeout(onClose, 1400);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {celebrate && <Confetti />}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div className="rise relative w-full max-w-md rounded-t-3xl bg-card px-5 pt-4 pb-6 ring-1 ring-border">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/40" />
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            Send a card to {displayName(recipient)}
          </h2>
          <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
            step 1/1
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {CARD_STYLES.map((card) => (
            <button
              key={card.id}
              onClick={() => setStyle(card.id)}
              className={`relative aspect-3/4 rounded-xl p-2 text-left ring-1 ring-border ${cardClasses(card.id)} ${
                style === card.id ? "ring-2 ring-foreground" : "opacity-80"
              }`}
            >
              <span className="block font-mono text-[9px] tracking-[0.12em] uppercase opacity-70">
                {card.label}
              </span>
              <span className="mt-1 block text-xl">{card.glyph}</span>
              <span className="absolute bottom-2 left-2 text-[12px] leading-tight font-semibold">
                {card.copy}
              </span>
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
            Your message
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 240))}
            rows={3}
            placeholder="Hope your day is as bright as you make ours."
            className="mt-1 w-full resize-none rounded-xl bg-secondary/60 p-3 text-sm ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </label>

        <button
          onClick={send}
          disabled={sending}
          className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send gift ✦"}
        </button>
      </div>
    </div>
  );
}
