import { initials, type Profile } from "@/lib/birthday";

export function PersonAvatar({
  profile,
  size = "md",
}: {
  profile: Pick<Profile, "full_name" | "username" | "avatar_url">;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "size-9 text-[11px] rounded-xl",
    md: "size-12 text-sm rounded-xl",
    lg: "size-20 text-xl rounded-2xl",
  } as const;

  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={initials(profile)}
        className={`${sizes[size]} shrink-0 object-cover ring-1 ring-border`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} grid shrink-0 place-items-center bg-cool2/60 font-semibold text-ice ring-1 ring-border`}
    >
      {initials(profile) || "✦"}
    </div>
  );
}
