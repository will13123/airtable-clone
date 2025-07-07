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

// Cursor type that includes values for sorting
type CursorData = {
  id: string;
  sortValues: Record<string, string | null>; // columnId and value
};

function encodeCursor(cursorData: CursorData): string {
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded) as CursorData;
  } catch {
    return null;
  }
}

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
      cursor: z.string().optional(), // Cursor for pagination 
      limit: z.number(), // Limit per page
    })
  )
  .query(async ({ input }) => {
    const view = await db.view.findUnique({
      where: { id: input.viewId },
    });
    

    const tableId = view?.tableId;

    let sortOrders = view?.sort.map((sort) => {
      const [columnId, direction] = sort.split(":") as [string, "asc" | "desc"];
      return { columnId, direction };
    });

    let filterOrders = view?.filters.map((filter) => {
      const [columnId, operator, value] = filter.split(":");
      return { columnId, operator, value };
    });

    filterOrders ??= [];
    sortOrders ??= [];

    const columns = await db.column.findMany({
     where: { tableId },
    });

    if (!columns.length) return null;

    const cursorData = input.cursor ? decodeCursor(input.cursor) : null;

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

    // Add default ordering for consistent pagination
    orderByClauses.push('r."id" ASC');

    const baseWhereClause = `r."tableId" = '${tableId}'`;
    const allWhereClauses = [baseWhereClause];

    if (filterWhereClauses.length > 0) {
      allWhereClauses.push(...filterWhereClauses);
    }

    // Build conditions for cursors and sorts
    if (cursorData) {
      const cursorConditions: string[] = [];
      
      // Build conditions for each sort level
      for (let i = 0; i < sortOrders.length; i++) {
        const sort = sortOrders[i];
        if (!sort) continue;
        const alias = columnAliasMap.get(sort.columnId);
        const column = columns.find(col => col.id === sort.columnId);
        const isNumber = column?.type === "number";
        const cursorValue = cursorData.sortValues[sort.columnId];
        
        if (cursorValue !== undefined) {
          const valueExpression = isNumber ? `CAST(${alias}.value AS FLOAT)` : `LOWER(${alias}.value)`;
          const cursorValueExpression = isNumber ? parseFloat(cursorValue ?? "0") : `LOWER('${cursorValue ?? ""}')`;
          
          const operator = sort.direction === "asc" ? ">" : "<";
          
          // Build condition: (col1 > cursor_val1) OR (col1 = cursor_val1 AND col2 > cursor_val2) OR ...
          const equalityConditions: string[] = [];
          
          // Add equality conditions for all previous sort levels
          for (let j = 0; j < i; j++) {
            const prevSort = sortOrders[j];
            if (!prevSort) continue;
            const prevAlias = columnAliasMap.get(prevSort.columnId);
            const prevColumn = columns.find(col => col.id === prevSort.columnId);
            const prevIsNumber = prevColumn?.type === "number";
            const prevCursorValue = cursorData.sortValues[prevSort.columnId];
            
            if (prevCursorValue !== undefined) {
              const prevValueExpression = prevIsNumber ? `CAST(${prevAlias}.value AS FLOAT)` : `LOWER(${prevAlias}.value)`;
              const prevCursorValueExpression = prevIsNumber ? parseFloat(prevCursorValue ?? "0") : `LOWER('${prevCursorValue ?? ""}')`;
              equalityConditions.push(`${prevValueExpression} = ${prevCursorValueExpression}`);
            }
          }
          
          // Current level condition
          const currentCondition = `${valueExpression} ${operator} ${cursorValueExpression}`;
          
          if (equalityConditions.length > 0) {
            cursorConditions.push(`(${equalityConditions.join(" AND ")} AND ${currentCondition})`);
          } else {
            cursorConditions.push(`(${currentCondition})`);
          }
        } 
      }
      
      // Add final condition for ID (tie-breaker)
      const equalityConditions: string[] = [];
      for (const sort of sortOrders) {
        const alias = columnAliasMap.get(sort.columnId);
        const column = columns.find(col => col.id === sort.columnId);
        const isNumber = column?.type === "number";
        const cursorValue = cursorData.sortValues[sort.columnId];
        
        if (cursorValue !== undefined) {
          const valueExpression = isNumber ? `CAST(${alias}.value AS FLOAT)` : `LOWER(${alias}.value)`;
          const cursorValueExpression = isNumber ? parseFloat(cursorValue ?? "0") : `LOWER('${cursorValue ?? ""}')`;
          equalityConditions.push(`${valueExpression} = ${cursorValueExpression}`);
        }
      }
      
      if (equalityConditions.length > 0) {
        cursorConditions.push(`(${equalityConditions.join(" AND ")} AND r."id" > '${cursorData.id}')`);
      }
      
      if (cursorConditions.length > 0) {
        allWhereClauses.push(`(${cursorConditions.join(" OR ")})`);
      } else {
        allWhereClauses.push(`r."id" > '${cursorData.id}'`);
      }
    }

    const combinedWhereClause = allWhereClauses.join(' AND ');

    // Enhanced sort query that also selects the sort values for cursor creation
    const sortValueSelects = sortOrders.map((sort) => {
      const alias = columnAliasMap.get(sort.columnId);
      return `${alias}.value as sort_${sort.columnId}`;
    });

    const selectClause = sortValueSelects.length > 0 
      ? `r."id", ${sortValueSelects.join(', ')}`
      : `r."id"`;

    const sortQuery = `
      SELECT ${selectClause}
      FROM "Row" AS r 
      ${allJoins} 
      WHERE ${combinedWhereClause} 
      ORDER BY ${orderByClauses.join(", ")}
      LIMIT ${input.limit + 1}
    `;

    const sortedRowIds: ({ id: string } & Record<string, string | null>)[] = await db.$queryRawUnsafe(sortQuery);

    // Determine if there are more results
    const hasNextPage = sortedRowIds.length > input.limit;
    const rowsToReturn = hasNextPage ? sortedRowIds.slice(0, input.limit) : sortedRowIds;
    
    // Create enhanced cursor with sort values
    let nextCursor: string | null = null;
    if (hasNextPage && rowsToReturn.length > 0) {
      const lastRow = rowsToReturn[rowsToReturn.length - 1];
      const sortValues: Record<string, string | null> = {};
      
      sortOrders.forEach((sort) => {
        sortValues[sort.columnId] = lastRow ? lastRow[`sort_${sort.columnId}`] ?? null : null;
      });
      
      const cursorData: CursorData = {
        id: lastRow ? lastRow.id : "",
        sortValues
      };
      
      nextCursor = encodeCursor(cursorData);
    }

    if (!rowsToReturn.length) {
      return {
        columns,
        rows: [],
        nextCursor: null,
      };
    }

    const rowIds = rowsToReturn.map(row => `'${row.id}'`).join(',');
    
    // Modified data query to maintain the sorted order with pagination
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

    const rawRows: { 
      id: string; 
      cells: { 
        cellId: string; 
        tableId: string; 
        columnId: string; 
        rowId: string; 
        value: string; 
        type: string 
      }[] 
    }[] = await db.$queryRawUnsafe(dataQuery);

    // Create a map for efficient lookup
    const rowsMap = new Map(rawRows.map(row => [row.id, row]));
    
    const rows: RowResponse[] = rowsToReturn.map(({ id }) => {
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
      nextCursor,
    };
  }),

  updateSort: protectedProcedure
  .input(
    z.object({
      viewId: z.string(),
      columnId: z.string(),
      direction: z.enum(["asc", "desc"]),
      originalSort: z.string().optional()
    })
  )
  .mutation(async ({ input }) => {
    const { viewId, columnId, direction } = input;
    const originalSort = input.originalSort;

    const view = await db.view.findUnique({
      where: { id: viewId },
    });
    if (!view) throw new Error("View not found");

    const newSort = `${columnId}:${direction}`;
    let updatedSort;

    if (originalSort) {
      // Update existing sort
      updatedSort = (view.sort || []).map(sort => 
        sort === originalSort ? newSort : sort
      );
    } else {
      // Add new sort
      const filteredSort = (view.sort || []).filter(
        (sort) => !sort.startsWith(`${columnId}:`)
      );
      updatedSort = [...filteredSort, newSort];
    }

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
      value: z.string(),
      originalFilter: z.string().optional()
    })
  )
  .mutation(async ({ input }) => {
    const { viewId, columnId, operator, value } = input;
    const originalFilter = input.originalFilter;
    
    const view = await db.view.findUnique({
      where: { id: viewId },
    });
    if (!view) return;

    const newFilter = `${columnId}:${operator}:${value}`;
    let updatedFilters;

    if (originalFilter) {
      updatedFilters = view.filters.map(filter => 
        filter === originalFilter ? newFilter : filter
      );
    } else {
      updatedFilters = [...view.filters, newFilter];
    }

    await db.view.update({
      where: { id: viewId },
      data: { filters: updatedFilters },
    });
  }),
  
  removeFilter: protectedProcedure
    .input(
      z.object({
        viewId: z.string(),
        filter: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { viewId, filter } = input;

      const view = await db.view.findUnique({
        where: { id: viewId },
      });
      if (!view) throw new Error("View not found");

      const updatedFilters = (view.filters || []).filter(
        (sort) => sort !== `${filter}`)
      

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