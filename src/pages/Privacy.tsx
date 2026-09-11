import { Header } from "@/components/Header";

/**
 * Privacy policy.
 *
 * Written to describe what this app actually does, checked against the
 * codebase. It is a factual draft, not legal advice — have it reviewed before
 * relying on it, and fill in the contact address in section 7.
 *
 * Heading levels: the site header supplies the page's only h1, so this page's
 * title is h2 and the numbered sections are h3.
 */
const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-3xl space-y-6">
        <h2 className="font-heading text-3xl font-bold">Privacy Policy</h2>

        <section className="space-y-2 text-muted-foreground">
          <p className="font-medium text-foreground">Last updated: 11 September 2026</p>
          <p>
            FPL Data Fetcher is a free tool for viewing Fantasy Premier League
            mini-league standings. There is no account and no sign-up, and we do
            not ask for or store personal information about you.
          </p>
          <p>
            This page explains what the service handles, what it stores in your
            browser, and the choices available to you.
          </p>
        </section>

        <section className="space-y-2 text-muted-foreground">
          <h3 className="font-heading text-xl font-semibold text-foreground">
            1. Information we handle
          </h3>
          <p>
            We do not collect names, email addresses, or any other personal
            details. The only thing you provide is a league ID, which is sent to
            our server to look up that league&apos;s standings.
          </p>
          <p>
            League IDs and the standings they return are public data published
            by Fantasy Premier League. Fetched league data is cached on our
            servers so repeat lookups are fast and so we do not repeatedly hit
            the upstream API.
          </p>
          <p>
            As with any website, our hosting provider processes standard request
            information (such as IP address and browser type) in order to serve
            the site and protect it from abuse.
          </p>
        </section>

        <section className="space-y-2 text-muted-foreground">
          <h3 className="font-heading text-xl font-semibold text-foreground">
            2. Storage in your browser
          </h3>
          <p>
            A few conveniences are saved locally in your own browser, not on our
            servers:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="text-foreground">fpl_last_league</span> — the
              league you last viewed, so the page can offer to reload it.
            </li>
            <li>
              <span className="text-foreground">fpl_my_team_&lt;leagueId&gt;</span>{" "}
              — the manager you marked as yours, used to highlight your row and
              build the share card.
            </li>
            <li>
              <span className="text-foreground">fpl_ads_consent</span> — a
              record of your advertising consent choice.
            </li>
            <li>
              <span className="text-foreground">cc_cookie</span> — a cookie set
              by the on-site consent banner recording which categories you
              accepted, and when.
            </li>
          </ul>
          <p>
            Clearing your browser&apos;s site data removes all of these. Nothing
            is lost except those conveniences.
          </p>
        </section>

        <section className="space-y-2 text-muted-foreground">
          <h3 className="font-heading text-xl font-semibold text-foreground">
            3. Analytics
          </h3>
          <p>
            We use Vercel Web Analytics and Speed Insights to understand
            aggregate traffic and page performance. These are first-party and
            do not use cookies to identify you or build a cross-site profile.
          </p>
        </section>

        <section className="space-y-2 text-muted-foreground">
          <h3 className="font-heading text-xl font-semibold text-foreground">
            4. Advertising
          </h3>
          <p>
            Advertising is not currently enabled, and no advertising code runs
            on this site. The consent banner asks about advertising already so
            that your choice is on record in advance; if advertising is
            introduced later, no ad script will load unless you have accepted
            it. Declining has no effect on any feature.
          </p>
        </section>

        <section className="space-y-2 text-muted-foreground">
          <h3 className="font-heading text-xl font-semibold text-foreground">
            5. Your choices
          </h3>
          <p>
            You can change or withdraw your consent at any time using the
            &ldquo;Manage preferences&rdquo; option in the consent banner, and
            you can remove locally stored preferences by clearing this
            site&apos;s data in your browser.
          </p>
        </section>

        <section className="space-y-2 text-muted-foreground">
          <h3 className="font-heading text-xl font-semibold text-foreground">
            6. Service providers
          </h3>
          <p>
            This site is hosted on Vercel, with caching and backend functions
            provided by Supabase. League data comes from the public Fantasy
            Premier League API operated by the Premier League.
          </p>
          <p>
            FPL Data Fetcher is an independent tool. It is not affiliated with,
            endorsed by, or connected to the Premier League or Fantasy Premier
            League.
          </p>
        </section>

        <section className="space-y-2 text-muted-foreground">
          <h3 className="font-heading text-xl font-semibold text-foreground">
            7. Contact
          </h3>
          {/* TODO: replace with a real contact address before relying on this policy. */}
          <p>
            For any privacy question, or to ask what is stored, contact{" "}
            <span className="text-foreground">[add a contact email]</span>.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Privacy;
