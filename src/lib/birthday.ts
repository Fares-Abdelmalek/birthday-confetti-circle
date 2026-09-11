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

export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Deterministic "Sep 11" style label (avoids locale hydration mismatches). */
export function shortDate(month: number, day: number) {
  return `${MONTHS_SHORT[month - 1]} ${day}`;
}

export function todayLabel() {
  const now = new Date();
  return shortDate(now.getMonth() + 1, now.getDate());
}

export function birthdayLabel(birthDate: string | null) {
  if (!birthDate) return null;
  const [, m, d] = birthDate.split("-").map(Number);
  if (!m || !d) return null;
  return shortDate(m, d);
}

export function birthMonth(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const m = Number(birthDate.split("-")[1]);
  return m || null;
}

/** 0 = today, 1 = tomorrow, ... counting to the next occurrence. */
export function daysUntilBirthday(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const [, m, d] = birthDate.split("-").map(Number);
  if (!m || !d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next < today) next = new Date(now.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function countdownLabel(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}
