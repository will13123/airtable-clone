"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { api } from "~/trpc/react";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import EditColumn from "./editColumn";

type RowType = { 
  id: string, 
  cells: CellType[]; 
}

type CellType = {
  cellId: string | undefined;
  value: string;
  columnId: string;
  type: string;
}

type MatchingCell = {
  id: string;
  value: string;
  columnId: string;
  rowId: string;
}

type SearchMatch = {
  cellId: string;
  rowIndex: number;
  columnId: string;
  value: string;
}

const columnHelper = createColumnHelper<RowType>();

// Configuration
const PAGE_SIZE = 500;
const PREFETCH_THRESHOLD = 3000;

export default function CurrentView({ 
  viewId, 
  tableId, 
  hiddenColumns,
  currentMatchIndex,
  matchingCells,
  setNumMatchingCells
}: { 
  viewId: string, 
  tableId: string,
  hiddenColumns: string[],
  searchTerm: string,
  currentMatchIndex: number,
  matchingCells: MatchingCell[],
  setNumMatchingCells: (value: number) => void
}) {
  const utils = api.useUtils();
  
  const [allColumns, setAllColumns] = useState<Array<{id: string; name: string; type: string}>>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const queryClient = useQueryClient();
  
  // Use ref to store the setter to avoid adding it to useEffect dependencies
  const setNumMatchingCellsRef = useRef(setNumMatchingCells);
  
  // Update ref when prop changes
  useEffect(() => {
    setNumMatchingCellsRef.current = setNumMatchingCells;
  }, [setNumMatchingCells]);
  
  // Infinite query for cursor-based pagination
  const {
    data: paginatedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['viewRows', viewId],
    queryFn: async ({ pageParam }) => {
      const result = await utils.view.getViewRows.fetch({
        viewId,
        cursor: pageParam,
        limit: PAGE_SIZE
      });
      
      // Set columns on first fetch
      if (!hasInitialized && result?.columns) {
        setAllColumns(result.columns);
        setHasInitialized(true);
      }
      
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
    enabled: true,
  });

  // Flatten all rows from pages
  const allRows = useMemo(() => {
    return paginatedData?.pages.flatMap(page => page?.rows ?? []) ?? [];
  }, [paginatedData]);

  const totalRows = allRows.length;

  const { data: sorts } = api.view.getSorts.useQuery({ viewId });
  const { data: filters } = api.view.getFilters.useQuery({ viewId });

  // Create a set of matching cell IDs for O(1) lookup
  const matchingCellIds = useMemo(() => 
    new Set(matchingCells?.map(cell => cell.id) ?? []),
    [matchingCells]
  );

  const visibleColumns = useMemo(() => 
    allColumns.filter(column => !hiddenColumns.includes(column.id)),
    [allColumns, hiddenColumns]
  );

  // Build search index whenever rows or search results change
  useEffect(() => {
    if (!matchingCells.length || !allRows.length) {
      setSearchMatches([]);
      setNumMatchingCellsRef.current(0);
      return;
    }

    const visibleColumnIds = new Set(visibleColumns.map(col => col.id));

    const matches: SearchMatch[] = [];
    
    // Iterate through rows and check each cell
    allRows.forEach((row, rowIndex) => {
      row.cells.forEach((cell) => {
        if (cell.cellId && 
            matchingCellIds.has(cell.cellId) && 
            visibleColumnIds.has(cell.columnId)) {
          matches.push({
            cellId: cell.cellId,
            rowIndex,
            columnId: cell.columnId,
            value: cell.value
          });
        }
      });
    });

    setSearchMatches(matches);
    setNumMatchingCellsRef.current(matches.length);
  }, [allRows, matchingCells, matchingCellIds, visibleColumns]);

  // Refetch when dependencies change
  useEffect(() => {
    if (viewId) {
      setHasInitialized(false);
      void refetch();
      void queryClient.invalidateQueries({ 
        queryKey: ['viewRows', viewId] 
      })
    }
  }, [viewId, JSON.stringify(sorts), JSON.stringify(filters), refetch]);

  // Mutations
  const createRow = api.row.create.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });
  
  const createColumn = api.column.create.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.table.getColumns.invalidate({ tableId });
    }
  });
  
  const createManyRows = api.row.createMany.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });
  
  const updateCell = api.table.updateCell.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const [columnDropdownIsOpen, setColumnDropdownIsOpen] = useState(false);
  const [type, setType] = useState("");
  const [columnName, setColumnName] = useState("");

  const handleColumnDropdown = useCallback(() => {
    setColumnDropdownIsOpen(!columnDropdownIsOpen);
  }, [columnDropdownIsOpen]);



  const sortColumnIds = useMemo(() => 
    sorts?.map((sort) => sort.split(":")[0] ?? "") ?? [],
    [sorts]
  );
  
  const filterColumnIds = useMemo(() => 
    filters?.map((filter) => filter.split(":")[0] ?? "") ?? [],
    [filters]
  );

  // Tanstack Virtualization
  const scrollRef = useRef<HTMLTableSectionElement>(null);
  const virtualizer = useVirtualizer({
    count: totalRows,
    estimateSize: () => 45,
    getScrollElement: () => scrollRef.current,
    overscan: 100,
    horizontal: false,
    measureElement: () => 45,
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Fetch more data when approaching the end of scroll
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const lastVirtualRow = virtualRows[virtualRows.length - 1];
    if (lastVirtualRow && lastVirtualRow.index >= totalRows - PREFETCH_THRESHOLD) {
      void fetchNextPage();
    }
  }, [virtualRows, totalRows, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Scroll to current match when it changes
  useEffect(() => {
    if (searchMatches.length > 0 && currentMatchIndex >= 0 && currentMatchIndex < searchMatches.length) {
      const currentMatch = searchMatches[currentMatchIndex];
      if (currentMatch) {
        virtualizer.scrollToIndex(currentMatch.rowIndex, {
          align: 'center',
          behavior: 'smooth'
        });
      }
    }
  }, [currentMatchIndex, virtualizer]);

  // Editable Cell component
  const EditableCell = React.memo(({
    initialValue,
    cell,
    rowNumber,
    isFirstColumn = false,
    isHighlighted,
    isCurrentMatch,
    sortColumnIds,
    filterColumnIds,
  }: {
    initialValue: string;
    cell: CellType;
    rowNumber?: number;
    isFirstColumn?: boolean;
    isHighlighted?: boolean;
    isCurrentMatch?: boolean;
    sortColumnIds?: string[];
    filterColumnIds?: string[];    
  }) => {
    const [value, setValue] = useState(initialValue);
    const [originalValue, setOriginalValue] = useState(initialValue);
    
    const regex = useMemo(() => {
      return cell?.type === "text" ? /^[a-zA-Z]+$/ : /^\d+$/;
    }, [cell?.type]);

    useEffect(() => {
      setValue(initialValue);
      setOriginalValue(initialValue);
    }, [initialValue]);

    const handleBlur = useCallback(() => {
      if (cell.cellId && originalValue !== value) {
        if (regex.test(value)) {
          updateCell.mutate({
            cellId: cell.cellId,
            value,
          });
          setOriginalValue(value);
        } else {
          alert(`Please input only ${cell.type === "text" ? "letters" : "numbers"}`);
          setValue(originalValue);
        }
      }
    }, [cell.cellId, cell.type, value, regex, originalValue, updateCell]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    }, []);

    return (
      <div className="flex items-center h-full">
        {isFirstColumn && (
          <div className="text-center text-sm text-gray-400 w-[50px] flex-shrink-0">
            {rowNumber}
          </div>
        )}
        <input
          className={`w-full h-full p-2 border-0 text-right text-sm rounded-none ${
            sortColumnIds?.includes(cell.columnId) ? "bg-orange-100" : ""
          } ${
            filterColumnIds?.includes(cell.columnId) ? "bg-green-100" : ""
          } ${
            isCurrentMatch ? "bg-yellow-300" : 
            isHighlighted ? "bg-yellow-200" : ""
          }`}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </div>
    );
  });
  EditableCell.displayName = 'EditableCell';

  const tableColumns = useMemo(
    () => [
      ...visibleColumns.map((column, index) =>
        columnHelper.accessor(
          (row) => {
            const cell = row.cells.find((cell) => cell.columnId === column.id);
            return cell?.value ?? "";
          },
          {
            id: column.id,
            header: `${column.name}`,
            meta: { type: column.type, isFirstColumn: index === 0 },
            size: 200,
            cell: (info) => {
              const initialValue = info.getValue();
              const row = info.row.original;
              const column = info.column.columnDef;
              const cell = row.cells.find((c) => c.columnId === column.id);
              
              const visibleColumnIds = visibleColumns.map(col => col.id);
              const isFirstColumn = visibleColumnIds.indexOf(column.id!) === 0;
              const rowNumber = info.row.index + 1;
              const isHighlighted = matchingCellIds.has(cell?.cellId ?? "");
              
              // Check if this is the current match using our search index
              const currentMatch = searchMatches[currentMatchIndex];
              const isCurrentMatch = currentMatch?.cellId === cell?.cellId;
              
              return (
                <EditableCell
                  initialValue={initialValue}
                  cell={cell ?? { cellId: "", value: "", columnId: "", type: ""}}
                  rowNumber={rowNumber}
                  isFirstColumn={isFirstColumn}
                  isHighlighted={isHighlighted}
                  isCurrentMatch={isCurrentMatch}
                  sortColumnIds={sortColumnIds} 
                  filterColumnIds={filterColumnIds}
                />
              );
            },
          }
        )
      ),
    ],
    [visibleColumns, matchingCellIds, searchMatches, currentMatchIndex, sortColumnIds, filterColumnIds]
  );

  const handleCreateRow = useCallback(() => {
    createRow.mutate({ tableId });
  }, [createRow, tableId]);

  const handleCreateManyRows = useCallback(() => {
    createManyRows.mutate({ tableId });
  }, [createManyRows, tableId]);

  // Table Creation
  const table = useReactTable({
    data: allRows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: false,
  });

  // Creating column
  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setColumnDropdownIsOpen(false);
    if (type === "text" || type === "number") {
      createColumn.mutate({ tableId, type, name: columnName });
    } else {
      alert("Enter a valid type");
    }
    setType("");
    setColumnName("");
  }, [type, columnName, createColumn, tableId]);

  if (isLoading) return <div className="text-center text-gray-600 text-xl">Loading...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden flex-1">
      
      {/* Main Table */}
      <div className="flex flex-col h-[80dvh]">
        <div 
          ref={scrollRef} 
          className="h-[80dvh] w-full overflow-auto flex-1 border border-gray-200 border-b-1 relative"
        >
          <table
            className="h-full text-left rtl:text-right text-gray-500 relative bg-white"
            style={{ 
              height: virtualizer.getTotalSize() + "px",
              tableLayout: "fixed",
            }}
          >
            {/* Sticky Header */}
            <thead 
              className="text-gray-400 sticky top-0 z-20 bg-white shadow-sm" 
              style={{ width: "100%" }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b">
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className={`p-2 text-left text-sm border-r bg-white ${
                        index === 0 ? 'sticky left-0 z-30' : ''
                      }`}
                      style={{
                        width: "200px",
                        minWidth: "200px",
                        maxWidth: "200px",
                        height: '45px'
                      }}
                    >
                      <div className="inline-block">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                      <EditColumn columnId={header.column.id} viewId={viewId} onUpdate={() => refetch()}/>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody 
              className="w-full relative" 
              style={{ height: virtualizer.getTotalSize(), width: "100%" }}
            >
              {virtualRows.map((virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index];
                if (!row) return null;
                return (
                  <tr
                    key={row.id}
                    className="bg-white border border-gray-200"
                    style={{
                      height: '45px',
                      transform: `translateY(${virtualRow.start}px)`,
                      position: 'absolute',
                      top: 0,
                      left: -1,
                      width: '100%',
                    }}
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <td 
                        key={cell.id} 
                        className={`border-r h-[45px] ${
                          index === 0 ? 'sticky left-0 z-10 bg-white' : ''
                        }`}
                        style={{
                          width: "200px",
                          minWidth: "200px",
                          maxWidth: "200px",
                          height: '45px'
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, {
                          ...cell.getContext(),
                        })}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Create row/column section*/}
        <div className="flex flex-row">
          <button
            className="py-2 px-4 text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer text-xl gap-2"
            onClick={handleCreateRow}
          >
            Create Row
          </button>
          <div className="relative inline-block">
            <button
              onClick={handleColumnDropdown}
              className="py-2 px-4 text-gray-600 hover:text-gray-700 focus:outline-none border-l-2 border-gray-300 cursor-pointer text-xl gap-2"
            >
              Create Column
            </button>
            <div
              className={`absolute left-0 bottom-full w-70 mb-2 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-10 ${
                columnDropdownIsOpen ? 'block' : 'hidden'
              }`}
            >
              <ul className="py-1 text-sm text-gray-700">
                <li>
                  <form onSubmit={handleFormSubmit} className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Column Name"
                      value={columnName}
                      onChange={(e) => setColumnName(e.target.value)}
                      className="w-full rounded-md mb-2 bg-white px-4 py-2 text-black border-gray-200 border-1"
                    />
                    <input
                      type="text"
                      placeholder="Enter 'text' or 'number'"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full rounded-md mb-2 bg-white px-4 py-2 text-black border-gray-200 border-1"
                    />
                    <button
                      type="submit"
                      className="rounded-md mb-4 bg-blue-400 text-white px-4 py-2 font-semibold transition hover:bg-blue-400 shadow cursor-pointer"
                      disabled={createColumn.isPending}
                    >
                      {createColumn.isPending ? "Creating..." : "Create"}
                    </button>
                  </form>
                </li>
                <li>
                  <button
                    onClick={handleColumnDropdown}
                    className="block w-full rounded-md text-left px-4 py-2 hover:bg-gray-100 border-gray-200 border-1"
                  >
                    Close
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <button
            className="py-2 px-4 text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer text-xl gap-2 border-l-2 border-gray-300"
            onClick={handleCreateManyRows}
          >
            Create 100K Rows
          </button>
        </div>
      </div>
      {totalRows === 0 && !isLoading && <p className="mt-2 text-center">No rows available</p>}
    </div>
  );
}