"use client";

import { api } from "~/trpc/react";

export default function CurrentTable({ tableId }: { tableId: string }) {
  const utils = api.useUtils();
  const { data: name } = api.table.getNameFromId.useQuery({ tableId: tableId });
  if (!name) return 
  return (
    <div>
      {(name) && (
        <div>
          {name}
          {tableId}
        </div>
      )}
      
    </div>
  )
}