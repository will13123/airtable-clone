import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { baseRouter } from "./routers/base";
import { tableRouter } from "./routers/table";
import { rowRouter } from "./routers/row";
import { columnRouter } from "./routers/column";
import { viewRouter } from "./routers/view";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  base: baseRouter,
  table: tableRouter,
  row: rowRouter,
  column: columnRouter,
  view: viewRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
