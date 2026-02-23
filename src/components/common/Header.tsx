"use client";

import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  userName?: string;
  onSignOut?: () => void;
}

export function Header({ userName, onSignOut }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full px-4 py-4 md:px-8"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/home">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4A6B5C] flex items-center justify-center">
            <Leaf className="w-5 h-5 text-[#C8E86C]" />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl text-[#2C2C2C] dark:text-gray-100">
              Laudato Si&apos;
            </h1>
            <p className="font-mono text-xs text-muted-foreground hidden md:block">
              UMak Campus Growth
            </p>
          </div>
        </div>
        </Link>

        {userName && (
          <div className="flex items-center gap-4">
            <span className="font-body text-sm text-[#2C2C2C] dark:text-gray-200 hidden md:block">
              Welcome, <span className="font-semibold">{userName}</span>
            </span>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="font-body text-sm text-muted-foreground hover:text-[#4A6B5C] transition-colors"
              >
                Sign out
              </button>
            )}
          </div>
        )}
      </div>
    </motion.header>
  );
}
