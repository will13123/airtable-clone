import React from "react";
import { api } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";



export default function CreateManyRows({ tableId, viewId }: { tableId: string, viewId: string }) {
  const utils = api.useUtils();
  const queryClient = useQueryClient();

  const createManyRows = api.row.createMany.useMutation({
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

  const handleCreateManyRows = () => {
    createManyRows.mutate({ tableId });
  };

  return (
    <button
      className="py-2 px-4 text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer text-xl gap-2 border-l-2 border-gray-300"
      onClick={handleCreateManyRows}
      disabled={createManyRows.isPending}
    >
      {createManyRows.isPending ? "Creating..." : "Create 100K Rows"}
    </button>
  );
}