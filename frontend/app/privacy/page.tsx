import Nav from "@/components/ui/Nav";
import Footer from "@/components/ui/Footer";
import SettingsMenu from "@/components/ui/SettingsMenu";
import { DocHeader, DocSection } from "@/components/ui/Doc";
import {
  ACCENT,
  CODE_BG,
  FONT_MONO,
  FONT_SANS,
  GITHUB_HREF,
  INK,
  PAPER,
} from "@/components/ui/theme";

export const metadata = {
  title: "Privacy | RBase",
  description:
    "Privacy policy for RBase: what we don't collect, what stays in your browser, what leaves it, and how to verify.",
};

const LAST_UPDATED = "April 22, 2026";

const linkStyle = {
  color: ACCENT,
  textDecoration: "underline",
  textUnderlineOffset: 2,
} as const;
const codeStyle = {
  fontFamily: FONT_MONO,
  fontSize: "0.9em",
  background: CODE_BG,
  padding: "1px 5px",
  borderRadius: 3,
} as const;

export default function PrivacyPage() {
  return (
    <div
      style={{
        background: PAPER,
        color: INK,
        fontFamily: FONT_SANS,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Nav
        links={[
          { label: "Home", href: "/" },
          { label: "GitHub", href: GITHUB_HREF, external: true },
        ]}
        rightSlot={<SettingsMenu />}
      />

      <main
        style={{
          flex: 1,
          maxWidth: 780,
          width: "100%",
          margin: "0 auto",
          padding: "72px 56px 96px",
        }}
        className="rbase-doc-main"
      >
        <DocHeader
          eyebrow={`Last updated — ${LAST_UPDATED}`}
          title="Privacy"
          lede="RBase has no servers, so there's very little to say. This page is the long version of that."
        />

        <DocSection num="01" title="What we don't collect">
          <p>
            No email. No name. No account. No phone number. No IP address logged by us. No
            user analytics tied to you. We don&apos;t have a database and we don&apos;t
            have authentication, because the app has no backend, by design. There is no
            &ldquo;us&rdquo; that could collect anything server-side.
          </p>
        </DocSection>

        <DocSection num="02" title="What lives in your browser">
          <p>
            Your OpenRouter API key is stored in <code style={codeStyle}>localStorage</code>{" "}
            under the key <code style={codeStyle}>rbase:openrouter_key</code>, or in{" "}
            <code style={codeStyle}>sessionStorage</code> if you chose &ldquo;Session
            only&rdquo; at first-run.
          </p>
          <p>
            Your datasets, projects, chat history, and R environment state live in your
            browser&apos;s origin-private file system (OPFS) under{" "}
            <code style={codeStyle}>opfs://RBase_local.duckdb</code>. Clearing site data
            in your browser wipes all of it.
          </p>
        </DocSection>

        <DocSection num="03" title="What leaves your browser">
          <p>One thing, and only this one:</p>
          <ol style={{ margin: "0 0 20px", paddingLeft: 24 }}>
            <li style={{ marginBottom: 10 }}>
              <strong>OpenRouter.</strong> Requests to{" "}
              <code style={codeStyle}>https://openrouter.ai/api/v1/*</code> using your API
              key. These carry your prompts and whatever parts of your data are referenced
              in them. OpenRouter has its own privacy policy at{" "}
              <a
                href="https://openrouter.ai/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
              >
                openrouter.ai/privacy
              </a>
              .
            </li>
          </ol>
          <p>
            No other network traffic is initiated by the app. Assets are served by
            whichever host is deploying it.
          </p>
        </DocSection>

        <DocSection num="04" title="Cookies">
          <p>
            RBase does not set any cookies. If you have a browser extension or ad blocker
            that injects cookies, those are not us.
          </p>
        </DocSection>

        <DocSection num="05" title="Data retention">
          <p>
            We can&apos;t retain what we don&apos;t receive. Your local data persists in
            your browser for as long as the browser keeps OPFS and localStorage. You can
            clear it from browser settings, from the &ldquo;Forget key&rdquo; button in the
            in-app settings menu, or from &ldquo;Clear all data&rdquo; in the same menu.
          </p>
        </DocSection>

        <DocSection num="06" title="Children">
          <p>
            RBase is not directed at children under 13. Since we don&apos;t collect
            personal data we don&apos;t have anything to delete for a child user, but
            please don&apos;t let small children spend money on your OpenRouter account.
          </p>
        </DocSection>

        <DocSection num="07" title="Verifying">
          <p>
            Don&apos;t take our word for it. Open DevTools → Network in your browser and
            watch every request the app makes. You will not see requests to any{" "}
            <code style={codeStyle}>rbase</code> backend because there isn&apos;t one,
            only static assets from the host, and calls to the destination listed in 03.
            The source is on GitHub if you want to audit it.
          </p>
        </DocSection>

        <DocSection num="08" title="Changes">
          <p>
            This policy may change. The current version is whatever is committed to{" "}
            <code style={codeStyle}>main</code> and served on this page. The &ldquo;last
            updated&rdquo; date above reflects the most recent substantive change.
          </p>
        </DocSection>

        <DocSection num="09" title="Contact" last>
          <p>
            Questions, corrections, or a mistake in what this page claims? Open an
            issue on the{" "}
            <a href={GITHUB_HREF} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              repository
            </a>
            .
          </p>
        </DocSection>
      </main>

      <Footer />
    </div>
  );
}
