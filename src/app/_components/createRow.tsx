import React from "react";
import { api } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";


export default function CreateRow({ tableId, viewId }: { tableId: string, viewId: string }) {
  const queryClient = useQueryClient();
  const utils = api.useUtils();

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

  const handleCreateRow = () => {
    createRow.mutate({ tableId });
  };

  return (
    <button
      className="py-2 px-4 text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer text-xl gap-2"
      onClick={handleCreateRow}
      disabled={createRow.isPending}
    >
      {createRow.isPending ? "Creating..." : "Create Row"}
    </button>
  );
}