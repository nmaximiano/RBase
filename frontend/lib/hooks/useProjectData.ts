"use client";

import { useState, useRef, useEffect } from "react";
import * as localProjects from "@/lib/projects";
import type { DatasetMeta } from "@/lib/r/registry";

export function useProjectData(projectId: string, duckdbReady: boolean) {
  const [projectName, setProjectName] = useState("");
  const [projectDatasets, setProjectDatasets] = useState<DatasetMeta[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Refs that mirror state; used by async functions to avoid stale closures
  const projectDatasetsRef = useRef(projectDatasets);
  projectDatasetsRef.current = projectDatasets;

  // Session rename state
  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [projectRenameValue, setProjectRenameValue] = useState("");
  const projectRenameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!duckdbReady) return;
    fetchProjectLocal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duckdbReady, projectId]);

  async function fetchProjectLocal() {
    try {
      const data = await localProjects.getProject(projectId);
      if (!data) throw new Error("Session not found");
      setProjectName(data.name);
      const dsList: DatasetMeta[] = data.datasets.map((d) => ({
        id: d.id,
        filename: d.filename,
        columns: d.columns,
        row_count: d.row_count,
        file_size_bytes: d.file_size_bytes,
        created_at: data.created_at,
        r_name: d.r_name,
      }));
      setProjectDatasets(dsList);
      const dsIds = new Set(dsList.map((d) => d.id));
      if (dsList.length > 0 && (!activeDatasetId || !dsIds.has(activeDatasetId))) {
        setActiveDatasetId(dsList[0].id);
      }
      setLoading(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load session");
      setLoading(false);
    }
  }

  async function handleProjectRename() {
    if (!projectRenameValue.trim()) {
      setIsRenamingProject(false);
      return;
    }
    const name = projectRenameValue.trim();
    try {
      await localProjects.renameProject(projectId, name);
      setProjectName(name);
    } catch (e) {
      console.error("[useProjectData] handleProjectRename failed:", e);
    }
    setIsRenamingProject(false);
  }

  return {
    projectName, setProjectName,
    projectDatasets, setProjectDatasets, projectDatasetsRef,
    activeDatasetId, setActiveDatasetId,
    loading, error, setError,
    isRenamingProject, setIsRenamingProject,
    projectRenameValue, setProjectRenameValue,
    projectRenameRef, handleProjectRename,
    fetchProjectLocal,
  };
}
