import { analyticsRouter } from "@web/server/routers/analytics";
import { githubRouter } from "@web/server/routers/github";
import { createCallerFactory, router } from "@web/server/trpc";

export const appRouter = router({
  analytics: analyticsRouter,
  github: githubRouter,
});

export type AppRouter = typeof appRouter;

// Server-side caller for use in Server Components
export const serverTrpc = createCallerFactory(appRouter)({});
