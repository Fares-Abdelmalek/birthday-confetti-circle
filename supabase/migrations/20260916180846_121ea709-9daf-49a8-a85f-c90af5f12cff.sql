CREATE TABLE public.reminder_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  lead_weeks INTEGER NOT NULL DEFAULT 2,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_prefs TO authenticated;
GRANT ALL ON public.reminder_prefs TO service_role;

ALTER TABLE public.reminder_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own reminder settings"
  ON public.reminder_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER reminder_prefs_updated_at
  BEFORE UPDATE ON public.reminder_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.reminder_prefs ADD CONSTRAINT reminder_prefs_lead_weeks_range CHECK (lead_weeks BETWEEN 1 AND 8);

UPDATE public.gift_products SET active = false;

INSERT INTO public.gift_products (name, description, emoji, price_cents, currency, category, active) VALUES
('Atomic Habits — James Clear', 'The bestselling guide to building good habits and breaking bad ones. Hardcover, 320 pages.', '📘', 1899, 'usd', 'books', true),
('The Midnight Library — Matt Haig', 'A warm novel about the lives we could have lived. Paperback, 304 pages.', '📗', 1299, 'usd', 'books', true),
('Lessons in Chemistry — Bonnie Garmus', 'Sharp, funny bestseller about a 1960s chemist turned TV cook. Paperback.', '📙', 1450, 'usd', 'books', true),
('Sapiens — Yuval Noah Harari', 'A brief history of humankind, from stone age to the present. Illustrated paperback.', '📕', 1999, 'usd', 'books', true),
('LEGO Botanicals Bouquet', '756-piece buildable flower bouquet that never wilts. Ages 18+.', '💐', 5999, 'usd', 'toys', true),
('Rubik''s Speed Cube 3x3', 'Magnetic speed cube with smooth corner cutting and a display stand.', '🧩', 1699, 'usd', 'toys', true),
('Catan Board Game', 'The classic trade-and-build strategy game for 3-4 players, 60-90 minutes.', '🎲', 4499, 'usd', 'toys', true),
('Wooden Balance Stacking Set', 'Hand-finished beech blocks for steady hands and steady nerves. Ages 6+.', '🪵', 2799, 'usd', 'toys', true),
('Plush Weighted Bear', '1.5 kg weighted companion, machine-washable cover, calming by design.', '🧸', 3499, 'usd', 'toys', true),
('Bluetooth Speaker — Waterproof', 'Pocket-sized IPX7 speaker, 12-hour battery, deep bass for its size.', '🔊', 4999, 'usd', 'gadgets', true),
('Wireless Earbuds with ANC', 'Active noise cancelling, 28-hour case battery, USB-C fast charge.', '🎧', 8900, 'usd', 'gadgets', true),
('Instant Camera + Film Pack', 'Point, shoot, print. Includes 20 shots of credit-card sized film.', '📸', 7999, 'usd', 'gadgets', true),
('Smart LED Light Strip 5m', 'App and voice controlled colour strip, 16 million shades, easy peel-and-stick.', '💡', 2999, 'usd', 'gadgets', true),
('Digital Photo Keychain', 'Tiny colour screen holding 100 photos — a pocket album for someone far away.', '🔑', 2499, 'usd', 'gadgets', true),
('Mechanical Keyboard 65%', 'Hot-swappable switches, PBT keycaps, white backlight, USB-C braided cable.', '⌨️', 9900, 'usd', 'gadgets', true),
('Ceramic Pour-Over Coffee Set', 'Dripper, carafe and 50 filters for a slow, excellent morning.', '☕', 3899, 'usd', 'home', true),
('Soy Candle Trio', 'Fig, cedar and sea salt. 40-hour burn each, hand-poured in small batches.', '🕯️', 3200, 'usd', 'home', true),
('Linen Throw Blanket', 'Stonewashed linen-cotton blend, 130x170 cm, softer after every wash.', '🛋️', 6500, 'usd', 'home', true),
('Indoor Plant + Stoneware Pot', 'A low-maintenance pothos in a hand-glazed pot. Thrives on neglect.', '🪴', 3400, 'usd', 'home', true),
('Artisan Chocolate Box', '24 hand-finished truffles, single-origin cocoa, gift-wrapped.', '🍫', 2899, 'usd', 'treats', true),
('Birthday Cake Kit', 'Everything for a proper cake: mix, sprinkles, candles and a piping set.', '🎂', 2199, 'usd', 'treats', true);