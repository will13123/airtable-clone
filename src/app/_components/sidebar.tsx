"use client";

import BaseList from './baseList';
import CreateBase from './createBase';
import { auth } from '~/server/auth';

export default function ExpandableSidebar({ userId }: { userId: string }) {

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="sidebar-panel fixed top-[72px] left-0 h-full bg-white transition-all duration-200 ease-in-out z-50 w-16 border-r-1 border border-neutral-200"
     >
        
        <div className="p-4 items-left content-left flex flex-col pl-5">
          <svg className="mb-3 w-6 h-6 fill-current inline-block" viewBox="0 0 22 22">
            <use href="/icon_definitions.svg#House"/>
          </svg>
          <svg className="mb-3 w-6 h-6 fill-current inline-block" viewBox="0 0 22 22">
            <use href="/icon_definitions.svg#Star"/>
          </svg>
          <svg className="mb-3 w-6 h-6 fill-current inline-block" viewBox="0 0 22 22">
            <use href="/icon_definitions.svg#Share"/>
          </svg>
          <svg className="mb-3 w-6 h-6 fill-current inline-block" viewBox="0 0 22 22">
            <use href="/icon_definitions.svg#UsersThree"/>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content flex-1 transition-all duration-200 ease-in-out ml-16">
        <main className="flex min-h-screen flex-col bg-neutral-50 text-black p-6 flex-1">
          <h1 className="text-3xl font-bold mb-6">Home</h1>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Bases</h2>
            <BaseList userId={userId}/>
            <h2 className="text-xl font-semibold mb-4">Create Base</h2>
            <CreateBase/>
          </section>
      </main>
      </div>
    </div>
  );
}