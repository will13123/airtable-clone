import type { View } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const columnRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ tableId: z.string(), type: z.string(), name: z.string() }))
    .mutation(async ({ input }) => {
      const col = await db.column.create({
        data: {
          tableId: input.tableId,
          type: input.type,
          name: input.name,
        },
      });

      const table = await db.table.findUnique({
        where: { id: input.tableId },
        include: { base: true, rows: true }, 
      });
      if (!table) return null;
      const cells = table.rows.map((row) => ({
        tableId: input.tableId,
        columnId: col.id,
        rowId: row.id,
        value: "", 
      }));
      await db.cell.createMany({
        data: cells,
      });
      return col;
    }),
  
  getType: protectedProcedure
    .input(z.object({ columnId: z.string() }))
    .query(async ({ input }) => {
      if (input.columnId === "id") return "";
      const column = await db.column.findUnique({
        where: { id: input.columnId },
      });
      return column?.type;
    })
});
