"use client"
import * as React from "react"
import Link from "next/link"

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

import ThemeToggle from "./ThemeToggle"
import { Button } from "./ui/button"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

type NavbarProps = {
    user: {
        first_name: string;
        last_name: string;
    } | null;
};
export function Navbar({ user }: NavbarProps) {
    const supabase = createClient();
    const router = useRouter();

    const redirectToLogin = async () => {
        router.push("/login");
        router.refresh();
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            router.push("/");
            router.refresh();
        }
    };
    return (
        <div className="fixed top-0 left-0 w-full z-50 bg-background/90 backdrop-blur-sm shadow-md">
            <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                <div className="text-md font-bold hidden md:block">AI Image Gallery</div>
                <NavigationMenu viewport={false}>
                    <NavigationMenuList>
                        <NavigationMenuItem>
                            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                                <Link href="/">Home</Link>
                            </NavigationMenuLink>
                        </NavigationMenuItem>

                        {user &&
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                                    <Link href="/gallery">Gallery</Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        }
                        {user ? (
                            <NavigationMenuItem>
                                <NavigationMenuTrigger>
                                    {user.first_name} {user.last_name}
                                </NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid gap-1">
                                        <li>
                                            <NavigationMenuLink asChild>
                                                <Link
                                                    href="/profile"
                                                    className="block w-full px-3 py-2 rounded-md text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                                >
                                                    My Profile
                                                </Link>
                                            </NavigationMenuLink>
                                        </li>

                                        <li>
                                            <Button
                                                variant="ghost"
                                                className="w-full px-3 py-2 justify-start text-left rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground-left"
                                                onClick={logout}
                                            >
                                                Logout
                                            </Button>
                                        </li>
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                        ) : (
                            <NavigationMenuItem>
                                <Button
                                    variant="ghost"
                                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent"
                                    onClick={redirectToLogin}
                                >
                                    Login
                                </Button>
                            </NavigationMenuItem>
                        )}
                        <NavigationMenuItem>
                            <ThemeToggle></ThemeToggle>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>
            </div>
        </div>
    )
}

function ListItem({
    title,
    children,
    href,
    ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
    return (
        <li {...props}>
            <NavigationMenuLink asChild>
                <Link href={href}>
                    <div className="text-sm leading-none font-medium">{title}</div>
                    <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                        {children}
                    </p>
                </Link>
            </NavigationMenuLink>
        </li>
    )
}
