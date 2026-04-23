"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRuntime } from "@/lib/hooks/useRuntime";
import * as sessions from "@/lib/projects";
import type { ProjectMeta } from "@/lib/projects";
import { seedGettingStarted } from "@/lib/seed";
import Nav from "@/components/ui/Nav";
import Footer from "@/components/ui/Footer";
import SettingsMenu from "@/components/ui/SettingsMenu";
import RuntimeToast from "@/components/RuntimeToast";
import {
  ACCENT,
  BORDER,
  FAINT,
  FONT_MONO,
  FONT_SANS,
  FONT_SERIF,
  GITHUB_HREF,
  HAIRLINE,
  INK,
  MUTED,
  PAPER,
} from "@/components/ui/theme";

const LOCAL_USER_ID = "local";

export default function ProjectsPage() {
  const router = useRouter();
  const { status: runtimeStatus, progress: runtimeProgress, duckdbReady } =
    useRuntime(LOCAL_USER_ID);

  const [list, setList] = useState<ProjectMeta[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!duckdbReady) return;
    (async () => {
      try {
        await seedGettingStarted();
        const fresh = await sessions.listProjects();
        setList(fresh);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load projects");
      }
    })();
  }, [duckdbReady]);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const id = await sessions.createProject("Untitled project");
      router.push(`/projects/${id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create project");
      setCreating(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await sessions.deleteProject(id);
      setList((prev) => prev?.filter((s) => s.id !== id) ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const creatingDisabled = !duckdbReady || creating;

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
          { label: "GitHub", href: GITHUB_HREF, external: true, disabled: true },
        ]}
        rightSlot={<SettingsMenu />}
        homeHref="/projects"
      />

      <main
        style={{
          flex: 1,
          padding: "72px 56px",
          maxWidth: 1180,
          width: "100%",
          margin: "0 auto",
        }}
        className="rbase-projects-main"
      >
        <ProjectsHeader />

        <ActionsRow
          count={list?.length ?? null}
          creatingDisabled={creatingDisabled}
          creating={creating}
          onCreate={handleCreate}
        />

        {error && (
          <div
            style={{
              marginTop: 20,
              padding: "12px 16px",
              border: "1px solid rgba(220,50,50,0.3)",
              background: "rgba(220,50,50,0.05)",
              color: "rgb(180,30,30)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <ProjectList
          list={list}
          creatingDisabled={creatingDisabled}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      </main>

      <Footer />
      <RuntimeToast
        status={runtimeStatus}
        progress={runtimeProgress}
        duckdbReady={duckdbReady}
      />
    </div>
  );
}

function ProjectsHeader() {
  return (
    <div style={{ marginBottom: 40 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: MUTED,
          marginBottom: 24,
        }}
      >
        <span>Projects — your workspace</span>
      </div>
      <h1
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 400,
          fontSize: 72,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          margin: 0,
        }}
        className="rbase-projects-h1"
      >
        Your projects.
      </h1>
      <p
        style={{
          fontSize: 17,
          lineHeight: 1.45,
          color: MUTED,
          margin: "20px 0 0",
          maxWidth: 560,
        }}
      >
        Datasets, chat history, and R environment all live in this browser.
      </p>
    </div>
  );
}

interface ActionsRowProps {
  count: number | null;
  creatingDisabled: boolean;
  creating: boolean;
  onCreate: () => void;
}

function ActionsRow({
  count,
  creatingDisabled,
  creating,
  onCreate,
}: ActionsRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 32,
        paddingBottom: 16,
        borderTop: `1px solid ${INK}`,
      }}
    >
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: MUTED }}>
        {count === null ? "" : `${count} ${count === 1 ? "project" : "projects"}`}
      </span>
      <button
        onClick={onCreate}
        disabled={creatingDisabled}
        style={{
          background: ACCENT,
          color: PAPER,
          border: "none",
          padding: "10px 18px",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 500,
          fontFamily: FONT_SANS,
          cursor: creatingDisabled ? "not-allowed" : "pointer",
          opacity: creatingDisabled ? 0.5 : 1,
        }}
      >
        {creating ? "Creating…" : "New project"}
      </button>
    </div>
  );
}

interface ProjectListProps {
  list: ProjectMeta[] | null;
  creatingDisabled: boolean;
  onCreate: () => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

function ProjectList({ list, creatingDisabled, onCreate, onDelete }: ProjectListProps) {
  if (list === null) {
    return (
      <div style={{ padding: "40px 0", color: MUTED, fontSize: 14, fontFamily: FONT_MONO }}>
        Loading…
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div
        style={{
          border: `1px dashed ${BORDER}`,
          padding: "56px 24px",
          textAlign: "center",
          marginTop: 8,
        }}
      >
        <p style={{ fontSize: 14, color: MUTED, margin: "0 0 12px" }}>
          No projects yet.
        </p>
        <button
          onClick={onCreate}
          disabled={creatingDisabled}
          style={{
            background: "transparent",
            color: ACCENT,
            border: "none",
            fontSize: 14,
            cursor: creatingDisabled ? "not-allowed" : "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 2,
            fontFamily: FONT_SANS,
            opacity: creatingDisabled ? 0.5 : 1,
          }}
        >
          Create your first project
        </button>
      </div>
    );
  }
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        // Negative horizontal margin so rows extend a bit past the
        // text column, leaving visual padding around the hover highlight
        // without shifting the content alignment.
        margin: "8px -14px 0",
        borderTop: `1px solid ${HAIRLINE}`,
      }}
    >
      {list.map((s) => (
        <li key={s.id} style={{ borderBottom: `1px solid ${HAIRLINE}` }} className="rbase-projects-row">
          <Link
            href={`/projects/${s.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 14px",
              textDecoration: "none",
              color: INK,
              gap: 24,
            }}
            className="rbase-projects-rowlink"
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  marginBottom: 4,
                  letterSpacing: "-0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.name || "Untitled"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: MUTED,
                  fontFamily: FONT_MONO,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.dataset_count} {s.dataset_count === 1 ? "dataset" : "datasets"}
                {s.dataset_names.length > 0 && (
                  <>
                    {" "}
                    · {s.dataset_names.slice(0, 3).join(", ")}
                    {s.dataset_names.length > 3 ? "…" : ""}
                  </>
                )}
              </div>
            </div>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: MUTED,
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}
            >
              {new Date(s.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <button
              onClick={(e) => onDelete(e, s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                color: FAINT,
                cursor: "pointer",
                padding: 6,
                flexShrink: 0,
                lineHeight: 0,
              }}
              className="rbase-projects-delete"
              aria-label="Delete project"
              title="Delete project"
            >
              <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </Link>
        </li>
      ))}
    </ul>
  );
}
