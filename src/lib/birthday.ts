export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  birth_date: string | null;
};

export const CARD_STYLES = [
  { id: "accent", label: "Ember", glyph: "✦", copy: "Happy B-day!" },
  { id: "ice", label: "Ice", glyph: "❄", copy: "So glad you exist" },
  { id: "mint", label: "Mint", glyph: "✧", copy: "Cheers to you" },
] as const;

export type CardStyleId = (typeof CARD_STYLES)[number]["id"];

export function cardClasses(style: string) {
  switch (style) {
    case "ice":
      return "bg-ice text-background";
    case "mint":
      return "bg-mint text-background";
    default:
      return "bg-primary text-primary-foreground";
  }
}

export function cardGlyph(style: string) {
  return CARD_STYLES.find((c) => c.id === style)?.glyph ?? "✦";
}

/** Age the person turns today (or on their next birthday). */
export function turningAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  const passed = now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  if (!passed) age -= 0;
  return age;
}

export function isBirthdayToday(birthDate: string | null): boolean {
  if (!birthDate) return false;
  const [, m, d] = birthDate.split("-").map(Number);
  const now = new Date();
  return now.getMonth() + 1 === m && now.getDate() === d;
}

export function displayName(p: Pick<Profile, "full_name" | "username">) {
  return p.full_name || p.username || "Someone";
}

export function initials(p: Pick<Profile, "full_name" | "username">) {
  const name = displayName(p);
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function todayLabel() {
  return new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
