import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./main.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import router from "./router";
import { queryClient } from "./query-client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
