import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const tableRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ baseId: z.string(), name: z.string()}))
    .mutation(async ({ ctx, input }) => {
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
      const rows = table?.rows.map((row) => {
        id: row.id
        cells: table.columns.map((column) => {
          const cell = row.cells.find((cell) => cell.columnId == column.id);
          return { columnId: column.id, value: cell?.value ?? ""};
        })
      })
      return rows;
    }),

  getNameFromId: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ input }) => {
      const table = await db.table.findUnique({
        where: {id: input.tableId }
      })
      return table?.name;
    })
});

