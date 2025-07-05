import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { faker } from "@faker-js/faker";


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

      // Process rows using cursor-based pagination
      const batchSize = 10000; 
      let cursorId: string | null = null;

      while (true) {
        // Fetch a batch of row IDs
        const rows: { id: string }[] = await db.row.findMany({
          where: { tableId: input.tableId },
          select: { id: true },
          take: batchSize,
          ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}), 
          orderBy: { id: "asc" }, 
        });

        if (rows.length === 0) break;

        const cells = rows.map((row) => ({
          tableId: input.tableId,
          columnId: col.id,
          rowId: row.id,
          value: input.type === "number" ? faker.number.int({ min: 1, max: 10000 }).toString() : faker.lorem.words(3)
,
        }));

        await db.cell.createMany({
          data: cells,
        });

        cursorId = rows[rows.length - 1]!.id;
      }

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
