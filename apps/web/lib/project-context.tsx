"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { createApi, type Api, type Project } from "./api";

interface ProjectContextValue {
  project: Project | null;
  projects: Project[];
  api: Api;
  selectProject: (id: string) => void;
  refreshProjects: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = "flagforge_selected_project";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [api] = useState(() => createApi(() => getToken()));
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectProject = useCallback(
    (id: string) => {
      const found = projects.find((p) => p.id === id);
      if (found) {
        setProject(found);
        localStorage.setItem(STORAGE_KEY, id);
      }
    },
    [projects]
  );

  const refreshProjects = useCallback(async () => {
    try {
      const list = await api.listProjects();
      setProjects(list);
      const savedId = localStorage.getItem(STORAGE_KEY);
      const saved = savedId ? list.find((p) => p.id === savedId) : null;
      setProject(saved || list[0] || null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    }
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await api.listProjects();
        if (cancelled) return;
        setProjects(list);

        const savedId = localStorage.getItem(STORAGE_KEY);
        const saved = savedId ? list.find((p) => p.id === savedId) : null;
        setProject(saved || list[0] || null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load projects");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <ProjectContext.Provider
      value={{ project, projects, api, selectProject, refreshProjects, loading, error }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
