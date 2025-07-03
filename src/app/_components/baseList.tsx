"use client";

import Link from "next/link";
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-4">
      {bases.map((base) => (
        <Link
          key={base.id}
          href={`/base?id=${base.id}&name=${base.name}`}
        >
          <div key={base.id} className="bg-white p-9 rounded shadow hover:shadow-xl content-center">
            {base.name}
          </div>
        </Link>
      ))}
    </div>
  );
}