"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { api } from "~/trpc/react";
import React, { useEffect, useState, useRef } from "react";
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

const columnHelper = createColumnHelper<RowType>();

export default function CurrentTable({ viewId, tableId }: { viewId: string, tableId: string }) {
  const utils = api.useUtils();
  // const { data, isLoading, fetchNextPage, hasNextPage } = api.view.getViewRows.useInfiniteQuery(
  //   { viewId, limit: 100 },
  //   {
  //     getNextPageParam: (lastPage) => lastPage?.nextCursor,
  //     initialCursor: undefined,
  //   }
  // );
  const { data, isLoading: rowsLoading } = api.view.getViewRows.useQuery({ viewId });
  const { data: sorts } = api.view.getSorts.useQuery({ viewId });
  const { data: filters } = api.view.getFilters.useQuery({ viewId });
  const createRow = api.row.create.useMutation({
    onSuccess: () => utils.view.getViewRows.invalidate({ viewId }),
  });
  const createColumn = api.column.create.useMutation({
    onSuccess: () => {
      void utils.view.getViewRows.invalidate({ viewId });
      void utils.table.getColumns.invalidate({ tableId })
    }
  });
  const updateCell = api.table.updateCell.useMutation({
    onSuccess: () => utils.view.getViewRows.invalidate({ viewId }),
  });
  const [columnDropdownIsOpen, setColumnDropdownIsOpen] = useState(false);
  const handleColumnDropdown = () => {
    setColumnDropdownIsOpen(!columnDropdownIsOpen);
  };
  const [type, setType] = useState("");
  const [columnName, setColumnName] = useState("");

  const rows = data?.rows ?? [];
  const columns = data?.columns ?? [];

  const sortColumnIds = sorts
    ? sorts.map((sort) => {
        return sort.split(":")[0] ?? ""
      }) 
    : []
  const filterColumnIds = filters
    ? filters.map((filter) => {
        return filter.split(":")[0] ?? "";
     })
    : []


  // Flatten pages into rows - for cursoor
  // const rows = data?.pages
  //   .filter((page): page is NonNullable<typeof page> => page != null)
  //   .flatMap((page) => page.rows) ?? [];
  // const columns = data?.pages[0]?.columns ?? [];

  // Add in logic to implement filters, sorts, hide

  // Tanstack Virtualisation
  const scrollRef = useRef<HTMLTableSectionElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 45,
    getScrollElement: () => scrollRef.current,
    overscan: 10,
    horizontal: false,
  });

  // useEffect(() => {
  //   const [lastItem] = virtualizer.getVirtualItems().slice(-1);
  //   if (lastItem && lastItem.index >= rows.length - 1 && hasNextPage && !isLoading) {
  //     void fetchNextPage();
  //   }
  // }, [virtualizer.getVirtualItems(), rows.length, hasNextPage, fetchNextPage, isLoading]);

  const virtualRows = virtualizer.getVirtualItems();

  // Component to use the React Hooks so they arent called in the cell function below
  const EditableCell = ({
    initialValue,
    cell,
  }: {
    initialValue: string;
    cell: CellType | undefined;
  }) => {
    const [value, setValue] = useState(initialValue);
    const [originalValue, setOriginalValue] = useState(initialValue);
    const textRegex = /^[a-zA-Z]+$/;
    const numberRegex = /^\d+$/;

    useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);

    if (!cell) return null;

    const regex = cell.type === "text" ? textRegex : numberRegex;
    return (
      <input
        className={`w-full h-full p-2 border-0 rounded-none ${sortColumnIds.includes(cell.columnId) ? "bg-orange-100" : ""} ${filterColumnIds.includes(cell.columnId) ? "bg-green-100" : ""}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
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
        }}
      />
    );
  };

  // Default values -> can edit each one
  const defaultColumn: Partial<ColumnDef<RowType>> = {
    cell: (info) => {
      const initialValue = info.getValue() as string;
      const row = info.row.original;
      const column = info.column.columnDef;
      const cell = row.cells.find((c) => c.columnId === column.id);
      
      return (
        <EditableCell
          initialValue={initialValue}
          cell={cell}
        />
      );
    },
    size: 150,
  };

  const tableColumns = React.useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Row #",
        cell: (info) => (
          <div className="text-center">
            {info.row.index + 1}
          </div>
        ),
        enableSorting: false,
        size: 100,
      }),
      ...columns.map((column) =>
        columnHelper.accessor(
          (row) => {
            const cell = row.cells.find((cell) => cell.columnId === column.id);
            return cell?.value ?? "";
          },
          {
            id: column.id,
            header: `${column.name}: ${column.type}`,
            meta: { type: column.type }, // Pass type for EditableCell
          }
        )
      ),
    ],
    [columns]
  );

  const handleCreateRow = () => {
    createRow.mutate({ tableId });
  };

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    defaultColumn,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: false,
  });

  if (rowsLoading && !data) return <div className="text-center text-gray-600 text-xl">Loading...</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Main Table */}
      <div className="flex flex-col h-[80dvh]">
        <div 
          ref={scrollRef} 
          className="container h-[80dvh] w-[100dvw] overflow-auto flex-1 bg-gray-100 border border-gray-200 border-b-1"
        >
          <table
            className="h-full w-full text-left rtl:text-right text-gray-500 relative bg-white"
            style={{ height: virtualizer.getTotalSize() + "px" }}
          >
            <thead className="text-gray-700 uppercase bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                      className="p-2 text-left font-semibold border-r min-w-[150px]"
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
            <tbody className="w-full">
              {virtualRows.map((virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index];
                if (!row) return null;
                return (
                  <tr
                    key={row.id}
                    className="bg-white border border-gray-200"
                    style={{
                      height: `${virtualRow.size}px`,
                      // transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="border-r h-[45px]">
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
        {/* Create row/column */}
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
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setColumnDropdownIsOpen(!columnDropdownIsOpen);
                      if (type === "text" || type === "number") {
                        createColumn.mutate({ tableId, type, name: columnName });
                      } else {
                        alert("Enter a valid type");
                      }
                      setType("");
                      setColumnName("");
                    }}
                    className="flex flex-col gap-2"
                  >
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
        </div>
      </div>
      {rows.length === 0 && <p className="mt-2 text-center">No rows available</p>}
    </div>
  );
}
