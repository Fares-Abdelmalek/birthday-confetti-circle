ALTER TABLE public.gift_orders
  ADD COLUMN IF NOT EXISTS product_title TEXT,
  ADD COLUMN IF NOT EXISTS product_emoji TEXT,
  ADD COLUMN IF NOT EXISTS shopify_variant_id TEXT,
  ADD COLUMN IF NOT EXISTS shopify_cart_id TEXT;
CREATE INDEX IF NOT EXISTS gift_orders_shopify_cart_idx ON public.gift_orders (shopify_cart_id);