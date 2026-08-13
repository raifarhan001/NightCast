"use client";

import React from "react";
import Link from "next/link";
import { X, User, Settings, LogOut, Check } from "lucide-react";
import { useUserStore } from "../../store/userStore";

interface ProfileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSelectorModal({ isOpen, onClose }: ProfileSelectorModalProps) {
  const { activeProfile, profiles, setActiveProfile, logout } = useUserStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#011425]/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#081E30] border border-[#5C7C89]/30 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#5C7C89]/20">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#5C7C89]" />
            <h3 className="text-lg font-black text-white font-display">User Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#011425] hover:bg-[#1F4959] text-[#5C7C89] hover:text-white flex items-center justify-center transition-colors border border-[#5C7C89]/25 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile List */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#5C7C89] uppercase tracking-wider font-mono">
            Select Active Profile
          </p>
          {profiles.length > 0 ? (
            <div className="space-y-2">
              {profiles.map((prof) => {
                const isActive = activeProfile?.id === prof.id;
                return (
                  <button
                    key={prof.id}
                    onClick={() => {
                      setActiveProfile(prof);
                      onClose();
                    }}
                    className={`w-full p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                      isActive
                        ? "bg-[#1F4959] text-white border-[#5C7C89] shadow-[0_0_15px_rgba(31,73,89,0.6)] font-extrabold"
                        : "bg-[#011425] border-[#5C7C89]/25 text-[#5C7C89] hover:text-white hover:border-[#5C7C89]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                        isActive ? "bg-white text-[#011425]" : "bg-[#081E30] text-[#5C7C89] border border-[#5C7C89]/30"
                      }`}>
                        {prof.name.slice(0, 2)}
                      </div>
                      <span className="text-sm font-bold">{prof.name}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-[#011425] rounded-2xl border border-[#5C7C89]/20 text-center text-xs text-[#5C7C89]">
              Default Profile Active
            </div>
          )}
        </div>

        {/* Action Links */}
        <div className="pt-4 border-t border-[#5C7C89]/20 space-y-2">
          <Link
            href="/profile"
            onClick={onClose}
            className="w-full p-3 rounded-2xl bg-[#011425] hover:bg-[#1F4959]/50 border border-[#5C7C89]/25 text-xs font-bold text-[#5C7C89] hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Manage Profile Settings</span>
          </Link>

          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
