DROP POLICY IF EXISTS "Gifts are viewable by signed in users" ON public.gifts;
CREATE POLICY "Senders and recipients can view their cards"
  ON public.gifts FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);