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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0F11]/80 backdrop-blur-2xl animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#121A1D]/95 backdrop-blur-3xl border border-white/[0.1] rounded-3xl p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#39AEA9]/15 border border-[#39AEA9]/30 flex items-center justify-center">
              <User className="w-4 h-4 text-[#39AEA9]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Active Profiles</h3>
              <p className="text-xs text-[#8FA8AD]">Switch or manage profiles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all border border-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile List */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#8FA8AD] uppercase tracking-wider">
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
                        ? "bg-[#39AEA9]/15 text-white border-[#39AEA9]/60 shadow-[0_0_20px_rgba(57,174,169,0.2)] font-medium"
                        : "bg-white/[0.03] border-white/[0.06] text-[#8FA8AD] hover:text-white hover:border-[#39AEA9]/40 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs uppercase transition-all ${
                        isActive 
                          ? "bg-gradient-to-tr from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11] font-bold shadow-md shadow-[#39AEA9]/30" 
                          : "bg-white/10 text-white/80 border border-white/10"
                      }`}>
                        {prof.name.slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium text-white">{prof.name}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-[#39AEA9] stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.06] text-center text-xs text-[#8FA8AD]">
              Default profile active
            </div>
          )}
        </div>

        {/* Action Links */}
        <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
          <Link
            href="/profile"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-white/90 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Settings className="w-4 h-4 text-[#A2D5AB]" />
            <span>Profile Settings</span>
          </Link>

          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-medium text-red-300 hover:text-red-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
