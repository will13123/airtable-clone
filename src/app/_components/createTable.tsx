"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function CreateTable({ baseId }: { baseId: string }) {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const createTable = api.table.create.useMutation({
    onSuccess: async () => {
      await utils.table.invalidate();
      await utils.base.getTables.invalidate({ baseId });
      setName("");
    },
  });

  return (
    <div className="w-full max-w-xs">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createTable.mutate({ baseId, name });
        }}
        className="flex flex-col gap-2"
      >
        <input
          type="text"
          placeholder="Table Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-full bg-white px-4 py-2 text-black shadow"
        />
        <button
          type="submit"
          className="rounded-full bg-blue-500 text-white px-10 py-2 font-semibold transition hover:bg-blue-400 shadow"
          disabled={createTable.isPending}
        >
          {createTable.isPending ? "Creating..." : "Create"}
        </button>
      </form>
    </div>
  );
}