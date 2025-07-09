import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const tableRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ baseId: z.string(), name: z.string()}))
    .mutation(async ({ input }) => {
      const table = await db.table.create({
        data: {
          name: input.name,
          baseId: input.baseId,
        },
      });
      await db.view.create({
        data: {
          name: "Default View",
          tableId: table.id,
          filters: [],
          sort: []
        },
      });
      return table.id;
    }),

  getNameFromId: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ input }) => {
      const table = await db.table.findUnique({
        where: {id: input.tableId }
      })
      return table?.name;
    }),

    // implement pagination?
  updateCell: protectedProcedure
    .input(z.object({ cellId: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {      
      await db.cell.update({
        where: { id: input.cellId },
        data: { value: input.value },
      })
    }),

  createView: protectedProcedure
    .input(z.object({ tableId: z.string(), name: z.string() }))
    .mutation(async ({ input }) => {
      const view = await db.view.create({
        data: {
          name: input.name,
          tableId: input.tableId,
          filters: [],
          sort: [],
        },
      });
      return view;
    }),
  
  getViews: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ input} ) => {
      const table = await db.table.findUnique({
        where: {id: input.tableId },
        include: {views: true}
      })
      if (!table) return;
      return table.views
    }),

  earliestView: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ input }) => {
      const earliestView = await db.view.findFirst({
        where: { tableId: input.tableId },
        orderBy: { createdAt: "asc" }, 
      });
      return earliestView;
    }),
  
  getCurrView: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ input }) => {
      const table = await db.table.findUnique({
        where: { id: input.tableId },
      });
      if (!table) return "";
      return table.currView;
    }),

  setCurrView: protectedProcedure
    .input(z.object({ tableId: z.string(), viewId: z.string() }))
    .mutation(async ({ input }) => {
      const view = await db.view.findUnique({
        where: { tableId: input.tableId, id: input.viewId },
      });
      if (!view) return;
      await db.table.update({
        where: { id: input.tableId },
        data: { currView: input.viewId },
      });
    }),
  
    getColumns: protectedProcedure
      .input(z.object({ tableId: z.string() }))
      .query(async ({ input }) => {
        const table = await db.table.findUnique({
        where: { id: input.tableId },
        include: { columns: true }
      });
      if (!table) return [];
      return table.columns;
      }),

    renameView: protectedProcedure
      .input(
        z.object({
          viewId: z.string(),
          name: z.string().min(1).max(100),
        })
      )
      .mutation(async ({ input }) => {
        const { viewId, name } = input;
        
        const existingView = await db.view.findUnique({
          where: { id: viewId },
        });
        
        if (!existingView) {
          throw new Error("View not found");
        }
        
        return await db.view.update({
          where: { id: viewId },
          data: { name },
        });
      }),

    deleteView: protectedProcedure
      .input(
        z.object({
          viewId: z.string(),
          tableId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { viewId, tableId } = input;
        
        const existingView = await db.view.findUnique({
          where: { id: viewId },
        });
        
        if (!existingView) {
          throw new Error("View not found");
        }
        
        const viewCount = await db.view.count({
          where: { tableId },
        });
        
        if (viewCount <= 1) {
          throw new Error("Cannot delete the last view");
        }
        
        // Check if this is the current view
        const table = await db.table.findUnique({
          where: { id: tableId },
          select: { currView: true },
        });
        
        if (table?.currView === viewId) {
          const alternativeView = await db.view.findFirst({
            where: { 
              tableId,
              id: { not: viewId }
            },
            orderBy: { createdAt: 'asc' },
          });
          
          if (alternativeView) {
            await db.table.update({
              where: { id: tableId },
              data: { currView: alternativeView.id },
            });
          }
        }
        
        await db.view.delete({
          where: { id: viewId },
        });
        
        return;
      }),
});

