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
          baseId: input.baseId
        },
      });
      return table;
    }),

  getRows: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ input }) => {
      const table = await db.table.findUnique({
        where: { id: input.tableId },
        include:{ rows: { include: { cells: true } }, columns: true },
      });
      if (!table) return null
      const rows = table.rows.map((row) => ({
        id: row.id,
        cells: table.columns.map((column) => {
          const cell = row.cells.find((c) => c.columnId === column.id);
          return { columnId: column.id, type: column.type, value: cell?.value ?? "", cellId: cell?.id };
        }),
      }));
      return { rows, columns: table.columns };
    }),

  getNameFromId: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ input }) => {
      const table = await db.table.findUnique({
        where: {id: input.tableId }
      })
      return table?.name;
    }),

  updateCell: protectedProcedure
    .input(z.object({ cellId: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {      
      await db.cell.update({
        where: { id: input.cellId },
        data: { value: input.value },
      })
    }),
});

