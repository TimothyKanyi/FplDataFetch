import { Header } from "@/components/Header";

/**
 * Placeholder privacy policy page. Required before ad networks will approve
 * the site — replace the placeholder text with the real policy.
 */
const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-3xl space-y-6">
        <h1 className="font-heading text-3xl font-bold">Privacy Policy</h1>

        <section className="space-y-2 text-muted-foreground">
          <p className="font-medium text-foreground">Last updated: —</p>
          <p>
            [Placeholder] This page will contain the full privacy policy for FPL
            Data Fetcher, including what data is collected, how cookies and ads
            are used, and your choices regarding consent.
          </p>
        </section>

        <section className="space-y-2 text-muted-foreground">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            1. Information we collect
          </h2>
          <p>[Placeholder — describe any data collected.]</p>
        </section>

        <section className="space-y-2 text-muted-foreground">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            2. Cookies and advertising
          </h2>
          <p>
            [Placeholder — describe cookie usage and how ad consent is managed
            via the on-site consent banner.]
          </p>
        </section>

        <section className="space-y-2 text-muted-foreground">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            3. Contact
          </h2>
          <p>[Placeholder — contact details for privacy inquiries.]</p>
        </section>
      </main>
    </div>
  );
};

export default Privacy;
