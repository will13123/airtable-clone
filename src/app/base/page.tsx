import Link from "next/link";
import { auth } from "~/server/auth";
import CreateTable from "../_components/createTable";
import TableList from "../_components/tableList";
import Image from "next/image";


export default async function BasePage({ searchParams }: {searchParams: Promise<{ id?: string, name?: string }>}) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const { id, name} = await searchParams;
  if (!id) return <div>Error loading base</div>
  return (
    <div className="flex h-screen">
        <div className="w-20 text-white flex-shrink-0 flex-col justify-between border-neutral-500 border-r-2">
          <div className="p-4">
            <Image
              src="/airtable-logo-black.svg" 
              alt="Airtable Logo Black"
              width={30}
              height={30}
              className="w-90% h-auto"
            />
          </div>            
        </div>
        {/* Main Section */}
        <div className="flex-1"> 
          {/* Top bar */}
          <header className="flex justify-center items-center bg-white border-b-2 border-solid border-neutral-300 p-4">
            <div className="flex flex-1 justify-start items-center gap-2">
              <Image
                src="/airtable-logo.webp" 
                alt="Airtable Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <p className="text-2xl font-bold">Name: {name}</p>
            </div>
            <div className="flex flex-row justify-between items-center flex-1">
              <p className="text-neutral-600 text-xl">Data</p>
              <p className="text-neutral-600 text-xl"> Automations</p>
              <p className="text-neutral-600 text-xl">Interfaces</p>
              <p className="text-neutral-600 text-xl">Forms</p>
            </div>
            <div className="justify-items-end flex-1">
                <Link
                  href={'/dashboard'}
                >
                  <p className="text-neutral-600 text-xl cursor-pointer text-right">Back</p>
                </Link>
            </div>
          </header>
          <div className="">
            <TableList baseId={id}/>
          </div>
          
        </div>  
    </div>
  )


}