import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReminderPrefs = { lead_weeks: number; email_enabled: boolean };

export const DEFAULT_PREFS: ReminderPrefs = { lead_weeks: 2, email_enabled: false };

export function useReminderPrefs(userId: string | undefined) {
  return useQuery({
    queryKey: ["reminder-prefs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ReminderPrefs> => {
      const { data, error } = await supabase
        .from("reminder_prefs")
        .select("lead_weeks, email_enabled")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? DEFAULT_PREFS;
    },
  });
}
