"use client";


import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Cell as tanstackCell
} from "@tanstack/react-table";
import { api } from "~/trpc/react";
import React, { useCallback, useRef, useState } from "react";
import type { Cell } from "@prisma/client";
import { useVirtualizer, Virtualizer } from "@tanstack/react-virtual";
import { createSolutionBuilder, InferencePriority } from "typescript";

type RowType = { 
  id: string, 
  cells: { 
    columnId: string, value: string, cellId: string | undefined
  }[]; 
}


const columnHelper = createColumnHelper<RowType>();


export default function CurrentTable({ tableId }: { tableId: string }) {
  const utils = api.useUtils();
  const { data: name } = api.table.getNameFromId.useQuery({ tableId: tableId });
  const { data, isLoading: rowsLoading } = api.table.getRows.useQuery({ tableId });
  const createRow = api.row.create.useMutation({
    onSuccess: () => utils.table.getRows.invalidate({ tableId }),
  });
  const createColumn = api.column.create.useMutation({
    onSuccess: () => utils.table.getRows.invalidate({ tableId }),
  });
  const updateCell = api.table.updateCell.useMutation({
    // onSuccess: () => utils.table.getRows.invalidate({ tableId }),
  })
  const rows = data?.rows ?? [];
  const columns = data?.columns ?? [];


  // Tanstack Virtualisation
  const scrollRef = React.useRef<HTMLTableSectionElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 45,
    getScrollElement: () => scrollRef.current,
    overscan: 10,
    horizontal: false,
  })
 
  const virtualRows = virtualizer.getVirtualItems();
  
  const tableColumns = React.useMemo(
    () =>[
      columnHelper.accessor("id", {
        header: "Row #",
        cell: (info) => info.row.index + 1,
        enableSorting: false,
      }),
      ...columns.map((column) =>
        columnHelper.accessor((row) => {
          const cell: { cellId: string | undefined, columnId: string, value: string } | undefined = row.cells.find((cell) => cell.columnId === column.id);
          return cell?.value ?? "";
        }, {
          id: column.id,
          header: column.id,
          cell: (info) => {
            // Add ability to edit cell
            const initialValue = info.getValue();
            const row = info.row.original;
            const cell = row.cells.find((c) => c.columnId === column.id);
            const [value, setValue] = React.useState(initialValue);

            const onBlur = () => {
              if (cell && cell.value !== value) {
                updateCell.mutate({
                  cellId: cell?.cellId as string,
                  value: value
                });
              }
            }
            
            React.useEffect(() => {
              setValue(initialValue)
            }, [initialValue])

            return (
              <input
                value={value as string}
                onChange={e => {
                  setValue(e.target.value)}
                }
                onBlur={onBlur}
              />
            )
          }
        })
      ),
    ],
    [columns]
  );

  const handleCreateRow = () => {
    createRow.mutate({ tableId });
  }

  const handleCreateCol = () => {
    createColumn.mutate({ tableId });
  }

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  })


  if (rowsLoading) return <div className="text-center">Loading...</div>
  if (!name) return 
  return (
    <div className="p-4">
      {(name) && (
        <div>
          {name} : {tableId}
        </div>
      )}
      <div 
        ref={scrollRef} 
        className="container h-[70dvh] w-[80dvw] overflow-auto bg-gray-100" 
      >
        <table 
          className="h-full w-full text-left rtl:text-right text-gray-500 dark:text-gray-400 relative bg-white"
          style={{ height: virtualizer.getTotalSize() + "px" }}
        >
          <thead className="text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => {
                  return (
                    <th 
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }} 
                      className="p-2 text-left font-semibold border-r w-20px"
                    >
                      <div>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </div>
                    </th>
                  )
                  
                })}
              </tr>
            ))}
          </thead>
          <tbody className="w-full">
            {virtualRows.map((virtualRow) => {
              const row = table.getRowModel().rows[virtualRow.index];
              if (!row) return;
              return (
                <tr
                    key={row.id}
                    className="bg-white border dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                    style={{
                      height: `${virtualRow.size}px`,
                      // transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="p-2 border-r h-[45px] w-[100px]"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
              )
            })}
          </tbody>         
        </table>
      </div>
      <button
        className="text-green-500 hover:text-green-700 cursor-pointer"
        onClick={handleCreateRow}
        
      >
        Create Row
      </button>
      <button
        className="text-green-500 hover:text-green-700 cursor-pointer"
        onClick={handleCreateCol}
      >
        Create Column
      </button>
      {rows.length === 0 && <p className="mt-2 text-center">No rows available</p>}
    </div>
  )
}