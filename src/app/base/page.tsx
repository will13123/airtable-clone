import Link from "next/link";
import { auth } from "~/server/auth";
import TableList from "../_components/tableList";
import Image from "next/image";
import Dropdown from "../_components/dropdown";

export default async function BasePage({ searchParams }: {searchParams: Promise<{ id?: string, name?: string }>}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const username = session.user?.name ?? "User";
  const profileImage = session.user?.image ?? "https://via.placeholder.com/40";
  const email = session.user?.email ?? "No Email"; 

  const { id, name} = await searchParams;
  if (!id) return <div className="text-gray-600 text-xl">Error loading base</div>
  return (
    <div className="flex h-full">
        <div className="w-[3.5%] bg-white flex-shrink-0 flex flex-col justify-between border-gray-200 border-r">
          <div className="flex flex-col items-center">
            <div className="p-2 pt-4 flex items-center justify-center">
              <Link
                    href={'/dashboard'}
                  >
                <svg className="w-6 h-6 fill-current text-gray-700 cursor-pointer" viewBox="0 0 22 22">
                  <use href="/icon_definitions.svg#Airtable"/>
                </svg>
              </Link>
            </div>
            
            <div className="p-2 flex items-center justify-center">
              <svg className="w-6 h-6 fill-current text-gray-700 cursor-pointer" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#Star"/>
              </svg>
            </div>
          </div>
          
          <div className="flex flex-col items-center pb-4 gap-2">
            <button className="flex items-center justify-center bg-white hover:bg-gray-300 text-neutral-600 w-8 h-8 rounded-full cursor-pointer transition-colors duration-150">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#Question"/>
              </svg>
            </button>
            
            <button className="flex items-center justify-center bg-white hover:bg-gray-300 text-neutral-600 w-8 h-8 rounded-full cursor-pointer transition-colors duration-150">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#Bell"/>
              </svg>
            </button>
            
            <Dropdown profileImage={profileImage} name={username} email={email} dashboard={false}/>
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
              <p className="text-lg font-bold cursor-pointer">{name}</p>
              <svg className="w-4 h-4 fill-current cursor-pointer" viewBox="0 0 22 22">
                  <use href="/icon_definitions.svg#ChevronDown"/>
                </svg>
            </div>
            <div className="flex flex-row justify-center gap-3.5 items-center flex-1">
              <p className="text-neutral-600 text-sm">Data</p>
              <p className="text-neutral-600 text-sm"> Automations</p>
              <p className="text-neutral-600 text-sm">Interfaces</p>
              <p className="text-neutral-600 text-sm">Forms</p>
            </div>
            <div className="flex justify-end items-center gap-3 flex-1">
              <button className="flex items-center justify-center text-gray-600 hover:text-gray-800 cursor-pointer transition-colors duration-150">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 22 22">
                  <use href="/icon_definitions.svg#ClockCounterClockwise"/>
                </svg>
              </button>
              
              <button className="bg-pink-400 hover:bg-pink-500 text-white hover:text-gray-100 px-3 py-1.5 rounded text-sm font-medium cursor-pointer transition-colors duration-150">
                Share
              </button>
            </div>
          </header>
          <TableList baseId={id}/>
          
        </div>  
    </div>
  )
}