import type { Metadata } from "next";
import Link from "next/link";
import { CLERO } from "@/lib/clero";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that apply when you use the Clero app.",
  alternates: { canonical: "/clero/terms" },
};

export default function CleroTerms() {
  return (
    <article className="clero-legal">
      <Link href="/clero" className="clero-back">
        ← {CLERO.name}
      </Link>
      <h1>Terms of Use</h1>
      <p className="clero-updated">Last updated: {CLERO.lastUpdated}</p>

      <h2>1. Who we are</h2>
      <p>
        Clero is an iOS app operated by {CLERO.operator} (&ldquo;we&rdquo;). By using Clero you agree to these terms
        and to Apple&rsquo;s Licensed Application End User License Agreement, which applies in addition.
      </p>

      <h2>2. What Clero is — and isn&rsquo;t</h2>
      <p>
        Clero is an educational, self&#8209;help tool for reducing or quitting nicotine. It is{" "}
        <strong>
          not a medical device, does not diagnose or treat any condition, and is not a substitute for a doctor,
          pharmacist or quitline
        </strong>
        . The coach is a scripted/AI assistant, not a healthcare professional or a crisis service. If you are in
        danger or in crisis, contact your local emergency number.
      </p>

      <h2>3. Eligibility</h2>
      <p>You must be 18 or older.</p>

      <h2>4. Your account</h2>
      <p>
        You are responsible for what happens under your account and for keeping your backup email/Apple ID secure.
      </p>

      <h2>5. Subscription</h2>
      <p>
        Clero Pro is an auto&#8209;renewing subscription billed through your Apple ID: currently{" "}
        <strong>USD 12.99 / month</strong> or <strong>USD 89.99 / year</strong> (local prices shown in the App
        Store). Payment is charged at confirmation of purchase and renews automatically unless cancelled at least 24
        hours before the end of the current period. Manage or cancel in iOS Settings → Apple ID → Subscriptions.
        Refunds are handled by Apple under App Store rules. Any free trial converts to a paid subscription unless
        cancelled before it ends.
      </p>

      <h2>6. Acceptable use</h2>
      <p>
        Don&rsquo;t abuse the coach or crew features, harass other members, attempt to access others&rsquo; data,
        reverse&#8209;engineer the app, or use it for anything unlawful. We may suspend accounts that do.
      </p>

      <h2>7. Crew</h2>
      <p>
        Content you share with a crew is visible to its members. Be kind. We may remove content or members that
        break these terms.
      </p>

      <h2>8. Content &amp; IP</h2>
      <p>
        The app, its design, copy, illustrations and the Clero character are ours. You get a personal,
        non&#8209;transferable licence to use the app. You keep ownership of what you enter; you grant us the licence
        needed to run the service.
      </p>

      <h2>9. Accuracy</h2>
      <p>
        Savings, streaks and health&#8209;timeline information are estimates based on what you enter and on public
        sources (e.g. CDC, NHS). They are for motivation, not financial or medical advice.
      </p>

      <h2>10. Availability &amp; changes</h2>
      <p>We may change, pause or discontinue features. We&rsquo;ll try to give notice for material changes.</p>

      <h2>11. Disclaimer &amp; liability</h2>
      <p>
        The app is provided &ldquo;as is&rdquo;. To the extent permitted by law, we are not liable for indirect or
        consequential losses, or for outcomes of your quit attempt. Nothing here limits rights you have as a consumer
        under mandatory law (including Norwegian and EU consumer law).
      </p>

      <h2>12. Termination</h2>
      <p>
        You can stop using Clero and delete your account at any time. We may terminate accounts for breach of these
        terms.
      </p>

      <h2>13. Governing law</h2>
      <p>
        Norwegian law applies. Disputes go to the courts of Norway, without prejudice to mandatory consumer
        protections where you live.
      </p>

      <h2>14. Contact</h2>
      <p>
        <a href={`mailto:${CLERO.supportEmail}`}>{CLERO.supportEmail}</a>
      </p>
    </article>
  );
}
