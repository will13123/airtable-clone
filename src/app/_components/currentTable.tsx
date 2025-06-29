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
import { text } from "stream/consumers";
import { number } from "zod";

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
  const [columnDropdownIsOpen, setColumnDropdownIsOpen] = useState((false));
  const handleColumnDropdown = () => {
    setColumnDropdownIsOpen(!columnDropdownIsOpen);
  };
  const [type, setType] = useState("");
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

  
  // Component to use the React Hooks so they arent called in the cell function below
  const EditableCell = ({
    initialValue,
    cell,
  }: {
    initialValue: string;
    cell: CellType | undefined;
  }) => {
    const [value, setValue] = useState(initialValue);
    const textRegex = /^[a-zA-Z]+$/;
    const numberRegex = /^\d+$/;
    
    useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);
    if (!cell) return;
    const regex = cell.type === "text" ? textRegex : numberRegex;

    const onBlur = () => {
      if (cell && cell.value !== value && cell.cellId) {
        // Check for if the value matches the type
        if (regex.test(value)) {
          updateCell.mutate({
            cellId: cell.cellId,
            value,
          });
        } else {
          alert(`Please input only ${cell.type === "text" ? "letters" : "numbers"}`);
        }
      }
    };

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
      
      return (
        <EditableCell
          initialValue={initialValue}
          cell={cell}
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
          header: column.type,
        })
      ),
    ],
    [columns]
  );

  const handleCreateRow = () => {
    createRow.mutate({ tableId });
  }

  // const handleCreateCol = () => {
  //   createColumn.mutate({ tableId });
  // }

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    defaultColumn,
    getCoreRowModel: getCoreRowModel(),
  })


  if (rowsLoading) return <div className="text-center text-gray-600 text-xl">Loading...</div>
  if (!name) return 
  return (
    <div className="p-4">
      <div 
        ref={scrollRef} 
        className="container h-[70dvh] w-[100dvw] overflow-auto bg-gray-100" 
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
        className="py-2 px-4 text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer text-xl gap-2"
        onClick={handleCreateRow}
        
      >
        Create Row
      </button>
      {/* <button
        className="text-green-500 hover:text-green-700 cursor-pointer"
        onClick={handleCreateCol}
      >
        Create Column
      </button> */}


      {/* Create Column Dropdown */}
      <div className="relative inline-block">
        <button
          onClick={handleColumnDropdown}
          className="py-2 px-4 text-gray-600 hover:text-gray-700 focus:outline-none border-l-2 border-gray-300 cursor-pointer text-xl gap-2"
        >
          Create Column
        </button>
        <div
          className={`absolute right-0 w-70 mt-2 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-10 ${
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
                    createColumn.mutate({ tableId, type });
                  } else {
                    alert("Enter a valid type");
                  }
                }}
                className="flex flex-col gap-2"
              >
                <input
                  type="text"
                  placeholder="text or number"
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
      {rows.length === 0 && <p className="mt-2 text-center">No rows available</p>}
    </div>
  )
}