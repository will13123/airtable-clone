import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

type RowResponse = {
  id: string;
  cells: {
    cellId: string;
    value: string;
    columnId: string;
    type: string;
  }[];
};


export const viewRouter = createTRPCRouter({
  getVisibleColumns: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .query(async ({ input }) => {
      const view = await db.view.findUnique({
        where: {id: input.viewId },
      })
      if (!view) return []
      return view.visibleColumns;
    }),
  
  getFilters: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .query(async ({ input }) => {
      const view = await db.view.findUnique({
        where: {id: input.viewId },
      })
      if (!view) return []
      return view.filters;
    }),
  
  getSorts: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .query(async ({ input }) => {
      const view = await db.view.findUnique({
        where: {id: input.viewId },
      })
      if (!view) return []
      return view.sort;
    }),
  
  getViewRows: protectedProcedure
  .input(
    z.object({
      viewId: z.string(),
      // cursor: z.string().optional(), // Cursor for pagination 
      // limit: z.number().min(1).max(10000).default(100), // Limit per page
    })
  )
  .query(async ({ input }) => {
    const view = await db.view.findUnique({
      where: { id: input.viewId },
    });
    
    if (!view?.sort) return null;

    const tableId = view.tableId;

    const sortOrders = view.sort.map((sort) => {
      const [columnId, direction] = sort.split(":") as [string, "asc" | "desc"];
      return { columnId, direction };
    });

    const filterOrders = (view.filters).map((filter) => {
      const [columnId, operator, value] = filter.split(":");
      return { columnId, operator, value };
    });

    const columns = await db.column.findMany({
     where: { tableId },
    });

    if (!columns.length) return null;

    // Get all unique column IDs that need joins (from both sorting and filtering)
    const allColumnIds = new Set([
      ...sortOrders.map(sort => sort.columnId),
      ...filterOrders.map(filter => filter.columnId)
    ]);

    // Build joins for both sorting and filtering
    const columnAliasMap = new Map<string, string>();
    let aliasIndex = 0;

    const allJoins = Array.from(allColumnIds).map((columnId) => {
      const alias = `c${aliasIndex}`;
      if (columnId) columnAliasMap.set(columnId, alias);
      aliasIndex++;
      return `LEFT JOIN "Cell" as ${alias} ON r.id = ${alias}."rowId" AND ${alias}."columnId" = '${columnId}'`;
    }).join(' ');

    // Build filter where clauses
    const filterWhereClauses = filterOrders.map((filter) => {
      const alias = filter.columnId ? columnAliasMap.get(filter.columnId) : "";
      const column = columns.find(col => col.id === filter.columnId);
      const isNumber = column?.type === "number";
      const value = filter.value ?? "";

      switch (filter.operator) {
        // Text operators
        case "contains":
          return `LOWER(${alias}.value) LIKE LOWER('%${value}%')`;
        case "not_contains":
          return `(${alias}.value IS NULL OR LOWER(${alias}.value) NOT LIKE LOWER('%${value}%'))`;
        case "equal_to":
          if (isNumber) {
            return `CAST(${alias}.value AS FLOAT) = ${parseFloat(value)}`;
          } else {
            return `LOWER(${alias}.value) = LOWER('${value}')`;
          }
        case "not_equal_to":
          if (isNumber) {
            return `(${alias}.value IS NULL OR CAST(${alias}.value AS FLOAT) != ${parseFloat(value)})`;
          } else {
            return `(${alias}.value IS NULL OR LOWER(${alias}.value) != LOWER('${value}'))`;
          }
        case "is_empty":
          return `(${alias}.value IS NULL OR ${alias}.value = '')`;
        case "is_not_empty":
          return `(${alias}.value IS NOT NULL AND ${alias}.value != '')`;
        
        // Number operators
        case "greater_than":
          return `CAST(${alias}.value AS FLOAT) > ${parseFloat(value)}`;
        case "greater_than_equal":
          return `CAST(${alias}.value AS FLOAT) >= ${parseFloat(value)}`;
        case "less_than":
          return `CAST(${alias}.value AS FLOAT) < ${parseFloat(value)}`;
        case "less_than_equal":
          return `CAST(${alias}.value AS FLOAT) <= ${parseFloat(value)}`;
        
        default:
          return "1=1"; // Default case
      }
    });

    // Build order by clauses 
    const orderByClauses = sortOrders.map((sort) => {
      const alias = columnAliasMap.get(sort.columnId);
      const column = columns.find(col => col.id === sort.columnId);
      const isNumber = column?.type === "number";
      const valueExpression = isNumber ? `CAST(${alias}.value AS FLOAT)` : `LOWER(${alias}.value)`;
      return `${valueExpression} ${sort.direction.toUpperCase()} NULLS LAST`;
    });

    // Add default ordering
    orderByClauses.push('r."createdAt" ASC');


    const baseWhereClause = `r."tableId" = '${tableId}'`;
    const allWhereClauses = [baseWhereClause];

    if (filterWhereClauses.length > 0) {
      allWhereClauses.push(...filterWhereClauses);
    }

    const combinedWhereClause = allWhereClauses.join(' AND ');

    const sortQuery = `
      SELECT r."id" 
      FROM "Row" AS r 
      ${allJoins} 
      WHERE ${combinedWhereClause} 
      ORDER BY ${orderByClauses.join(", ")}
    `;

    const sortedRowIds: { id: string }[] = await db.$queryRawUnsafe(sortQuery);

    if (!sortedRowIds.length) {
      return {
        columns,
        rows: [],
        // nextCursor: null,
      };
    }

    const rowIds = sortedRowIds.map(row => `'${row.id}'`).join(',');
    
    const dataQuery = `
      SELECT 
        r.id,
        json_agg(
          json_build_object(
            'cellId', c.id,
            'tableId', c."tableId",
            'columnId', c."columnId",
            'rowId', c."rowId",
            'value', c.value,
            'type', col."type"
          )
        ) AS cells
      FROM "Row" AS r
      LEFT JOIN "Cell" AS c ON r.id = c."rowId"
      LEFT JOIN "Column" AS col ON c."columnId" = col.id
      WHERE r.id IN (${rowIds})
      GROUP BY r.id
    `;

    const rawRows: { id: string; cells: { cellId: string; tableId: string; columnId: string; rowId: string; value: string; type: string }[] }[] =
      await db.$queryRawUnsafe(dataQuery);

    // Make the correct response type
    const rowsMap = new Map(rawRows.map(row => [row.id, row]));
    
    const rows: RowResponse[] = sortedRowIds.map(({ id }) => {
      const rowData = rowsMap.get(id);
      return {
        id,
        cells: rowData?.cells?.map((cell) => ({
          cellId: cell.cellId,
          value: cell.value,
          columnId: cell.columnId,
          type: cell.type,
        })) ?? [],
      };
    });

    return {
      columns,
      rows,
      // nextCursor,
    };
  }),

  updateSort: protectedProcedure
    .input(
      z.object({
        viewId: z.string(),
        columnId: z.string(),
        direction: z.enum(["asc", "desc"]),
      })
    )
    .mutation(async ({ input }) => {
      const { viewId, columnId, direction } = input;

      const view = await db.view.findUnique({
        where: { id: viewId },
      });
      if (!view) throw new Error("View not found");

      const newSort = `${columnId}:${direction}`;
      const updatedSort = (view.sort || []).filter(
        (sort) => !sort.startsWith(`${columnId}:`)
      ).concat(newSort);

      const updatedView = await db.view.update({
        where: { id: viewId },
        data: { sort: updatedSort },
      });

      return updatedView;
    }),

  removeSort: protectedProcedure
    .input(
      z.object({
        viewId: z.string(),
        columnId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { viewId, columnId } = input;

      const view = await db.view.findUnique({
        where: { id: viewId },
      });
      if (!view) throw new Error("View not found");

      const updatedSort = (view.sort || []).filter(
        (sort) => !sort.startsWith(`${columnId}:`)
      )

      const updatedView = await db.view.update({
        where: { id: viewId },
        data: { sort: updatedSort },
      });

      return updatedView;
    }),
  
  updateFilter: protectedProcedure
    .input(
      z.object({
        viewId: z.string(),
        columnId: z.string(),
        operator: z.string(),
        value: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const { viewId, columnId, operator, value } = input;

      const view = await db.view.findUnique({
        where: { id: viewId },
      });
      if (!view) return;

      const newFilter = `${columnId}:${operator}:${value}`;

      await db.view.update({
        where: { id: viewId },
        data: { filters: [...view.filters, newFilter] },
      });

    }),
  removeFilter: protectedProcedure
    .input(
      z.object({
        viewId: z.string(),
        columnId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { viewId, columnId } = input;

      const view = await db.view.findUnique({
        where: { id: viewId },
      });
      if (!view) throw new Error("View not found");

      const updatedFilters = (view.filters || []).filter(
        (sort) => !sort.startsWith(`${columnId}:`)
      )

      const updatedView = await db.view.update({
        where: { id: viewId },
        data: { filters: updatedFilters },
      });

      return updatedView;
    }),
  
  searchCells: protectedProcedure
    .input(z.object({ 
      viewId: z.string(),
      searchTerm: z.string()
    }))
    .query(async ({ ctx, input }) => {
      if (!input.searchTerm.trim()) {
        return []; 
      }

      const view = await ctx.db.view.findUnique({
        where: { id: input.viewId },
        select: { tableId: true }
      });

      if (!view) {
        throw new Error("View not found");
      }

      const matchingCells = await ctx.db.cell.findMany({
        where: {
          row: {
            tableId: view.tableId
          },
          value: {
            contains: input.searchTerm,
            mode: "insensitive"
          }
        },
        select: {
          id: true,
          value: true,
          columnId: true,
          rowId: true
        }
      });

      return matchingCells;
    }),
  
});
