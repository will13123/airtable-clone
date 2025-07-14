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
        orderBy: { createdAt: "asc" }
      });
    }),  
  
  getTables: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ input }) => {
      return await db.table.findMany({
        where: { baseId: input.baseId },
        orderBy: { createdAt: "asc" }
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
    .mutation(async ({ input }) => {
      const table = await db.table.findUnique({
        where: { id: input.tableId, baseId: input.baseId },
      });
      if (!table) return;
      await db.base.update({
        where: { id: input.baseId },
        data: { currTable: input.tableId },
      });
    }),
  renameTable: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ input }) => {
      const { tableId, name } = input;
      
      const existingTable = await db.table.findUnique({
        where: { id: tableId },
      });
      
      if (!existingTable) {
        throw new Error("Table not found");
      }
      
      return await db.table.update({
        where: { id: tableId },
        data: { name },
      });
    }),

  deleteTable: protectedProcedure
    .input(
      z.object({
        baseId: z.string(),
        tableId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { baseId, tableId } = input;
      
      const existingTable = await db.table.findUnique({
        where: { id: tableId },
      });
      
      if (!existingTable) {
        throw new Error("Table not found");
      }
      
      // Check if this is the current table
      const base = await db.base.findUnique({
        where: { id: baseId },
        select: { currTable: true },
      });
      
      if (base?.currTable === tableId) {
        const alternativeTable = await db.table.findFirst({
          where: { 
            baseId,
            id: { not: tableId }
          },
          orderBy: { createdAt: 'asc' },
        });
        
        await db.base.update({
          where: { id: baseId },
          data: { currTable: alternativeTable?.id },
        });
        
      }
      
      await db.table.delete({
        where: { id: tableId },
      });
      return;
    }),
  
  rename: protectedProcedure
    .input(z.object({ baseId: z.string(), name: z.string() }))
    .mutation(async ({ input }) => {
      const { baseId, name } = input;
      const base = await db.base.findUnique({
        where: { id: baseId }
      });
      if (!base) {
        throw new Error("Base not found");
      }
      const updatedBase = await db.base.update({
        where: { id: baseId },
        data: { name: name },
      })
      return updatedBase;
    }),
    
  delete: protectedProcedure
  .input(z.object({ baseId: z.string() }))
  .mutation(async ({ input }) => {
    const { baseId } = input;
    const base = await db.base.findUnique({
      where: { id: baseId }
    });
    if (!base) {
      throw new Error("Base not found");
    }
    const deletedBase = await db.base.delete({
      where: { id: baseId },
    });
    return deletedBase;
  })
});