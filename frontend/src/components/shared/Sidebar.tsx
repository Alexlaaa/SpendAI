"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sideBarLinks } from "@/constants";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button2 } from "@/components/ui/button2";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/AuthProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const { user } = useAuth();

  const handleLinkClick =
    (linkLabel: string, route: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      setIsOpen(false);
      if (linkLabel === "Sign Out") {
        signOut();
      } else {
        router.push(route);
      }
    };

  const SidebarLink: React.FC<{ link: (typeof sideBarLinks)[0] }> = ({
    link,
  }) => {
    const { user } = useAuth(); // Get user here to check tier

    const isTierSufficient = () => {
      if (!link.requiredTier) return true; // No tier requirement
      if (!user) return false; // User data not loaded, assume insufficient
      const userTierNum = parseInt(user.tier.replace("tier", ""), 10);
      const requiredTierNum = parseInt(
        link.requiredTier.replace("tier", ""),
        10,
      );
      return userTierNum >= requiredTierNum;
    };

    const sufficient = isTierSufficient();

    const linkContent = (
      <div // Use div instead of Link directly for TooltipTrigger
        key={link.id}
        className={`flex items-center space-x-3 px-6 py-3 transition-colors duration-200 ${
          pathname === link.route && sufficient
            ? "bg-blue-100 text-blue-600" // Active style only if sufficient tier
            : !sufficient
            ? "text-gray-400 cursor-not-allowed" // Disabled style
            : "hover:bg-gray-100" // Default hover style
        }`}
      >
        <Image src={link.icon} alt={link.label} width={24} height={24} />
        <span>{link.label}</span>
      </div>
    );

    if (sufficient) {
      return (
        <Link href={link.route} passHref>
          {linkContent}
        </Link>
      );
    } else {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Wrap the div, not a Link, as Link navigation is prevented */}
              {linkContent}
            </TooltipTrigger>
            <TooltipContent>
              <p>Tier 3 feature. Subscription needed.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  };

  const SidebarContent = () => (
    <aside className="h-full w-full flex flex-col justify-between bg-white py-8">
      <div>
        {user && (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-20 h-20 rounded-full overflow-hidden">
              <Image
                src="/images/mr.jpg"
                alt={`${user.firstName} ${user.lastName}'s profile picture`}
                width={80}
                height={80}
                className="object-cover"
              />
            </div>
            <span className="text-lg font-semibold">{`${user.firstName} ${user.lastName}`}</span>
            {/* Tier Badge */}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                user.tier === "tier3"
                  ? "bg-purple-100 text-purple-700"
                  : user.tier === "tier2"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700" // Default to Tier 1 style
              }`}
            >
              {`Tier ${user.tier.replace("tier", "")}${user.billingCycle ? ` - ${user.billingCycle.charAt(0).toUpperCase() + user.billingCycle.slice(1)}` : ''}`}
            </span>
          </div>
        )}

        <div className="flex flex-col space-y-1 mt-4">
          {/* Remove the tier filtering logic here */}
          {sideBarLinks
            .filter((link) => link.position === "top")
            .map((link) => <SidebarLink key={link.id} link={link} />)}
        </div>
      </div>

      <div className="flex flex-col space-y-1">
        {sideBarLinks
          .filter((link) => link.position === "bot")
          .map((link) => (
            <SidebarLink key={link.id} link={link} />
          ))}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button2
            variant="outline"
            size="icon"
            className="fixed top-4 left-4 z-40 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button2>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 h-full p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 bg-white shadow-md">
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar;
