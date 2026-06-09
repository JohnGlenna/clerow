import type { Metadata } from "next";
import { StartButton } from "@/components/welcome/Cta";
import { JsonLd, softwareApplicationSchema } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Clerow Pricing — $29/month, Free First Scan",
  description:
    "Clerow pricing is simple: $29 per month, self-serve, cancel anytime. Your first scan and all Level 1 fixes are free. No sales call. See what's included.",
  alternates: { canonical: "/pricing" },
};

const INCLUDED = [
  "Scan across all 5 AI models — ChatGPT, Claude, Perplexity, Gemini, Grok",
  "Discover and add your own custom buyer prompts",
  "The full quest path — ranked daily tasks with XP & streaks",
  "Re-scan anytime to track your climb",
  "Clerow MCP autopilot — let an AI agent ship the fixes",
  "Ready-to-ship content: robots.txt, llms.txt, FAQ & comparison drafts",
];

export default function PricingPage() {
  return (
    <>
      <JsonLd data={softwareApplicationSchema()} />
      <span className="eyebrow">Pricing</span>
      <h1>One simple plan. $29/month.</h1>
      <p className="lede">
        Clerow costs $29 per month, self-serve, and you can cancel anytime — no sales call. Your
        first scan (one engine) and all Level 1 foundation fixes are free, so you can see where AI
        ranks you before you pay anything.
      </p>

      <h2>What&apos;s included</h2>
      <ul>
        {INCLUDED.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>

      <h2>Free vs Premium</h2>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Price</th>
            <th>What you get</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Free</th>
            <td>$0</td>
            <td>Your first scan (one engine) + all Level 1 foundation fixes.</td>
          </tr>
          <tr>
            <th>Premium</th>
            <td className="col-you">$29/mo</td>
            <td className="col-you">
              All 5 engines, custom prompts, the full quest path with XP &amp; streaks, unlimited
              re-scans, the MCP autopilot, and generated content.
            </td>
          </tr>
        </tbody>
      </table>

      <div className="content-cta">
        <h2>Start free</h2>
        <p>See where ChatGPT, Claude, Perplexity, Gemini, and Grok rank you — then climb.</p>
        <StartButton className="btn btn-primary">Subscribe — $29/mo</StartButton>
      </div>
    </>
  );
}
