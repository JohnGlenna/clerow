// One-off seed: create Clerow's subscription products + monthly prices in Stripe
// (test mode). Idempotent — reuses a product if one with the same name already
// exists, and reuses a matching active recurring price. Reads STRIPE_SECRET_KEY
// from clerow-web/.env.local so the key never sits on the command line.
//
//   node scripts/seed-stripe-products.mjs
//
// Prints the price IDs to paste into .env.local (STRIPE_PRICE_*).
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

// key → env var name, product name, monthly price in whole dollars
const PLANS = [
  { key: "founder",    env: "STRIPE_PRICE_FOUNDER",    name: "Clerow Founder",        dollars: 29 },
  { key: "team",       env: "STRIPE_PRICE_TEAM",       name: "Clerow Marketing Team", dollars: 89 },
  { key: "enterprise", env: "STRIPE_PRICE_ENTERPRISE", name: "Clerow Enterprise",     dollars: 249 },
];

async function findOrCreateProduct(name, planKey) {
  const existing = await stripe.products.search({ query: `name:'${name}'` });
  if (existing.data[0]) return existing.data[0];
  return stripe.products.create({ name, metadata: { clerow_plan: planKey } });
}

async function findOrCreatePrice(product, dollars) {
  const amount = dollars * 100;
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const match = prices.data.find(
    (p) => p.unit_amount === amount && p.currency === "usd" && p.recurring?.interval === "month",
  );
  if (match) return match;
  return stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval: "month" },
  });
}

const out = {};
for (const plan of PLANS) {
  const product = await findOrCreateProduct(plan.name, plan.key);
  const price = await findOrCreatePrice(product, plan.dollars);
  out[plan.env] = price.id;
  console.log(`${plan.name}: product ${product.id} · price ${price.id} ($${plan.dollars}/mo)`);
}

console.log("\n--- paste into .env.local ---");
for (const plan of PLANS) console.log(`${plan.env}=${out[plan.env]}`);
