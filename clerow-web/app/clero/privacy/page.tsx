import type { Metadata } from "next";
import Link from "next/link";
import { CLERO } from "@/lib/clero";
import { CleroFooter } from "../Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What the Clero app collects, why, and what you can do about it.",
  alternates: { canonical: "/clero/privacy" },
};

const Mail = () => <a href={`mailto:${CLERO.supportEmail}`}>{CLERO.supportEmail}</a>;

export default function CleroPrivacy() {
  return (
    <>
    <article className="clero-legal">
      <Link href="/clero" className="clero-back">
        ← {CLERO.name}
      </Link>
      <h1>Privacy Policy</h1>
      <p className="clero-updated">Last updated: {CLERO.lastUpdated}</p>

      <p>
        This policy explains what the Clero app (&ldquo;Clero&rdquo;, &ldquo;we&rdquo;) collects, why, and what you
        can do about it. Clero is operated by {CLERO.operator}. Contact: <Mail />.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account.</strong> We create an anonymous account when you first open the app. If you choose to
          back it up, we store the email or Apple ID you link.
        </li>
        <li>
          <strong>Quit data you enter.</strong> Your quit date, what you were quitting (vape, cigarettes, pouches,
          snus), roughly how much it cost you, your goals, check&#8209;ins, beaten cravings and slips. This powers
          your streak, savings counter and milestones.
        </li>
        <li>
          <strong>Coach chats.</strong> Messages you send to the Clero coach, plus a short summary of your quit
          situation (days quit, product, goal) so the coach can reply in context.
        </li>
        <li>
          <strong>Crew.</strong> If you join a crew, other members see your first name, day count and savings —
          nothing else.
        </li>
        <li>
          <strong>Purchase status.</strong> Whether you have an active subscription, via RevenueCat and Apple. We
          never see your card details.
        </li>
        <li>
          <strong>Device &amp; usage.</strong> Basic app diagnostics (crashes, OS version) and, only if you allow it
          in the iOS tracking prompt, an advertising identifier used to measure whether our ads work.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To run the app (streak, savings, milestones, notifications), to give you personalised coach replies, to run
        your crew, to keep your subscription working, and to fix bugs. We do not sell your data and do not build
        advertising profiles.
      </p>

      <h2>Who processes it</h2>
      <ul>
        <li>
          <strong>Supabase</strong> — database and authentication (hosted in the EU/US; encrypted in transit and at
          rest). Row&#8209;level security means only your account can read your rows.
        </li>
        <li>
          <strong>Anthropic</strong> — processes coach chat messages to generate replies. Messages are sent with
          your quit summary, not your name or email. Anthropic does not use API data to train models.
        </li>
        <li>
          <strong>RevenueCat</strong> and <strong>Apple</strong> — subscription management and payment.
        </li>
        <li>
          <strong>Apple Push / Expo</strong> — delivery of the reminders you turn on.
        </li>
      </ul>

      <h2>Health information</h2>
      <p>
        Quit data is sensitive. We treat it as such: it is only used to run the features you see in the app, is
        never shared with advertisers, and is deleted with your account. Clero is not a medical device and gives
        general, educational information only.
      </p>

      <h2>Retention &amp; deletion</h2>
      <p>
        We keep your data while your account exists. Delete your account in the app (You → Delete account) or email{" "}
        <Mail /> from your account address; everything is removed within 30 days, including coach chats. Backups
        purge within a further 30 days.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live (including under GDPR), you may access, correct, export or delete your data, and
        object to processing. Email <Mail />. You can also complain to your local data protection authority (in
        Norway: Datatilsynet).
      </p>

      <h2>Children</h2>
      <p>
        Clero is for people 18 and over. We do not knowingly collect data from anyone under 18; if you believe we
        have, contact us and we will delete it.
      </p>

      <h2>Changes</h2>
      <p>We will post any changes here and update the date above. Material changes are announced in the app.</p>
    </article>
    <CleroFooter />
    </>
  );
}
