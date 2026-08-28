import Link from "next/link";
import { CLERO } from "@/lib/clero";

// Shared footer for all /clero pages. On the home page it sits inside the
// closing artwork section (variant="scene"); on legal pages it stands alone.
export function CleroFooter({ variant = "plain" }: { variant?: "plain" | "scene" }) {
  return (
    <footer className={`clero-footer clero-footer-${variant}`}>
      <div className="clero-footer-cols">
        <div>
          <h4>Legal</h4>
          <Link href="/clero/terms">Terms of Use</Link>
          <Link href="/clero/privacy">Privacy Policy</Link>
        </div>
        <div>
          <h4>Support</h4>
          <a href={`mailto:${CLERO.supportEmail}`}>{CLERO.supportEmail}</a>
        </div>
        <div>
          <h4>{CLERO.name}</h4>
          <Link href="/clero">Home</Link>
          <a href={CLERO.appStoreUrl}>App Store</a>
        </div>
      </div>
      <p className="clero-copy">
        © 2026 {CLERO.name} · {CLERO.operator}. All rights reserved.
      </p>
      <p className="clero-disclaimer">
        Clero is an educational tool, not a medical device, and does not replace advice from a doctor or a quitline.
        If you are in crisis, contact your local emergency number.
      </p>
    </footer>
  );
}
