"use client";

import { api } from "~/trpc/react";

export default function BaseList({ userId }: { userId: string }) {
  const { data: bases, isLoading } = api.base.getAll.useQuery({ userId });

  if (isLoading) {
    return <div className="text-center">Loading bases...</div>;
  }

  if (!bases || bases.length === 0) {
    return <div className="text-center">No bases found.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      {bases.map((base) => (
        <div key={base.id} className="bg-white p-4 rounded shadow">
          {base.name}
        </div>
      ))}
    </div>
  );
}