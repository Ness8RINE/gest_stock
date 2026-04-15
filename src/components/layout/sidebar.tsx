"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAVIGATION } from "@/lib/navigation";
import { 
  ChevronDown, 
  ChevronRight, 
  Menu,
  Container
} from "lucide-react";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar() {
  const pathname = usePathname() || "";
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <aside 
      className={cn(
        "bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col h-screen",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        {isExpanded && (
          <div className="flex items-center gap-2 font-bold text-xl text-indigo-600 truncate">
             <Container className="text-indigo-600" />
             <span>GestStock</span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn("text-slate-500", !isExpanded && "w-full flex justify-center")}
        >
          <Menu size={20} />
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4 h-[calc(100vh-120px)]">
        <nav className="pl-3 pr-3 space-y-1">
          {NAVIGATION.map((item, idx) => (
            <SidebarItem 
              key={idx} 
              item={item} 
              isExpanded={isExpanded} 
              pathname={pathname} 
            />
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
         <div className={cn("flex items-center", isExpanded ? "justify-start gap-3" : "justify-center")}>
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-indigo-600 shrink-0">
               AD
            </div>
            {isExpanded && (
              <div className="flex flex-col truncate">
                 <span className="text-sm font-semibold truncate">Admin User</span>
                 <span className="text-xs text-slate-500 truncate">admin@geststock.com</span>
              </div>
            )}
         </div>
      </div>
    </aside>
  );
}

function SidebarItem({ item, isExpanded, pathname }: { item: any, isExpanded: boolean, pathname: string }) {
  const router = useRouter();
  const isActive = item.path ? pathname === item.path : item.submenus?.some((sub: any) => pathname.startsWith(sub.path));
  const [isOpen, setIsOpen] = useState(isActive);

  if (!item.submenus) {
    const linkClasses = cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium text-left w-full",
      isActive 
        ? "bg-indigo-600 text-white shadow-md" 
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
    );

    if (!isExpanded) {
      return (
        <Tooltip>
          <TooltipTrigger className={linkClasses} onClick={() => router.push(item.path)}>
            <div className="shrink-0">{item.icon}</div>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link href={item.path} className={linkClasses}>
        <div className="shrink-0">{item.icon}</div>
        <span className="truncate">{item.title}</span>
      </Link>
    );
  }

  return (
    <Collapsible open={isExpanded ? isOpen : false} onOpenChange={setIsOpen} className="w-full">
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger className={cn(
              "flex items-center justify-center px-3 py-2.5 rounded-lg transition-colors text-sm font-medium w-full",
              isActive 
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" 
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            )}>
              {item.icon}
          </TooltipTrigger>
          <TooltipContent side="right">{item.title} (Ouvrir menu)</TooltipContent>
        </Tooltip>
      ) : (
        <CollapsibleTrigger className={cn(
          "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm font-medium",
          isActive 
            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" 
            : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        )}>
          <div className="flex items-center gap-3 truncate">
            <div className="shrink-0">{item.icon}</div>
            <span className="truncate">{item.title}</span>
          </div>
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </CollapsibleTrigger>
      )}

      <CollapsibleContent className="space-y-1 mt-1 pl-10 pr-2">
        {item.submenus.map((sub: any, idx: number) => {
          const isSubActive = pathname === sub.path;
          return (
            <Link 
              key={idx} 
              href={sub.path}
              className={cn(
                "block px-3 py-2 rounded-md text-sm transition-colors truncate",
                isSubActive 
                  ? "bg-slate-100 text-indigo-600 font-semibold dark:bg-slate-800 dark:text-indigo-400" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
              )}
            >
              {sub.title}
            </Link>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
