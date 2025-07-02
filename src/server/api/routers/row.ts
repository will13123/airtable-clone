import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { randomString } from "./column";


export const rowRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ input }) => {
      const row = await db.row.create({
        data: {
          tableId: input.tableId,
        },
      });
      
      const table = await db.table.findUnique({
        where: { id: input.tableId },
        include: { base: true, columns: true }, 
      });
      if (!table) return null;
      const cells = table.columns.map((col) => ({
        tableId: input.tableId,
        columnId: col.id,
        rowId: row.id,
        value: (col.type === "number") ? Math.floor(Math.random() * 1000).toString() : randomString(), 
      }));
      await db.cell.createMany({
        data: cells,
      });

      return row;
    }),

    
});
