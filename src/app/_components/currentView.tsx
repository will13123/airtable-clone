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
import CreateRow from "./createRow";
import CreateColumn from "./createColumn";

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

type PageData = {
  rows: RowType[];
  nextCursor?: string;
  columns?: Array<{id: string; name: string; type: string}>;
}

type InfiniteQueryData = {
  pages: PageData[];
  pageParams: (string | undefined)[];
}

const validateCellValue = (value: string, type: string): boolean => {
  if (value === "") return true;
  
  if (type === "text") {
    return true;
  }
  
  if (type === "number") {
    return /^\d+$/.test(value);
  }
  
  return true;
};

const keyAllowed = (key: string, ctrlKey: boolean): boolean => {
  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  ];
  
  return allowedKeys.includes(key) || 
    ctrlKey || 
    (key >= '0' && key <= '9');
};

// Helper functions

const columnHelper = createColumnHelper<RowType>();

// Configuration
const PAGE_SIZE = 500;
const PREFETCH_THRESHOLD = 3000;

export default function CurrentView({ 
  viewId, 
  tableId, 
  currentMatchIndex,
  matchingCells,
  setNumMatchingCells,
  hasInitialised,
  setHasInitialised
}: { 
  viewId: string, 
  tableId: string,
  currentMatchIndex: number,
  matchingCells: MatchingCell[],
  setNumMatchingCells: (value: number) => void,
  hasInitialised: boolean,
  setHasInitialised: (value: boolean) => void,
}) {
  const utils = api.useUtils();
  const { data: hiddenColumns } = api.view.getHiddenColumns.useQuery({ viewId });
  
  const [allColumns, setAllColumns] = useState<Array<{id: string; name: string; type: string}>>([]);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const queryClient = useQueryClient();
  
  // Reset state when viewId changes
  useEffect(() => {
    setHasInitialised(false);
    setAllColumns([]);
    setSearchMatches([]);
    void queryClient.invalidateQueries({ queryKey: ['viewRows', viewId] });
    void utils.view.getViewRows.invalidate({ viewId });
  }, [viewId]);

  
  
  // Infinite query for cursor-based pagination
  const {
    data: paginatedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['viewRows', viewId],
    queryFn: async ({ pageParam }) => {
      const result = await utils.view.getViewRows.fetch({
        viewId,
        cursor: pageParam,
        limit: PAGE_SIZE
      });
      // Only set columns if we haven't initialised for this specific view and have valid columns
      if (!hasInitialised && result?.columns && result.columns.length > 0) {
        setAllColumns(result.columns);
        setHasInitialised(true);
      }
      
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
    enabled: true,
    staleTime: 5000, // Prevent unnecessary refetches when switching rapidly
  });

  useEffect(() => {
  if (!isLoading && !hasInitialised && paginatedData?.pages?.length) {
    // Check if we have valid data but haven't initialised
    const firstPage = paginatedData.pages[0];
    if (firstPage?.columns && firstPage.columns.length > 0) {
      setAllColumns(firstPage.columns);
      setHasInitialised(true);
    } else {
      // If no columns in first page, try to refetch
      void queryClient.refetchQueries({ queryKey: ['viewRows', viewId] });
    }
  }
}, [isLoading, hasInitialised, paginatedData, queryClient, viewId, setHasInitialised]);

  // Flatten all rows from pages
  const allRows = useMemo(() => {
    return paginatedData?.pages.flatMap(page => page?.rows ?? []) ?? [];
  }, [paginatedData]);

  const { data: sorts } = api.view.getSorts.useQuery({ viewId });
  const { data: filters } = api.view.getFilters.useQuery({ viewId });

  // Create a set of matching cell IDs for O(1) lookup
  const matchingCellIds = useMemo(() => 
    new Set(matchingCells?.map(cell => cell.id) ?? []),
    [matchingCells]
  );

  const visibleColumns = useMemo(() => 
    allColumns.filter(column => !hiddenColumns?.includes(column.id)),
    [allColumns, hiddenColumns]
  );

  // Build search index whenever rows or search results change
useEffect(() => {
  if (!matchingCells.length || !allRows.length) {
    setSearchMatches([]);
    setNumMatchingCells(0);
    return;
  }

  setNumMatchingCells(matchingCells.length);

  const matches: SearchMatch[] = [];
  
  allRows.forEach((row, rowIndex) => {
    row.cells.forEach((cell) => {
      if (cell.cellId && matchingCellIds.has(cell.cellId)) {
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
}, [allRows, matchingCells, matchingCellIds, setNumMatchingCells]);

  const updateCell = api.table.updateCell.useMutation({
    onSuccess: (data, variables: { cellId: string; value: string }) => {
      // Update the cache after successful cell edit to keep changes
      queryClient.setQueryData<InfiniteQueryData>(['viewRows', viewId], (oldData) => {
        if (!oldData?.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: PageData) => ({
            ...page,
            rows: page.rows.map((row: RowType) => ({
              ...row,
              cells: row.cells.map((cell: CellType) => 
                cell.cellId === variables.cellId 
                  ? { ...cell, value: variables.value }
                  : cell
              )
            }))
          }))
        };
      });
      void utils.view.searchCells.invalidate({ viewId });
    },
  });

  const sortColumnIds = useMemo(() => 
    sorts?.map((sort) => sort.split(":")[0] ?? "") ?? [],
    [sorts]
  );
  
  const filterColumnIds = useMemo(() => 
    filters?.map((filter) => filter.split(":")[0] ?? "") ?? [],
    [filters]
  );

  const handleCellUpdate = useCallback((cellId: string, value: string, type: string) => {
    if (validateCellValue(value, type)) {
      updateCell.mutate({ cellId, value });
    } else {
      alert(`Please input only ${type === "text" ? "letters" : "numbers"}`);
    }
  }, [updateCell]);

  // Tanstack Virtualization
  const scrollRef = useRef<HTMLTableSectionElement>(null);
  const virtualizer = useVirtualizer({
    count: allRows.length,
    estimateSize: () => 45,
    getScrollElement: () => scrollRef.current,
    overscan: 200,
    horizontal: false,
    measureElement: () => 45,
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Fetch more data when approaching the end of scroll
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const lastVirtualRow = virtualRows[virtualRows.length - 1];
    if (lastVirtualRow && lastVirtualRow.index >= allRows.length - PREFETCH_THRESHOLD) {
      void fetchNextPage();
    }
  }, [virtualRows, allRows.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

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
  }, [currentMatchIndex, searchMatches, virtualizer]);

  const createRow = api.row.create.useMutation({
    onSuccess: () => {
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void utils.view.getViewRows.invalidate({ viewId });
    },
  });

  const handleCreateRowClick = useCallback(() => {
    createRow.mutate({ tableId });
    createRow.mutate({ tableId: '' });
  }, [createRow, tableId]);

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

    useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);

    const handleBlur = useCallback(() => {
      if (cell.cellId) {
        handleCellUpdate(cell.cellId, value, cell.type);
      }
    }, [cell.cellId, cell.type, value]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (cell?.type === "number") {
        if (!keyAllowed(e.key, e.ctrlKey)) {
          e.preventDefault();
        }
      }
    }, [cell?.type]);

    // Helper function to get the correct background color
    const getBackgroundColor = () => {
      if (isCurrentMatch) return "bg-yellow-300 group-hover:bg-yellow-400";
      if (isHighlighted) return "bg-yellow-200 group-hover:bg-yellow-300";
      if (sortColumnIds?.includes(cell.columnId)) return "bg-orange-100 group-hover:bg-orange-200";
      if (filterColumnIds?.includes(cell.columnId)) return "bg-green-100 group-hover:bg-green-200";
      return "";
    };

    const backgroundColorClass = getBackgroundColor();

    return (
      <div className="flex items-center h-full">
        {isFirstColumn && (
          <div className={`text-center text-sm text-gray-400 w-[50px] h-full flex-shrink-0 flex items-center justify-center ${backgroundColorClass}`}>
            {rowNumber}
          </div>
        )}
        <input
          className={`w-full h-full px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${backgroundColorClass}`}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
              
              // Check if this is the current match using search index
              const currentMatch = searchMatches[currentMatchIndex];
              const isCurrentMatch = currentMatch ? currentMatch?.cellId === cell?.cellId : false;
              
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
    [visibleColumns, matchingCellIds, searchMatches, currentMatchIndex, EditableCell, sortColumnIds, filterColumnIds]
  );

  // Table Creation
  const table = useReactTable({
    data: allRows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: false,
  });

  // if (!isLoading && !hasInitialised) {
  //   // Reinitialise everything
  //   void queryClient.invalidateQueries({ queryKey: ['viewRows', viewId] });
  //   void utils.view.getViewRows.invalidate({ viewId });
    
  //   setAllColumns([]);
  //   setSearchMatches([]);
  // }

  // Enhanced loading check - ensure we have both data and columns initialised
  if (isLoading || !hasInitialised || allColumns.length === 0) {
    return <div className="text-center text-gray-600 text-xl">Loading...</div>;
  }

  return (
    <div className="flex flex-col overflow-hidden h-[85vh] relative flex-1">
      
      {/* Main Table */}
      <div className="flex flex-col h-[85vh]">
        <div 
          ref={scrollRef} 
          className="w-full overflow-auto h-[85vh] border-gray-200 shadow-sm relative bg-gray-100"
        >
          <table
            className="h-full text-left rtl:text-right text-gray-500 relative bg-white"
            style={{ 
              height: virtualizer.getTotalSize() + "px",
              tableLayout: "fixed",
              borderCollapse: "separate",
              borderSpacing: "0",
            }}
          >
            {/* Sticky Header */}
            <thead 
              className="text-gray-600 sticky top-0 z-20 bg-white" 
              style={{ width: "100%" }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => {
                    const isSorted = sortColumnIds?.includes(header.column.id);
                    const isFiltered = filterColumnIds?.includes(header.column.id);
                    const isLast = index === headerGroup.headers.length - 1;
                    
                    // Helper function to get header background color
                    const getHeaderBackgroundColor = () => {
                      if (isSorted) return "bg-orange-100";
                      if (isFiltered) return "bg-green-100";
                      return "bg-white";
                    };
                    
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className={`px-3 text-left text-sm font-medium border-b border-gray-200 ${
                          !isLast ? 'border-r border-gray-200' : ''
                        } ${
                          index === 0 ? 'sticky left-0 z-30 pl-[66px]' : ''
                        } ${getHeaderBackgroundColor()}`}
                        style={{
                          width: "200px",
                          minWidth: "200px",
                          maxWidth: "200px",
                          height: '45px',
                          maxHeight: '45px'
                        }}
                      >
                        <div className="flex items-center justify-between w-full h-full">
                          <div className="inline-block">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                          <EditColumn columnId={header.column.id} viewId={viewId}/>
                        </div>
                      </th>
                    );
                  })}
                  <th
                    className="px-3 text-left text-sm font-medium border-b border-l border-gray-200 bg-white z-30"
                    style={{
                      width: "60px",
                      minWidth: "60px",
                      maxWidth: "60px",
                      height: '45px',
                      maxHeight: '45px'
                    }}
                  >
                    <div className="flex items-center justify-center w-full h-full">
                      <CreateColumn 
                        tableId={tableId} 
                        viewId={viewId} 
                        setHasInitialised={setHasInitialised}
                      />
                    </div>
                  </th>
                </tr>
              ))}
            </thead>
            <tbody 
              className="w-full relative" 
              style={{ height: virtualizer.getTotalSize() + 45, width: "100%" }}
            >
              {virtualRows.map((virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index];
                if (!row) return null;
                return (
                  <tr
                    key={row.id}
                    className="group hover:bg-gray-100 transition-colors duration-150"
                    style={{
                      height: '45px',
                      transform: `translateY(${virtualRow.start}px)`,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                    }}
                  >
                    {row.getVisibleCells().map((cell, index) => {
                      const isLast = index === row.getVisibleCells().length - 1;
                      return (
                        <td 
                          key={cell.id} 
                          className={`border-b border-gray-200 h-[45px] ${
                            !isLast ? 'border-r border-gray-200' : ''
                          } ${
                            index === 0 ? 'sticky left-0 z-10' : ''
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
                      );
                    })}
                    <td 
                      className="border-l border-gray-200 h-[45px] bg-gray-100 z-10"
                      style={{
                        width: "60px",
                        minWidth: "60px",
                        maxWidth: "60px",
                        height: '45px'
                      }}
                    />
                  </tr>
                );
              })}
              {/* Add Row */}
              <tr 
                className="group hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
                onClick={() => {
                  handleCreateRowClick();
                }}
                style={{
                  height: '45px',
                  transform: `translateY(${virtualizer.getTotalSize()}px)`,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                }}
              >
                <td 
                  className="border-b border-r border-gray-200 h-[45px] sticky left-0 z-10"
                  style={{
                    width: "200px",
                    minWidth: "200px",
                    maxWidth: "200px",
                    height: '45px'
                  }}
                >
                  <div className="flex items-center h-full">
                    <div className="text-center text-sm text-gray-400 w-[50px] h-full flex-shrink-0 flex items-center justify-center">
                      <button 
                        className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateRowClick();
                        }}
                        disabled={createRow.isPending}
                      >
                        <svg className="w-4 h-4 fill-gray-400 hover:fill-gray-600" viewBox="0 0 22 22">
                          <use href="/icon_definitions.svg#Plus"/>
                        </svg>
                      </button>
                    </div>
                    <div className="w-full h-full px-3 py-2 text-right text-sm border-none"></div>
                  </div>
                </td>
                {visibleColumns.slice(1).map((column) => (
                  <td 
                    key={`empty-${column.id}`}
                    className="border-b border-gray-200 h-[45px]"
                    style={{
                      width: "200px",
                      minWidth: "200px",
                      maxWidth: "200px",
                      height: '45px'
                    }}
                  />
                ))}
                <td 
                  className="border-l border-gray-200 h-[45px] bg-gray-100 z-10"
                  style={{
                    width: "60px",
                    minWidth: "60px",
                    maxWidth: "60px",
                    height: '45px'
                  }}
                />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-2 z-50 p-2">
        <CreateRow 
          tableId={tableId} 
          viewId={viewId} 
        />
      </div>
      
      {allRows.length === 0 && !isLoading && <p className="mt-2 text-center">No rows available</p>}
    </div>
  );
}