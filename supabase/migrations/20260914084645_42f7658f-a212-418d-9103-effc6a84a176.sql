ALTER TABLE public.gift_orders
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS order_group_id uuid,
  ADD COLUMN IF NOT EXISTS card_last4 text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_code text;

ALTER TABLE public.gift_orders DROP CONSTRAINT IF EXISTS gift_orders_status_check;
ALTER TABLE public.gift_orders
  ADD CONSTRAINT gift_orders_status_check
  CHECK (status IN ('awaiting_payment','paid','shipped','delivered','cancelled'));

ALTER TABLE public.gift_orders ADD CONSTRAINT gift_orders_quantity_check CHECK (quantity > 0);

CREATE INDEX IF NOT EXISTS gift_orders_group_idx ON public.gift_orders(order_group_id);

DROP POLICY IF EXISTS "Recipients can update their gift orders" ON public.gift_orders;
CREATE POLICY "Recipients can update their gift orders"
  ON public.gift_orders FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);