"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { api } from "~/trpc/react";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
type ColumnType = {
  tableId: string;
  type: string;
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  order: number;
}

const columnHelper = createColumnHelper<RowType>();

export default function CurrentView({ 
  viewId, 
  tableId, 
  hiddenColumns = [],
  searchTerm = ""
}: { 
  viewId: string, 
  tableId: string,
  hiddenColumns?: string[],
  searchTerm?: string
}) {
  const utils = api.useUtils();
  
  const [allRows, setAllRows] = useState<RowType[]>([]);
  const [allColumns, setAllColumns] = useState<Array<{id: string; name: string; type: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all data using while loop
  const fetchAllData = useCallback(async () => {
    if (!viewId) return;
    
    setIsLoading(true);
    const allRowsData: RowType[] = [];
    let allColumnsData: ColumnType[] = [];
    let cursor: string | undefined = undefined;
    
    while (true) {
      const page = await utils.view.getViewRows.fetch({
        viewId,
        cursor,
        limit: 10000
      });
      
      if (!page?.rows || page.rows.length === 0) break;
      
      allRowsData.push(...page.rows);
      
      if (allColumnsData.length === 0 && page.columns) {
        allColumnsData = page.columns;
      }
      if (!page.nextCursor) {
        break;
      } else {
        cursor = page.nextCursor;
      }
    }
    
    setAllRows(allRowsData);
    setAllColumns(allColumnsData);
    setIsLoading(false);
  }, [viewId, utils.view.getViewRows]);

  const { data: sorts } = api.view.getSorts.useQuery({ viewId });
  const { data: filters } = api.view.getFilters.useQuery({ viewId });

  // Get matching cells for highlighting
  const { data: matchingCells } = api.view.searchCells.useQuery(
    { viewId, searchTerm },
    { enabled: !!searchTerm.trim() }
  );

  // Trigger fetch on viewId, sorts, filters or search params change
  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData, viewId, sorts, filters, matchingCells]);


  const createRow = api.row.create.useMutation({
    onSuccess: () => fetchAllData(),
  });
  const createColumn = api.column.create.useMutation({
    onSuccess: () => {
      void fetchAllData();
      void utils.table.getColumns.invalidate({ tableId })
    }
  });
  const createManyRows = api.row.createMany.useMutation({
    onSuccess: () => fetchAllData(),
  })
  const updateCell = api.table.updateCell.useMutation({
    onSuccess: () => fetchAllData(),
  });
  const [columnDropdownIsOpen, setColumnDropdownIsOpen] = useState(false);
  const handleColumnDropdown = useCallback(() => {
    setColumnDropdownIsOpen(!columnDropdownIsOpen);
  }, [columnDropdownIsOpen]);
  const [type, setType] = useState("");
  const [columnName, setColumnName] = useState("");

  // Use batch fetched data
  const rows = useMemo(() => allRows, [allRows]);
  const columns = useMemo(() => allColumns, [allColumns]);

  const visibleColumns = useMemo(() => 
    columns.filter(column => !hiddenColumns.includes(column.id)),
    [columns, hiddenColumns]
  );

  const matchingCellIds = useMemo(() => 
    new Set(matchingCells?.map(cell => cell.id) ?? []),
    [matchingCells]
  );

  const sortColumnIds = useMemo(() => 
    sorts?.map((sort) => sort.split(":")[0] ?? "") ?? [],
    [sorts]
  );
  
  const filterColumnIds = useMemo(() => 
    filters?.map((filter) => filter.split(":")[0] ?? "") ?? [],
    [filters]
  );

  // Tanstack Virtualisation
  const scrollRef = useRef<HTMLTableSectionElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 45,
    getScrollElement: () => scrollRef.current,
    overscan: 15,
    horizontal: false,
    measureElement: () => 45,
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Editable Cell component to use react hooks
  const EditableCell = React.memo(({
    initialValue,
    cell,
    rowNumber,
    isFirstColumn = false,
  }: {
    initialValue: string;
    cell: CellType;
    rowNumber?: number;
    isFirstColumn?: boolean;
  }) => {
    const [value, setValue] = useState(initialValue);
    const [originalValue, setOriginalValue] = useState(initialValue);
    
    const regex = useMemo(() => {
      return cell?.type === "text" ? /^[a-zA-Z]+$/ : /^\d+$/;
    }, [cell?.type]);

    useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);

    const isHighlighted = matchingCellIds.has(cell.cellId ?? "");

    const handleBlur = useCallback(() => {
      if (cell.cellId && cell.value !== value) {
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
    }, [cell.cellId, cell.value, cell.type, value, regex, originalValue, updateCell]);

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
            sortColumnIds.includes(cell.columnId) ? "bg-orange-100" : ""
          } ${
            filterColumnIds.includes(cell.columnId) ? "bg-green-100" : ""
          } ${
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

  // Default column info
  const defaultColumn: Partial<ColumnDef<RowType>> = useMemo(() => ({
    cell: (info) => {
      const initialValue = info.getValue() as string;
      const row = info.row.original;
      const column = info.column.columnDef;
      const cell = row.cells.find((c) => c.columnId === column.id);
      
      // Calculate isFirstColumn based on visible columns only
      const visibleColumnIds = visibleColumns.map(col => col.id);
      const isFirstColumn = visibleColumnIds.indexOf(column.id!) === 0;
      const rowNumber = info.row.index + 1;
      
      return (
        <EditableCell
          initialValue={initialValue}
          cell={cell ?? { cellId: "", value: "", columnId: "", type: ""}}
          rowNumber={rowNumber}
          isFirstColumn={isFirstColumn}
        />
      );
    },
    size: 200,
  }), [visibleColumns]);

  const tableColumns = useMemo(
    () => [
      ...visibleColumns.map((column) =>
        columnHelper.accessor(
          (row) => {
            const cell = row.cells.find((cell) => cell.columnId === column.id);
            return cell?.value ?? "";
          },
          {
            id: column.id,
            header: `${column.name}`,
            meta: { type: column.type },
            size: 200
          }
        )
      ),
    ],
    [visibleColumns]
  );

  const handleCreateRow = useCallback(() => {
    createRow.mutate({ tableId });
  }, [createRow, tableId]);

  const handleCreateManyRows = useCallback(() => {
    createManyRows.mutate({ tableId });
  }, [createManyRows, tableId]);

  // Memoize table instance
  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    defaultColumn,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: false,
  });

  // Memoize form handlers
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
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* Main Table */}
      <div className="flex flex-col h-[80dvh]">
        <div 
          ref={scrollRef} 
          className="h-[80dvh] w-full overflow-auto flex-1 border border-gray-200 border-b-1"
        >
          <table
            className="h-full text-left rtl:text-right text-gray-500 relative bg-white"
            style={{ 
              height: virtualizer.getTotalSize() + "px",
              tableLayout: "fixed",
            }}
          >
            <thead className="text-gray-400" style={{ width: "100%" }}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className="p-2 text-left text-sm border-r"
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
                      <EditColumn columnId={header.column.id} viewId={viewId}/>
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
                    {row.getVisibleCells().map((cell) => (
                      <td 
                        key={cell.id} 
                        className="border-r h-[45px]"
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
            Create 10K Rows
          </button>
        </div>
      </div>
      {rows.length === 0 && <p className="mt-2 text-center">No rows available</p>}
    </div>
  );
}