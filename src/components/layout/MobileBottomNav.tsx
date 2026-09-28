"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, PlusCircle, Package, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";

const MAIN_ITEMS = [
  { href: "/dashboard", label: "คิววันนี้", icon: LayoutDashboard },
  { href: "/calendar", label: "ปฏิทิน", icon: CalendarDays },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-gray-100 bg-white/95 backdrop-blur md:hidden">
      {MAIN_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium",
              active ? "text-brand-600" : "text-gray-500",
            )}
          >
            <Icon size={22} />
            {item.label}
          </Link>
        );
      })}

      <button
        onClick={() => router.push("/dashboard")}
        className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-brand-500"
        aria-label="ลงคิวใหม่"
      >
        <PlusCircle size={30} />
      </button>

      <Link
        href="/packages"
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium",
          pathname?.startsWith("/packages") ? "text-brand-600" : "text-gray-500",
        )}
      >
        <Package size={22} />
        แพ็คเกจ
      </Link>

      {auth.role === "owner" && (
        <Link
          href="/settings/staff"
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium",
            pathname?.startsWith("/settings") ? "text-brand-600" : "text-gray-500",
          )}
        >
          <Settings size={22} />
          ตั้งค่า
        </Link>
      )}
    </nav>
  );
}
