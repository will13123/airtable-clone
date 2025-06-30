import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const viewRouter = createTRPCRouter({
  getVisibleColumns: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .query(async ({ input }) => {
      const view = await db.view.findUnique({
        where: {id: input.viewId },
      })
      if (!view) return []
      return view.visibleColumns;
    }),
  
  getFilters: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .query(async ({ input }) => {
      const view = await db.view.findUnique({
        where: {id: input.viewId },
      })
      if (!view) return []
      return view.filters;
    }),
  
  getSorts: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .query(async ({ input }) => {
      const view = await db.view.findUnique({
        where: {id: input.viewId },
      })
      if (!view) return []
      return view.sort;
    }),
});
