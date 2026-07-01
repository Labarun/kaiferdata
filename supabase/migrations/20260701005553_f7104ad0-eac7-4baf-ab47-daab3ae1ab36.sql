CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  meta_title TEXT,
  meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone can view published blog posts" ON public.blog_posts
  FOR SELECT TO anon, authenticated
  USING (is_published = true AND (published_at IS NULL OR published_at <= now()));

CREATE POLICY "Admins can manage blog posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.blog_posts (
  title, slug, excerpt, content, cover_image_url, category,
  meta_title, meta_description, is_published, published_at
) VALUES (
  'How to Buy Cheap MTN Data in Ghana (90 Days Validity Guide)',
  'how-to-buy-cheap-mtn-data-ghana',
  'Looking for the cheapest MTN data bundles in Ghana? Discover the best MTN packages, shortcodes, and how to get data with up to 90 days validity on Kaifer Data.',
  '# How to Buy Cheap MTN Data in Ghana (90 Days Validity Guide)

If you are an internet user in Ghana, you probably know that MTN is the largest and most reliable mobile network. However, standard internet bundles can quickly drain your wallet.

In this comprehensive guide, we will show you how to buy cheap MTN data in Ghana, unlock packages with up to **90 days validity**, and get the best value for your money.

## Why Standard MTN Bundles Aren''t Enough

Standard MTN bundles purchased through the standard `*138#` code are often expensive and expire quickly. If you purchase a daily or weekly bundle, any unused data is lost.

To solve this, users are turning to alternative methods to secure data that lasts longer and costs significantly less.

## How to Get Cheap MTN Data (Step-by-Step)

Here are the most effective ways to purchase discounted MTN data:

### 1. Buy Directly via Kaifer Data

The easiest and most cost-effective way to get MTN data without worrying about shortcodes is through **[Kaifer Data](https://kaiferdata.com)**.

* **No Expiry / High Validity**: Get bundles that remain active for up to 90 days.
* **Instant Delivery**: Data is sent to your MTN number within seconds of payment.
* **Multiple Payment Channels**: Pay securely using Mobile Money (MTN, Telecel, AirtelTigo) or debit card.

### 2. MTN Asempa and Special Offers

MTN occasionally offers special bundles under the Asempa or Zone channels. You can access these by dialing `*135#` on your mobile device. However, these offers are highly localized, fluctuate in price, and often expire within 24 hours.

---

## Comparing MTN Data Packages on Kaifer Data

| Bundle Size | Price (GHS) | Validity | Best For |
|---|---|---|---|
| **1 GB** | 12.00 | 30 Days | Light browsing & chatting |
| **5 GB** | 55.00 | 30 Days | Social media & email |
| **10 GB** | 105.00 | 90 Days | Remote work & moderate streaming |
| **50 GB** | 490.00 | 90 Days | Heavy streaming & downloads |

---

## Tips to Conserve Your MTN Mobile Data

No matter how cheap your data is, conserving it makes it last even longer. Follow these quick tips:

1. **Turn on Data Saver**: Go to your phone''s network settings and enable Data Saver mode.
2. **Disable Auto-Downloads**: Turn off automatic media downloads in WhatsApp, Telegram, and social media apps.
3. **Limit High-Definition Video**: Set YouTube, Netflix, and TikTok streaming quality to 480p or 360p.
4. **Use Wi-Fi for Updates**: Only download system updates and app upgrades when connected to a Wi-Fi network.

## Conclusion

Getting high-speed MTN internet in Ghana doesn''t have to break the bank. By ordering your bundles through **Kaifer Data**, you can enjoy cheaper rates, longer validity, and seamless instant delivery.

Ready to get cheap data? **[Click here to buy cheap MTN data now!](/buy?network=MTN)**',
  'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800&auto=format&fit=crop&q=60',
  'Guides',
  'How to Buy Cheap MTN Data in Ghana (90 Days Validity)',
  'Discover the cheapest ways to buy MTN data in Ghana. Compare packages, access shortcodes, and purchase 90-day bundles instantly on Kaifer Data.',
  true,
  now()
);