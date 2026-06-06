import { useMemo } from "react";
import type { PickerOption } from "../components/Picker";
import { colorForId, useActivities, useCustomers, useProjects } from "./useEntities";

export function useProjectOptions(): { options: PickerOption[]; loading: boolean } {
  const customers = useCustomers();
  const projects = useProjects();

  const options = useMemo<PickerOption[]>(() => {
    const names = new Map((customers.data ?? []).map((c) => [c.id, c.name]));
    return (projects.data ?? []).map((p) => ({
      id: p.id,
      label: p.name,
      color: colorForId(p.id, p.color),
      group: names.get(p.customer) ?? p.parentTitle ?? undefined,
    }));
  }, [projects.data, customers.data]);

  return { options, loading: projects.isLoading };
}

export function useActivityOptions(projectId?: number): {
  options: PickerOption[];
  loading: boolean;
} {
  const activities = useActivities(projectId);

  const options = useMemo<PickerOption[]>(
    () =>
      (activities.data ?? []).map((a) => ({
        id: a.id,
        label: a.name,
        color: colorForId(a.id, a.color),
      })),
    [activities.data],
  );

  return { options, loading: activities.isLoading };
}
