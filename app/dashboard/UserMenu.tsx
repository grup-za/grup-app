"use client";

import { useState, useRef, useEffect } from "react";
import { SignOutButton } from "@clerk/nextjs";

export function UserMenu({ imageUrl }: { imageUrl: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ focusRingColor: "#0D4A2A" } as React.CSSProperties}
        aria-label="User menu"
      >
        <img
          src={imageUrl}
          alt="Profile"
          width={40}
          height={40}
          className="rounded-full object-cover border-2"
          style={{ borderColor: "#0D4A2A" }}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg py-1 z-10 border border-gray-100">
          <SignOutButton>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl">
              Sign out
            </button>
          </SignOutButton>
        </div>
      )}
    </div>
  );
}
