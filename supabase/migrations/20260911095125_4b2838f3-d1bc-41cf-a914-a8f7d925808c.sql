CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE TABLE public.gift_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  emoji text NOT NULL DEFAULT '🎁',
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  category text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_products TO authenticated;
GRANT ALL ON public.gift_products TO service_role;
ALTER TABLE public.gift_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by signed in users" ON public.gift_products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage products" ON public.gift_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER gift_products_updated_at
  BEFORE UPDATE ON public.gift_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.gift_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.gift_products(id) ON DELETE SET NULL,
  wishlist_item_id uuid REFERENCES public.wishlist_items(id) ON DELETE SET NULL,
  message text,
  ship_to_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment', 'paid', 'shipped', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gift_orders_sender_idx ON public.gift_orders (sender_id, created_at DESC);
CREATE INDEX gift_orders_recipient_idx ON public.gift_orders (recipient_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.gift_orders TO authenticated;
GRANT ALL ON public.gift_orders TO service_role;
ALTER TABLE public.gift_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders and recipients can view orders" ON public.gift_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users create orders as themselves" ON public.gift_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND auth.uid() <> recipient_id);
CREATE POLICY "Senders update their own orders" ON public.gift_orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

CREATE TRIGGER gift_orders_updated_at
  BEFORE UPDATE ON public.gift_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.gift_products (name, description, emoji, price_cents, category) VALUES
  ('Birthday flower bouquet', 'Seasonal hand-tied bouquet, delivered fresh.', '💐', 3500, 'Flowers'),
  ('Belgian chocolate box', 'Twenty-four assorted pralines in a gift box.', '🍫', 2400, 'Sweets'),
  ('Scented soy candle', 'Hand-poured candle, 40 hour burn time.', '🕯️', 1900, 'Home'),
  ('Celebration cake', 'Six-inch layer cake with a birthday message.', '🎂', 4200, 'Sweets'),
  ('Ceramic mug set', 'Two stoneware mugs in a matte glaze.', '☕', 2800, 'Home'),
  ('Cosy knit socks', 'Merino wool socks in a gift sleeve.', '🧦', 1600, 'Apparel'),
  ('Pocket notebook duo', 'Two dot-grid notebooks with a soft cover.', '📓', 2100, 'Stationery'),
  ('Plant in a pot', 'A low-maintenance houseplant in a ceramic pot.', '🪴', 3200, 'Home');