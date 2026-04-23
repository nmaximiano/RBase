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
  title: "Terms | RBase",
  description: "Terms of service for RBase, the open-source, BYOK R IDE.",
};

const LAST_UPDATED = "April 22, 2026";

// Inline style helpers used throughout this doc.
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

export default function TermsPage() {
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
          title="Terms of Service"
          lede="RBase is an open-source browser IDE. We don't host your data, we don't bill you, and we don't collect anything. Use it at your own discretion. The specifics follow."
        />

        <DocSection num="01" title="What RBase is">
          <p>
            RBase is an in-browser R IDE with an integrated AI agent. The source code is
            published under the Apache-2.0 license at{" "}
            <a href={GITHUB_HREF} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              github.com/nmaximiano/rbase
            </a>
            . You can use the hosted version at tryrbase.com, or clone the repo and run
            your own copy. The code behind both is the same.
          </p>
        </DocSection>

        <DocSection num="02" title="Bring your own key">
          <p>
            The agent calls large-language-model providers through OpenRouter using an API
            key you supply. That key is stored only in your browser. We do not operate
            servers, we never see your key, and we never bill you. OpenRouter bills you
            directly according to their pricing and terms.
          </p>
          <p>
            Set a spending limit on your OpenRouter account if you care about cost control.
            You are responsible for what your key is used for while it is active in your
            browser.
          </p>
        </DocSection>

        <DocSection num="03" title="Your data stays with you">
          <p>
            Datasets, projects, chat history, and R environment state live in your
            browser&apos;s origin-private file system (OPFS) and local storage. They are
            not uploaded anywhere. When you run the agent, the parts of your data
            referenced in a prompt are sent to OpenRouter together with the prompt. That
            is the only time any of your data leaves your device, and it goes directly
            from your browser to OpenRouter, not through us.
          </p>
        </DocSection>

        <DocSection num="04" title="No warranty">
          <p>
            RBase is provided &ldquo;as is,&rdquo; without warranty of any kind. The AI
            agent may produce code and analyses that are incorrect, incomplete, or
            unsuitable for your problem. You are solely responsible for reviewing and
            validating anything the agent produces before relying on it, especially for
            work used in published research, regulated contexts, or consequential
            decisions.
          </p>
        </DocSection>

        <DocSection num="05" title="Limitation of liability">
          <p>
            To the maximum extent permitted by applicable law, RBase and its contributors
            will not be liable for any loss, damage, or cost arising from your use of the
            software or the hosted service, including lost data, lost revenue, incorrect
            analyses, or third-party charges incurred through your OpenRouter account.
          </p>
        </DocSection>

        <DocSection num="06" title="License">
          <p>
            The RBase source code is licensed under{" "}
            <a
              href="https://www.apache.org/licenses/LICENSE-2.0"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              Apache-2.0
            </a>
            . You are free to use, fork, modify, and redistribute it, including
            commercially, subject to the terms of that license.
          </p>
        </DocSection>

        <DocSection num="07" title="Acceptable use of tryrbase.com">
          <p>
            If you use the hosted deployment at tryrbase.com, please don&apos;t try to
            break it, load-test it, reverse-engineer the hosting layer, or use it for
            illegal purposes. We may throttle or block abusive traffic at our discretion.
            Self-hosted copies are governed by whoever is hosting them, not by this
            clause.
          </p>
        </DocSection>

        <DocSection num="08" title="Changes">
          <p>
            These terms may change. The current version is whatever is committed to{" "}
            <code style={codeStyle}>main</code> and served on this page. Material changes
            will be reflected in the commit history and the &ldquo;last updated&rdquo; date
            above.
          </p>
        </DocSection>

        <DocSection num="09" title="Contact" last>
          <p>
            Questions or concerns? Open an issue on the{" "}
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
