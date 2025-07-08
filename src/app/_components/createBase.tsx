"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function CreateBase() {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const createBase = api.base.create.useMutation({
    onSuccess: async () => {
      await utils.base.invalidate();
      setName("");
    },
  });

  return (
    <div className="p-1 w-[25%]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createBase.mutate({ name });
        }}
        className="flex flex-col gap-3"
      >
        <input
          type="text"
          placeholder="Enter base name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-4 py-2 bg-white text-gray-700"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-500 text-white px-4 py-2 font-medium transition cursor-pointer hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={createBase.isPending || !name.trim()}
        >
          {createBase.isPending ? "Creating..." : "Create Base"}
        </button>
      </form>
    </div>
  );
}