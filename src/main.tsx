import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import Floating from "./windows/Floating";
import { setAccent, setTheme } from "./lib/theme";
import { useSettings } from "./store/settings";
import "./index.css";

setTheme("system");
setAccent("blue");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

window.api.on("data:changed", () => void queryClient.invalidateQueries());

window.api.on("org:changed", () => {
  void useSettings.getState().load();
  void queryClient.invalidateQueries();
});

const Root = window.api.windowLabel === "floating" ? Floating : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </React.StrictMode>,
);
