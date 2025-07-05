import { faker } from "@faker-js/faker";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";


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
        value: col.type === "number" ? faker.number.int({ min: 1, max: 10000 }).toString() : faker.lorem.words(3)
      }));
      await db.cell.createMany({
        data: cells,
      });

      return row;
    }),
    
  createMany: protectedProcedure
  .input(z.object({ tableId: z.string() }))
  .mutation(async ({ input }) => {
    const table = await db.table.findUnique({
      where: { id: input.tableId },
      include: { base: true, columns: true }, 
    });
    if (!table) return null;

    const rowsData = Array.from({ length: 10000 }, () => ({
      tableId: input.tableId,
    }));
    
    await db.row.createMany({
      data: rowsData,
      skipDuplicates: true,
    });

    const createdRows = await db.row.findMany({
      where: { tableId: input.tableId },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const allCells = createdRows.flatMap(row => 
      table.columns.map(col => ({
        tableId: input.tableId,
        columnId: col.id,
        rowId: row.id,
        value: col.type === "number" ? faker.number.int({ min: 1, max: 10000 }).toString() : faker.lorem.words(3)
      }))
    );

    await db.cell.createMany({
      data: allCells,
    });

    return;
  }),
    
});
