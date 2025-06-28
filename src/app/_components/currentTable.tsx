"use client";


import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { api } from "~/trpc/react";
import React, {useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

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

  // Custom hook to avoid hooks in functions, contains all the states
  const useEditableCell = ({
    initialValue,
    cell,
    updateCell,
  }: {
    initialValue: string;
    cell: { cellId: string | undefined; value: string; columnId: string } | undefined;
    updateCell: { mutate: (data: { cellId: string; value: string }) => void };
  }) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);

    const onBlur = () => {
      if (cell && cell.value !== value && cell.cellId) {
        updateCell.mutate({
          cellId: cell.cellId,
          value,
        });
      }
    };

    return { value, setValue, onBlur };
  };

// Component to render the editable cell, to avoid hooks in functions, returns the div
const EditableCell = ({
  initialValue,
  cell,
  updateCell,
}: {
  initialValue: string;
  cell: { cellId: string | undefined; value: string; columnId: string } | undefined;
  updateCell: { mutate: (data: { cellId: string; value: string }) => void };
}) => {
  const { value, setValue, onBlur } = useEditableCell({
    initialValue,
    cell,
    updateCell,
  });

  return (
    <input
      className="w-full h-full p-2 border-0 rounded-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
    />
  );
};


  // Default values -> can edit each one
  const defaultColumn: Partial<ColumnDef<RowType>> = {
    cell: (info) => {
      // Add ability to edit cell
      const initialValue = info.getValue() as string;
      const row = info.row.original;
      const column = info.column.columnDef;
      const cell = row.cells.find((c) => c.columnId === column.id);
      // const [value, setValue] = useState(initialValue);

      // const onBlur = () => {
      //   if (cell && cell.value !== value && cell.cellId) {
      //     updateCell.mutate({
      //       cellId: cell?.cellId,
      //       value: value
      //     });
      //   }
      // }
      
      // useEffect(() => {
      //   setValue(initialValue)
      // }, [initialValue])
      return (
        // <input
        //   className="w-full h-full p-2 border-0 rounded-none"
        //   value={value}
        //   onChange={e => {
        //     setValue(e.target.value)}
        //   }
        //   onBlur={onBlur}
        // />
        
        <EditableCell
          initialValue={initialValue}
          cell={cell}
          updateCell={updateCell} 
        />
      )
    }
  };


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
    defaultColumn,
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
          className="h-full w-full text-left rtl:text-right text-gray-500  relative bg-white"
          style={{ height: virtualizer.getTotalSize() + "px" }}
        >
          <thead className="text-gray-700 uppercase bg-gray-50">
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
                    className="bg-white border border-gray-200"
                    style={{
                      height: `${virtualRow.size}px`,
                      // transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="border-r h-[45px] w-[100px]"
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