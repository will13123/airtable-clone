import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const baseRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const base = await db.base.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
        },
      });
      return base;
    }),
  
  getAll: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await db.base.findMany({
        where: { userId: input.userId },
      });
    }),  
  
  getTables: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ input }) => {
      return await db.table.findMany({
        where: { baseId: input.baseId },
      });
    }),

  earliestTable: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ input }) => {
      const earliestTable = await db.table.findFirst({
        where: { baseId: input.baseId },
        orderBy: { createdAt: "asc" }, 
      });
      return earliestTable;
    }),
  
  getCurrTable: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ input }) => {
      const base = await db.base.findUnique({
        where: { id: input.baseId }
      })
      if (!base) return null;
      return base.currTable
    }),

  setCurrTable: protectedProcedure
    .input(z.object({ baseId: z.string(), tableId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const table = await db.table.findUnique({
        where: { id: input.tableId, baseId: input.baseId },
      });
      if (!table) return;
      await db.base.update({
        where: { id: input.baseId },
        data: { currTable: input.tableId },
      });
    }),
});