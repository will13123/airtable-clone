import { faker } from "@faker-js/faker";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";


export const rowRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ input }) => {
      if (input.tableId === '') return;
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
    if (input.tableId === '') return;
    const table = await db.table.findUnique({
      where: { id: input.tableId },
      include: { base: true, columns: true }, 
    });
    if (!table) return null;

    const BATCH_SIZE = 5000; 
    const TOTAL_ROWS = 100000;
    const batches = Math.ceil(TOTAL_ROWS / BATCH_SIZE);

    // Pre-generate all fake data
    const generatedDate = {
      numbers: Array.from({ length: TOTAL_ROWS * table.columns.length }, () => 
        faker.number.int({ min: 1, max: 10000 }).toString()
      ),
      texts: Array.from({ length: TOTAL_ROWS * table.columns.length }, () => 
        faker.lorem.words(3)
      )
    };

    let numberIndex = 0;
    let textIndex = 0;

    // Process in batches 
    for (let i = 0; i < batches; i++) {
      const batchStart = i * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_ROWS);
      const batchSize = batchEnd - batchStart;

      const rowsData = Array.from({ length: batchSize }, () => ({
        tableId: input.tableId,
      }));
      
      await db.row.createMany({
        data: rowsData,
      });

      const createdRows = await db.row.findMany({
        where: { tableId: input.tableId },
        orderBy: { createdAt: 'desc' },
        take: batchSize,
      });

      const allCells = [];
      for (const row of createdRows) {
        for (const col of table.columns) {
          const value = col.type === "number" 
            ? generatedDate.numbers[numberIndex++] 
            : generatedDate.texts[textIndex++];
          
          allCells.push({
            tableId: input.tableId,
            columnId: col.id,
            rowId: row.id,
            value: value
          });
        }
      }

      await db.cell.createMany({
        data: allCells,
      });
    }

    return;
  }),
    
});
