"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { X, User, Settings, LogOut, Check } from "lucide-react";
import { useUserStore } from "../../store/userStore";

interface ProfileSelectorModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export default function ProfileSelectorModal({ isOpen = true, onClose }: ProfileSelectorModalProps) {
  const { activeProfile, profiles, setActiveProfile, logout } = useUserStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-2xl animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#0B131B]/90 backdrop-blur-3xl backdrop-saturate-150 border border-white/[0.12] rounded-3xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_25px_60px_-15px_rgba(0,0,0,0.95)] space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center">
              <User className="w-4 h-4 text-[#39AEA9]" />
            </div>
            <div>
              <h3 id="profile-modal-title" className="text-base font-semibold text-[#F0F0F0] tracking-tight">Active Profiles</h3>
              <p className="text-xs text-[#8FA8AD]">Switch or manage profiles</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close active profiles modal"
            className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-[#F0F0F0]/70 hover:text-[#F0F0F0] flex items-center justify-center transition-all border border-white/[0.12] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
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
                    type="button"
                    onClick={() => {
                      setActiveProfile(prof);
                      onClose();
                    }}
                    className={`w-full p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
                      isActive
                        ? "bg-white/[0.12] text-[#F0F0F0] border-[#39AEA9]/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_20px_rgba(57,174,169,0.25)] font-medium"
                        : "bg-white/[0.04] border-white/[0.08] text-[#8FA8AD] hover:text-[#F0F0F0] hover:border-white/[0.2] hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs uppercase transition-all ${
                        isActive 
                          ? "bg-[#39AEA9] text-[#0B131B] font-bold shadow-md shadow-[#39AEA9]/30" 
                          : "bg-white/[0.08] text-[#F0F0F0]/80 border border-white/[0.12]"
                      }`}>
                        {prof.name.slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium text-[#F0F0F0]">{prof.name}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-[#39AEA9] stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-white/[0.04] rounded-2xl border border-white/[0.12] text-center text-xs text-[#8FA8AD] backdrop-blur-md">
              Default profile active
            </div>
          )}
        </div>

        {/* Action Links */}
        <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
          <Link
            href="/profile"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.12] hover:border-white/[0.24] text-xs font-medium text-[#F0F0F0] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
          >
            <Settings className="w-4 h-4 text-[#39AEA9]" />
            <span>Profile Settings</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-medium text-rose-300 hover:text-rose-200 flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
