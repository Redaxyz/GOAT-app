"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { switchProfile } from "@/app/actions";
import { HomeIcon, ChartIcon, CartIcon, DumbbellIcon, SwitchProfileIcon } from "@/app/components/icons";

type IconType = ComponentType<{ className?: string }>;
type TabItem =
  | { key: string; kind: "link"; href: string; label: string; Icon: IconType }
  | { key: string; kind: "switch"; label: string; Icon: IconType };

const HOME: TabItem = { key: "home", kind: "link", href: "/", label: "Home", Icon: HomeIcon };
const PROGRESS: TabItem = { key: "progress", kind: "link", href: "/progress", label: "Progress", Icon: ChartIcon };
const GROCERY: TabItem = { key: "grocery", kind: "link", href: "/grocery", label: "Grocery", Icon: CartIcon };
const FITNESS: TabItem = { key: "fitness", kind: "link", href: "/fitness", label: "Fitness", Icon: DumbbellIcon };
const SWITCH: TabItem = { key: "switch", kind: "switch", label: "Switch", Icon: SwitchProfileIcon };

export default function BottomNav({ mirrored }: { mirrored: boolean }) {
  const pathname = usePathname();
  const order: TabItem[] = mirrored ? [GROCERY, FITNESS, HOME, PROGRESS, SWITCH] : [SWITCH, PROGRESS, HOME, FITNESS, GROCERY];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t-2 border-theme-accent/15 bg-background">
      <div className="max-w-3xl mx-auto flex items-start">
        {order.map((item) => {
          const isHome = item.key === "home";

          if (item.kind === "switch") {
            return (
              <form key={item.key} action={switchProfile} className="flex-1">
                <button
                  type="submit"
                  aria-label="Switch profile"
                  title="Switch profile"
                  className="w-full flex flex-col items-center gap-1 py-2.5 text-xs font-bold opacity-60 hover:opacity-100 active:scale-95 transition"
                >
                  <SwitchProfileIcon className="w-5 h-5" />
                  {item.label}
                </button>
              </form>
            );
          }

          const active = pathname === item.href;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-label={item.label}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-bold transition-opacity ${
                isHome ? "" : active ? "opacity-100" : "opacity-60 hover:opacity-100"
              }`}
            >
              {isHome ? (
                <>
                  <span className="-mt-6 flex items-center justify-center w-14 h-14 rounded-full border-4 border-background bg-theme-accent text-theme-own shadow-md">
                    <item.Icon className="w-6 h-6" />
                  </span>
                  <span className="-mt-1">{item.label}</span>
                </>
              ) : (
                <>
                  <item.Icon className="w-5 h-5" />
                  {item.label}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
