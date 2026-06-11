import { Logo } from "../components/Logo";
import { OrgForm } from "../components/OrgForm";
import { useSettings } from "../store/settings";

export function Setup() {
  const addOrg = useSettings((s) => s.addOrg);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-gray-100 p-5 dark:bg-gray-900">
      <div className="mb-1 flex items-center gap-2.5">
        <Logo className="h-8 w-8" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Connect to Kimai
        </h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Name this organisation and enter its server and API token to get
        started.
      </p>

      <div className="mt-5">
        <OrgForm
          mode="create"
          onSubmit={(value) =>
            addOrg({
              alias: value.alias,
              baseUrl: value.baseUrl,
              authMode: value.authMode,
              username: value.username,
              token: value.token ?? "",
            })
          }
        />
      </div>

      <button
        type="button"
        onClick={() =>
          void window.api.openExternal(
            "https://www.kimai.org/documentation/rest-api.html#api-tokens",
          )
        }
        className="mt-auto pt-4 text-left text-xs text-accent-500 hover:underline dark:text-accent-400"
      >
        How do I create an API token in Kimai? →
      </button>
    </div>
  );
}
