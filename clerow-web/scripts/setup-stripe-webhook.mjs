// One-off: create (or reuse) the Stripe webhook endpoint for production and
// print its signing secret. Reads STRIPE_SECRET_KEY from clerow-web/.env.local.
//
//   node scripts/setup-stripe-webhook.mjs https://clerow.com/api/billing/webhook
//
// The signing secret is only returned by Stripe at creation time — paste the
// printed whsec_... into your host's STRIPE_WEBHOOK_SECRET env var.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Stripe from "stripe";

const here = dirname(fileURLToPath(import.meta.url));
const url = process.argv[2];
if (!url) {
  console.error("Usage: node scripts/setup-stripe-webhook.mjs <webhook-url>");
  process.exit(1);
}

function readEnv(key) {
  const line = readFileSync(join(here, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  if (!line) throw new Error(`${key} not found in .env.local`);
  return line.slice(key.length + 1).trim();
}

const stripe = new Stripe(readEnv("STRIPE_SECRET_KEY"));

const EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const existing = await stripe.webhookEndpoints.list({ limit: 100 });
const match = existing.data.find((e) => e.url === url);

if (match) {
  console.log(`Endpoint already exists: ${match.id} (${match.status})`);
  console.log(
    "Stripe only reveals the signing secret at creation. If you don't have it,",
  );
  console.log("delete this endpoint in the Dashboard and re-run, or roll its secret there.");
} else {
  const endpoint = await stripe.webhookEndpoints.create({
    url,
    enabled_events: EVENTS,
    description: "Clerow subscription sync",
  });
  console.log(`Created endpoint: ${endpoint.id}`);
  console.log(`\nSTRIPE_WEBHOOK_SECRET=${endpoint.secret}`);
}
