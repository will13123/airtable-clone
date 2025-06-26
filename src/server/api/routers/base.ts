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
});