import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StartButton } from "@/components/welcome/Cta";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_NAME, abs } from "@/lib/seo/site";
import { COMPARE_PAGES, COMPARE_UPDATED, compareBySlug } from "@/lib/seo/compare";

export function generateStaticParams() {
  return COMPARE_PAGES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = compareBySlug(slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `/compare/${page.slug}` },
    openGraph: { title: page.metaTitle, description: page.metaDescription, url: abs(`/compare/${page.slug}`) },
  };
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = compareBySlug(slug);
  if (!page) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${SITE_NAME} vs ${page.rival}`,
    description: page.metaDescription,
    dateModified: "2026-07-06",
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: abs(`/compare/${page.slug}`),
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      <span className="eyebrow">Comparison</span>
      <h1>
        {SITE_NAME} vs {page.rival}
      </h1>
      <p className="updated">Last updated: {COMPARE_UPDATED}</p>
      <p className="lede">{page.intro}</p>

      <h2>
        {SITE_NAME} vs {page.rival}: feature comparison
      </h2>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>{SITE_NAME}</th>
            <th>{page.rival}</th>
          </tr>
        </thead>
        <tbody>
          {page.rows.map((r, i) => (
            <tr key={i}>
              <th>{r.feature}</th>
              <td className="col-you">{r.clerow}</td>
              <td>{r.rival}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Who each is best for</h2>
      <h3>{SITE_NAME} is best for</h3>
      <p>{page.clerowBestFor}</p>
      <h3>{page.rival} is best for</h3>
      <p>
        {page.rival} is {page.rivalIs} {page.rivalBestFor}
      </p>

      <h2>Verdict</h2>
      <p>{page.verdict}</p>

      <div className="content-cta">
        <h2>See how you rank across all 5 AI engines</h2>
        <p>Your first scan and Level 1 fixes are free. Find out where AI recommends you in minutes.</p>
        <StartButton className="btn btn-primary">Get started</StartButton>
      </div>
    </>
  );
}
