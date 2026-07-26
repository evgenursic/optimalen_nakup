import { notFound } from "next/navigation";

const legalDocuments = {
  privacy: {
    title: "Privacy notice template",
    body: "This template describes intended processing, retention, exports, deletion, processors, and user rights. It is not legal advice and must be reviewed before launch.",
  },
  terms: {
    title: "Terms of service template",
    body: "Recommendations are informational, evidence may be incomplete or stale, and users remain responsible for purchase decisions. This template requires qualified legal review.",
  },
  sources: {
    title: "Source and editorial policy",
    body: "Optimalen Nakup uses only approved accessible sources, reports numerical coverage, stores bounded evidence, and does not permit paid influence on organic scoring.",
  },
} as const;

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  const content = legalDocuments[document as keyof typeof legalDocuments];
  if (!content) {
    notFound();
  }

  return (
    <main id="main-content" className="container py-16 lg:py-24">
      <p className="eyebrow">Legal review required</p>
      <h1 className="section-heading mt-5">{content.title}</h1>
      <div className="card mt-10 max-w-3xl p-7">
        <p className="leading-8 text-slate-700">{content.body}</p>
      </div>
    </main>
  );
}
