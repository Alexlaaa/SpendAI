"use client"

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { sideBarLinks } from '@/constants';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button2 } from "@/components/ui/button2";
import { Menu } from "lucide-react";
import { useAuth } from '@/hooks/AuthProvider';

const Sidebar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuth();

    const { user } = useAuth();

    const handleLinkClick = (linkLabel: string, route: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        setIsOpen(false);
        if (linkLabel === "Sign Out") {
            signOut();
        } else {
            router.push(route);
        }
    };

    const SidebarLink: React.FC<{ link: typeof sideBarLinks[0] }> = ({ link }) => (
        <Link
            key={link.id}
            href={link.route}
            onClick={handleLinkClick(link.label, link.route)}
            className={`flex items-center space-x-3 px-6 py-3 transition-colors duration-200 ${
                pathname === link.route
                    ? 'bg-blue-100 text-blue-600'
                    : 'hover:bg-gray-100'
            }`}
        >
            <Image
                src={link.icon}
                alt={link.label}
                width={24}
                height={24}
            />
            <span>{link.label}</span>
        </Link>
    );

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
                    </div>
                )}

                <div className="flex flex-col space-y-1 mt-2">
                    {sideBarLinks
                        .filter(link => link.position === "top")
                        .map(link => (
                            <SidebarLink key={link.id} link={link} />
                        ))
                    }
                </div>
            </div>

            <div className="flex flex-col space-y-1">
                {sideBarLinks
                    .filter(link => link.position === "bot")
                    .map(link => (
                        <SidebarLink key={link.id} link={link} />
                    ))
                }
            </div>
        </aside>
    );

    return (
        <>
            {/* Mobile sidebar */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button2 variant="outline" size="icon" className="fixed top-4 left-4 z-40 lg:hidden">
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
