"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { ReactNode } from "react";

interface NavigationProps {
  children?: ReactNode;
}

export function Navigation({ children }: NavigationProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <div className="flex items-center gap-1">
        <Link href="/">
          <button
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
              isActive("/")
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Home className="h-4 w-4" />
            <span>Editor</span>
          </button>
        </Link>
        <Link href="/gallery">
          <button
            className={`px-3 py-2 text-sm rounded-md transition-colors ${
              isActive("/gallery")
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Gallery
          </button>
        </Link>
        <Link href="/settings">
          <button
            className={`px-3 py-2 text-sm rounded-md transition-colors ${
              isActive("/settings")
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Settings
          </button>
        </Link>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

