import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";

import "./main.css";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { queryClient } from "./query-client";
import router from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
