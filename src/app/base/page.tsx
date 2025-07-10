import Link from "next/link";
import { auth } from "~/server/auth";
import TableList from "../_components/tableList";
import Image from "next/image";


export default async function BasePage({ searchParams }: {searchParams: Promise<{ id?: string, name?: string }>}) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const { id, name} = await searchParams;
  if (!id) return <div className="text-gray-600 text-xl">Error loading base</div>
  return (
    <div className="flex h-full">
        <div className="w-[3.5%] bg-white flex-shrink-0 flex-col justify-between border-gray-200 border-r">
          <div className="p-2 pt-4 flex items-center justify-center">
            <svg className="w-6 h-6 fill-current text-gray-700" viewBox="0 0 22 22">
              <use href="/icon_definitions.svg#Airtable"/>
            </svg>
          </div>            
        </div>
        {/* Main Section */}
        <div className="flex-1 w-[96.5%] flex-col"> 
          {/* Top bar */}
          <header className="flex justify-center items-center bg-white border-b border-gray-200 p-3 h-[6%]">
            <div className="flex flex-1 justify-start items-center gap-2">
              <Image
                src="/airtable-logo.webp" 
                alt="Airtable Logo"
                width={30}
                height={30}
                className="object-contain"
              />
              <p className="text-lg font-bold">Name: {name}</p>
            </div>
            <div className="flex flex-row justify-center gap-3.5 items-center flex-1">
              <p className="text-neutral-600 text-sm">Data</p>
              <p className="text-neutral-600 text-sm"> Automations</p>
              <p className="text-neutral-600 text-sm">Interfaces</p>
              <p className="text-neutral-600 text-sm">Forms</p>
            </div>
            <div className="justify-items-end flex-1">
                <Link
                  href={'/dashboard'}
                >
                  <p className="text-neutral-600 text-sm cursor-pointer text-right">Back</p>
                </Link>
            </div>
          </header>
          <TableList baseId={id}/>
          
        </div>  
    </div>
  )


}