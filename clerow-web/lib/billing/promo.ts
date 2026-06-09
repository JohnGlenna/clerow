// Early-adopter launch promo: 90% off the FIRST MONTH of Premium.
// Backed by Stripe coupon 7i1Amf9U / promotion code EARLY90 (duration: once,
// Premium-only, expires ~2026-09-06). Single source of truth so the UI and the
// checkout route never drift. To end the campaign: set `active: false` and unset
// STRIPE_LAUNCH_PROMOTION_CODE.
//
// `active`/`code`/`percentOff`/`label` are plain constants — safe in the client
// bundle. `promotionCodeId` comes from env and is server-only (never rendered).

export const LAUNCH_PROMO = {
  active: true,
  code: "EARLY90",
  percentOff: 90,
  label: "Early access", // small badge shown next to the discounted price
  appliesTo: "founder" as const,
  promotionCodeId: process.env.STRIPE_LAUNCH_PROMOTION_CODE ?? "",
};

/** First-month price after the promo, formatted like "$5.80". */
export function promoFirstMonth(basePrice: number): string {
  const v = Math.round(basePrice * (1 - LAUNCH_PROMO.percentOff / 100) * 100) / 100;
  return `$${v.toFixed(2)}`;
}

/** Whether the promo should be shown/applied for a given plan key. */
export function promoAppliesTo(plan: string): boolean {
  return LAUNCH_PROMO.active && plan === LAUNCH_PROMO.appliesTo;
}
