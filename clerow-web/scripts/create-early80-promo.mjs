// One-off: create (or reuse) the EARLY80 promotion code — 80% off the first
// month, restricted to the Premium plan. Idempotent: reuses the matching coupon
// and an existing EARLY80 code if present. Reads STRIPE_SECRET_KEY and
// STRIPE_PRICE_FOUNDER from clerow-web/.env.local so the key never sits on the
// command line. Run AFTER the live price IDs are in .env.local.
//
//   node scripts/create-early80-promo.mjs
//
// Why a script (not the Stripe MCP): the promotion_codes endpoint uses the
// newer `promotion` object, which the MCP serializes against a different API
// version than this account; the SDK pins its own version and just works.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Stripe from "stripe";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, "..", ".env.local");

function readEnv(key) {
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  if (!line) throw new Error(`${key} not found in ${envPath}`);
  return line.slice(key.length + 1).trim();
}

const stripe = new Stripe(readEnv("STRIPE_SECRET_KEY"));
const PREMIUM_PRICE = readEnv("STRIPE_PRICE_FOUNDER");

const COUPON_NAME = "Early Adopter — 80% off first month";
const CODE = "EARLY80";

// Resolve the Premium product from its price so the coupon is scoped correctly
// regardless of test/live mode.
const price = await stripe.prices.retrieve(PREMIUM_PRICE);
const premiumProduct = typeof price.product === "string" ? price.product : price.product.id;

// Find-or-create the Premium-only 80%-off-once coupon.
async function findOrCreateCoupon() {
  const list = await stripe.coupons.list({ limit: 100 });
  const match = list.data.find(
    (c) =>
      c.name === COUPON_NAME &&
      c.percent_off === 80 &&
      c.duration === "once" &&
      c.applies_to?.products?.includes(premiumProduct),
  );
  if (match) return match;
  const redeemBy = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60; // ~90 days
  return stripe.coupons.create({
    name: COUPON_NAME,
    percent_off: 80,
    duration: "once",
    applies_to: { products: [premiumProduct] },
    redeem_by: redeemBy,
  });
}

const coupon = await findOrCreateCoupon();

// Find-or-create the EARLY80 promotion code. expires_at must not be after the
// coupon's redeem_by, so we clamp to it when present.
const existing = await stripe.promotionCodes.list({ code: CODE, limit: 1 });
let promo = existing.data[0];
if (promo) {
  console.log(`Promotion code already exists: ${promo.id} (${promo.code}, active=${promo.active})`);
} else {
  promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: CODE,
    expires_at: coupon.redeem_by ?? Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60,
    active: true,
  });
  console.log(`Created promotion code: ${promo.id}`);
}

console.log(
  `\nCoupon ${coupon.id} (${coupon.percent_off}% off, ${coupon.duration}) → Premium product ${premiumProduct}`,
);
console.log(`Customers redeem "${promo.code}" in the checkout promo-code field.`);
