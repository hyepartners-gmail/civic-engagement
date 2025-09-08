"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Landmark,
  Thermometer,
  Briefcase,
  Handshake,
  Users,
  Vote,
  Map,
  Gavel,
  Shield,
  LogIn,
  LogOut,
  ScrollText,
  ChevronsLeft,
  MessageSquare,
  BarChart3,
  FlaskConical
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const NavLink = ({ href, children, icon: Icon, isSidebarOpen }: { href: string; children: React.ReactNode; icon: React.ElementType; isSidebarOpen: boolean }) => {
  const router = useRouter();
  const isActive = href === '/' ? router.pathname === '/' : router.pathname.startsWith(href);
  
  const linkContent = (
    <Link href={href} className="flex items-center h-full">
      <Icon className="h-7 w-7 flex-shrink-0" strokeWidth={1.5} />
      {isSidebarOpen && <span className="truncate ml-3">{children}</span>}
    </Link>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant={isActive ? 'platform-primary' : 'ghost'} className={cn("w-full justify-start gap-3", isSidebarOpen ? "px-3" : "px-0 justify-center")}>
            {linkContent}
          </Button>
        </TooltipTrigger>
        {!isSidebarOpen && (
          <TooltipContent side="right">
            <p>{children}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

const SiteNavigation = ({ isSidebarOpen, setIsSidebarOpen }: { isSidebarOpen: boolean; setIsSidebarOpen: (isOpen: boolean) => void; }) => {
  const { data: session, status } = useSession();
  const isUserAuthenticated = status === 'authenticated';
  const isAdmin = (session?.user as any)?.role === 'admin';
  const hasCivicExplorerBadge = (session?.user as any)?.viewedCivicPage;

  return (
    <div className={cn("flex flex-col h-full", isSidebarOpen ? "p-4" : "p-2 items-center")}>
      <div className={cn("mb-8", isSidebarOpen ? "px-2" : "")}>
        <Link href="/" className="text-2xl font-thin text-platform-accent hover:text-white">
          {isSidebarOpen ? "Citizen Forum" : "FN"}
        </Link>
      </div>
      
      <nav className="flex-1 space-y-3 w-full">
        <NavLink href="/" icon={ScrollText} isSidebarOpen={isSidebarOpen}>Amendments</NavLink>
        <NavLink href="/messages" icon={MessageSquare} isSidebarOpen={isSidebarOpen}>Political Messages</NavLink>
        {/* New Redistricting NavLink */}
        {(isUserAuthenticated && (isAdmin || hasCivicExplorerBadge)) && <NavLink href="/Redistricting" icon={Map} isSidebarOpen={isSidebarOpen}>Redistricting</NavLink>}
        {isUserAuthenticated && <NavLink href="/Civic" icon={Vote} isSidebarOpen={isSidebarOpen}>My Vote</NavLink>}
        {isUserAuthenticated && <NavLink href="/common-ground" icon={Handshake} isSidebarOpen={isSidebarOpen}>Common Ground</NavLink>}
        <NavLink href="/Community" icon={Users} isSidebarOpen={isSidebarOpen}>Community</NavLink>
        <NavLink href="/budget" icon={Landmark} isSidebarOpen={isSidebarOpen}>Budget</NavLink>
        <NavLink href="/climate" icon={Thermometer} isSidebarOpen={isSidebarOpen}>Climate</NavLink>
        <NavLink href="/employment" icon={Briefcase} isSidebarOpen={isSidebarOpen}>Employment</NavLink>
        {isAdmin && <NavLink href="/admin/messages" icon={BarChart3} isSidebarOpen={isSidebarOpen}>Message Admin</NavLink>}
        {isAdmin && <NavLink href="/amendments" icon={Gavel} isSidebarOpen={isSidebarOpen}>Convention</NavLink>}
        {isAdmin && <NavLink href="/admin" icon={Shield} isSidebarOpen={isSidebarOpen}>Admin</NavLink>}
      </nav>
      
      <div className="mt-auto space-y-3 w-full">
        {isUserAuthenticated ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  variant="ghost"
                  className={cn("w-full justify-start gap-3", isSidebarOpen ? "px-3" : "px-0 justify-center")}
                >
                  <LogOut className="h-7 w-7 flex-shrink-0" strokeWidth={1.5} />
                  {isSidebarOpen && <span className="truncate">Log Out</span>}
                </Button>
              </TooltipTrigger>
              {!isSidebarOpen && (
                <TooltipContent side="right">
                  <p>Log Out</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ) : (
          <NavLink href="/auth" icon={LogIn} isSidebarOpen={isSidebarOpen}>Sign In</NavLink>
        )}
        <Button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          variant="ghost"
          className={cn("w-full justify-start gap-3", isSidebarOpen ? "px-3" : "px-0 justify-center")}
        >
          <ChevronsLeft className={cn("h-7 w-7 flex-shrink-0 transition-transform duration-300", !isSidebarOpen && "rotate-180")} strokeWidth={1.5} />
          {isSidebarOpen && <span className="truncate">Collapse</span>}
        </Button>
      </div>
    </div>
  );
};

export default SiteNavigation;