"use client";


import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { api } from "~/trpc/react";
import React from "react";
import type { Cell } from "@prisma/client";

type RowType = { 
  id: string, 
  cells: { 
    columnId: string, value: string, 
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

  // const rows: RowType[] = data?.rows.map((row, index) => ({
  //   ...row,
  //   rowNum: index + 1,
  // })) ?? [];
 
  const rows = data?.rows ?? [];

  const columns = data?.columns ?? [];
  
  const tableColumns = [
    columnHelper.accessor("id", {
      header: "Row #",
      cell: (info) => info.row.index + 1,
      enableSorting: false,
    }),
    ...columns.map((column) =>
      columnHelper.accessor((row) => {
        const cell: { columnId: string, value: string } | undefined = row.cells.find((cell) => cell.columnId === column.id);
        return cell?.value ?? "";
      }, {
        id: column.id,
        header: column.id,
        cell: (info) => info.getValue(),
      })
    ),
  ];

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

      <table className="w-full text-left rtl:text-right text-gray-500 dark:text-gray-400">
        <thead className="text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="border-b">
              {headerGroup.headers.map(header => (
                <th key={header.id} className="p-2 text-left font-semibold border-r">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
              <th className="p-2 border-r">
                  <button
                    className="text-green-500 hover:text-green-700 cursor-pointer"
                    onClick={handleCreateCol}
                  >
                    +
                  </button>
                </th>
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, index) => (
            <tr key={row.id} className="bg-white border dark:bg-gray-800 dark:border-gray-700 border-gray-200">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="p-2 border-r">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          <tr>
              <td colSpan={columns.length + 1} className="p-2 border-t">
                <button
                  className="text-green-500 hover:text-green-700 cursor-pointer"
                  onClick={handleCreateRow}
                >
                  +
                </button>
              </td>
            </tr>
        </tbody>
      </table>
      {rows.length === 0 && <p className="mt-2 text-center">No rows available</p>}
    </div>
  )
}