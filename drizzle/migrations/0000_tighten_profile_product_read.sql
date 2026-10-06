DROP POLICY IF EXISTS "Profiles are viewable by signed in users" ON public.profiles;
CREATE POLICY "Own profile or completed public profiles are viewable" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR username IS NOT NULL);

DROP POLICY IF EXISTS "Products are viewable by signed in users" ON public.gift_products;
CREATE POLICY "Active products are viewable by signed in users" ON public.gift_products
  FOR SELECT TO authenticated
  USING (active = true);