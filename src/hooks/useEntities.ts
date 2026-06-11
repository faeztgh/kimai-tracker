import { useQuery } from "@tanstack/react-query";
import {
  getActivities,
  getAllActivities,
  getCustomers,
  getProjects,
  getTags,
} from "../api/kimai";
import { useSettings } from "../store/settings";

const STALE = 5 * 60 * 1000;

const PALETTE = [
  "#4caf50",
  "#03a9f4",
  "#9c27b0",
  "#e91e63",
  "#ff9800",
  "#795548",
  "#607d8b",
  "#3f51b5",
  "#009688",
  "#f44336",
  "#673ab7",
  "#2196f3",
];

export function colorForId(id: number, explicit?: string | null): string {
  if (explicit && /^#/.test(explicit)) return explicit;
  return PALETTE[Math.abs(id) % PALETTE.length];
}

export function useCustomers() {
  const configured = useSettings((s) => s.configured);
  const orgId = useSettings((s) => s.activeOrgId);
  return useQuery({
    queryKey: ["customers", orgId],
    queryFn: getCustomers,
    enabled: configured,
    staleTime: STALE,
  });
}

export function useProjects(customerId?: number) {
  const configured = useSettings((s) => s.configured);
  const orgId = useSettings((s) => s.activeOrgId);
  return useQuery({
    queryKey: ["projects", orgId, customerId ?? null],
    queryFn: () => getProjects(customerId),
    enabled: configured,
    staleTime: STALE,
  });
}

export function useTags() {
  const configured = useSettings((s) => s.configured);
  const orgId = useSettings((s) => s.activeOrgId);
  return useQuery({
    queryKey: ["tags", orgId],
    queryFn: getTags,
    enabled: configured,
    staleTime: STALE,
    select: (list): string[] =>
      list
        .map((t) =>
          typeof t === "string" ? t : (t as { name?: unknown })?.name,
        )
        .filter((t): t is string => typeof t === "string" && t.length > 0),
  });
}

export function useActivities(projectId?: number) {
  const configured = useSettings((s) => s.configured);
  const orgId = useSettings((s) => s.activeOrgId);
  return useQuery({
    queryKey: ["activities", orgId, projectId ?? null],
    queryFn: () => getActivities(projectId),
    enabled: configured && projectId !== undefined,
    staleTime: STALE,
  });
}

export function useAllActivities() {
  const configured = useSettings((s) => s.configured);
  const orgId = useSettings((s) => s.activeOrgId);
  return useQuery({
    queryKey: ["activities", orgId, "all"],
    queryFn: getAllActivities,
    enabled: configured,
    staleTime: STALE,
  });
}

export interface EntityLookup {
  project: (id: number) => string;
  activity: (id: number) => string;
  color: (projectId: number) => string;
  activityColor: (activityId: number) => string;
  customerColor: (customerId: number) => string;
  entryColor: (timer: { project: number; activity: number }) => string;
}

export function useEntityLookup(): EntityLookup {
  const configured = useSettings((s) => s.configured);
  const orgId = useSettings((s) => s.activeOrgId);
  const projects = useQuery({
    queryKey: ["projects", orgId, null],
    queryFn: () => getProjects(),
    enabled: configured,
    staleTime: STALE,
  });
  const activities = useQuery({
    queryKey: ["activities", orgId, "all"],
    queryFn: getAllActivities,
    enabled: configured,
    staleTime: STALE,
  });
  const customers = useQuery({
    queryKey: ["customers", orgId],
    queryFn: getCustomers,
    enabled: configured,
    staleTime: STALE,
  });

  return {
    project: (id) => projects.data?.find((p) => p.id === id)?.name ?? `#${id}`,
    activity: (id) =>
      activities.data?.find((a) => a.id === id)?.name ?? `#${id}`,
    color: (id) => {
      const p = projects.data?.find((pr) => pr.id === id);
      return colorForId(id, p?.color);
    },
    activityColor: (activityId) => {
      const a = activities.data?.find((act) => act.id === activityId);
      return colorForId(activityId, a?.color);
    },
    customerColor: (customerId) => {
      const c = customers.data?.find((cu) => cu.id === customerId);
      return colorForId(customerId, c?.color);
    },
    entryColor: (timer) => {
      const a = activities.data?.find((act) => act.id === timer.activity);
      if (a?.color && /^#/.test(a.color)) return a.color;
      const p = projects.data?.find((pr) => pr.id === timer.project);
      if (p?.color && /^#/.test(p.color)) return p.color;
      const cu = p
        ? customers.data?.find((c) => c.id === p.customer)
        : undefined;
      if (cu?.color && /^#/.test(cu.color)) return cu.color;
      return colorForId(timer.project);
    },
  };
}
