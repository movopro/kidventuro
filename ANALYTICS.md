# Kidventuro analytics

Kidventuro uses a privacy-first, aggregate funnel dataset in Cloudflare Workers Analytics Engine.

Dataset: `kidventuro_funnel`

No child name, exact age, checkout reference, email, Lemon Squeezy order ID or card/payment data is intentionally written to this dataset.

## Event schema

| Field | Meaning |
| --- | --- |
| `blob1` | event name |
| `blob2` | product: mini / adventure / family |
| `blob3` | page path |
| `blob4` | interface language: en / bg |
| `blob5` | UTM source |
| `blob6` | UTM medium |
| `blob7` | UTM campaign |
| `blob8` | external referrer hostname |
| `blob9` | country code |
| `blob10` | test / live |
| `double1` | event count (1) |
| `double2` | EUR amount for server-side payment/refund events, otherwise 0 |

Client events:
- `page_view`
- `preview_generated`
- `sample_opened`
- `pricing_viewed`
- `checkout_clicked`
- `booklet_opened`
- `print_clicked`
- `language_changed`

Server events:
- `checkout_registered`
- `payment_confirmed`
- `payment_refunded`

## Funnel — last 7 days

```sql
SELECT
  blob1 AS event,
  SUM(_sample_interval) AS events
FROM kidventuro_funnel
WHERE timestamp > NOW() - INTERVAL '7' DAY
GROUP BY event
ORDER BY events DESC
```

## Product checkout vs purchases — last 30 days

```sql
SELECT
  blob2 AS product,
  blob1 AS event,
  SUM(_sample_interval) AS events
FROM kidventuro_funnel
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 IN ('checkout_clicked','checkout_registered','payment_confirmed','payment_refunded','booklet_opened','print_clicked')
GROUP BY product, event
ORDER BY product, event
```

## Revenue recorded by verified Lemon Squeezy webhooks

```sql
SELECT
  blob2 AS product,
  SUM(double2 * _sample_interval) AS gross_order_value_eur,
  SUM(_sample_interval) AS purchases
FROM kidventuro_funnel
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'payment_confirmed'
  AND blob10 = 'live'
GROUP BY product
ORDER BY gross_order_value_eur DESC
```

## Refunds

```sql
SELECT
  blob2 AS product,
  SUM(_sample_interval) AS refunds,
  SUM(double2 * _sample_interval) AS refunded_base_value_eur
FROM kidventuro_funnel
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'payment_refunded'
  AND blob10 = 'live'
GROUP BY product
```

## Marketing sources reaching checkout

```sql
SELECT
  blob5 AS source,
  blob6 AS medium,
  blob7 AS campaign,
  SUM(_sample_interval) AS checkout_clicks
FROM kidventuro_funnel
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'checkout_clicked'
GROUP BY source, medium, campaign
ORDER BY checkout_clicks DESC
LIMIT 50
```

Because Kidventuro deliberately does not create a persistent analytics visitor ID, server-side purchases are not joined to individual campaign clicks. This is a privacy tradeoff: source/campaign performance can be evaluated at aggregate checkout level while verified payment totals remain server-authoritative.

## Referrers reaching the site

```sql
SELECT
  blob8 AS referrer,
  SUM(_sample_interval) AS views
FROM kidventuro_funnel
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'page_view'
  AND blob8 != ''
GROUP BY referrer
ORDER BY views DESC
LIMIT 50
```

## Country breakdown

```sql
SELECT
  blob9 AS country,
  SUM(_sample_interval) AS events
FROM kidventuro_funnel
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'page_view'
GROUP BY country
ORDER BY events DESC
LIMIT 50
```

## Test vs Live purchases

```sql
SELECT
  blob10 AS mode,
  blob2 AS product,
  SUM(_sample_interval) AS purchases
FROM kidventuro_funnel
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'payment_confirmed'
GROUP BY mode, product
ORDER BY mode, product
```

## Cloudflare Web Analytics

Cloudflare Web Analytics can additionally be enabled for `kidventuro.com` to provide cookie-free page/visitor and Core Web Vitals reporting. It is complementary to the custom funnel above; it currently does not provide custom events or UTM query-string tracking.
