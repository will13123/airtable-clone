import Link from "next/link";
import { auth } from "~/server/auth";
import CreateTable from "../_components/createTable";
import TableList from "../_components/tableList";

export default async function BasePage({ searchParams }: {searchParams: {id?: string}}) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const { id } = await searchParams;
  if (!id) return <div>Error loading base</div>
  return (
    <div className="p-10">
      <h1>Base</h1>
      <Link
        href={'/dashboard'}
      >
        Back
      </Link>
      Tables
      <TableList baseId={id}/>
      <CreateTable baseId={id}/>
    </div>
  )


}