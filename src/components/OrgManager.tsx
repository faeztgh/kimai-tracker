import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PublicOrg } from "../api/types";
import { useSettings } from "../store/settings";
import { useConfirm } from "./ConfirmDialog";
import { OrgForm } from "./OrgForm";
import { Button } from "./ui";

type Mode = { kind: "list" } | { kind: "add" } | { kind: "edit"; id: string };

export function OrgManager() {
  const { t } = useTranslation();
  const organisations = useSettings((s) => s.organisations);
  const activeOrgId = useSettings((s) => s.activeOrgId);
  const addOrg = useSettings((s) => s.addOrg);
  const updateOrg = useSettings((s) => s.updateOrg);
  const removeOrg = useSettings((s) => s.removeOrg);
  const switchOrg = useSettings((s) => s.switchOrg);
  const confirm = useConfirm();
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  async function remove(org: PublicOrg) {
    const ok = await confirm({
      title: `${t("org.confirmRemove")} ${org.alias}`,
      message: t("org.confirmRemoveMsg"),
      confirmLabel: t("org.removeOrg"),
      danger: true,
    });
    if (ok) await removeOrg(org.id);
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
      {organisations.map((org) => {
        const isActive = org.id === activeOrgId;
        const isEditing = mode.kind === "edit" && mode.id === org.id;
        return (
          <div key={org.id} className="px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  isActive ? "bg-accent-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                  {org.alias}
                </p>
                <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                  {org.baseUrl}
                </p>
              </div>
              {isActive ? (
                <span className="shrink-0 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">
                  {t("org.active")}
                </span>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => void switchOrg(org.id)}
                >
                  {t("org.switchOrg")}
                </Button>
              )}
              <button
                type="button"
                title={t("org.editOrgTooltip")}
                onClick={() =>
                  setMode(
                    isEditing ? { kind: "list" } : { kind: "edit", id: org.id },
                  )
                }
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
              <button
                type="button"
                title={t("org.removeOrgTooltip")}
                onClick={() => void remove(org)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </div>

            {isEditing && (
              <div className="mt-3">
                <OrgForm
                  mode="edit"
                  initial={{
                    alias: org.alias,
                    baseUrl: org.baseUrl,
                    authMode: org.authMode,
                    username: org.username,
                  }}
                  onSubmit={async (value) => {
                    await updateOrg(org.id, {
                      alias: value.alias,
                      baseUrl: value.baseUrl,
                      authMode: value.authMode,
                      username: value.username,
                      token: value.token,
                    });
                    setMode({ kind: "list" });
                  }}
                  onCancel={() => setMode({ kind: "list" })}
                />
              </div>
            )}
          </div>
        );
      })}

      <div className="px-3 py-2.5">
        {mode.kind === "add" ? (
          <OrgForm
            mode="create"
            submitLabel={t("org.addOrg")}
            onSubmit={async (value) => {
              await addOrg({
                alias: value.alias,
                baseUrl: value.baseUrl,
                authMode: value.authMode,
                username: value.username,
                token: value.token ?? "",
              });
              setMode({ kind: "list" });
            }}
            onCancel={() => setMode({ kind: "list" })}
          />
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setMode({ kind: "add" })}
          >
            + {t("org.addOrg")}
          </Button>
        )}
      </div>
    </div>
  );
}
