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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B131B]/80 backdrop-blur-2xl animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#1B3A57]/70 backdrop-blur-3xl border border-[#4A6E8D]/35 rounded-3xl p-6 shadow-[0_25px_60px_-15px_rgba(11,19,27,0.95)] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#4A6E8D]/25">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#2C3E50]/70 border border-[#4A6E8D]/40 flex items-center justify-center">
              <User className="w-4 h-4 text-[#A4C8E1]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#F0F0F0] tracking-tight">Active Profiles</h3>
              <p className="text-xs text-[#4A6E8D]">Switch or manage profiles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2C3E50]/50 hover:bg-[#4A6E8D]/50 text-[#F0F0F0]/70 hover:text-[#F0F0F0] flex items-center justify-center transition-all border border-[#4A6E8D]/30 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile List */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#4A6E8D] uppercase tracking-wider">
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
                        ? "bg-[#1B3A57]/90 text-[#F0F0F0] border-[#A4C8E1] shadow-[0_0_20px_rgba(164,200,225,0.25)] font-medium"
                        : "bg-[#1B3A57]/25 border-[#4A6E8D]/25 text-[#4A6E8D] hover:text-[#F0F0F0] hover:border-[#4A6E8D]/50 hover:bg-[#2C3E50]/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs uppercase transition-all ${
                        isActive 
                          ? "bg-[#A4C8E1] text-[#0B131B] font-bold shadow-md shadow-[#A4C8E1]/30" 
                          : "bg-[#2C3E50]/60 text-[#F0F0F0]/80 border border-[#4A6E8D]/30"
                      }`}>
                        {prof.name.slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium text-[#F0F0F0]">{prof.name}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-[#A4C8E1] stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-[#1B3A57]/20 rounded-2xl border border-[#4A6E8D]/25 text-center text-xs text-[#4A6E8D]">
              Default profile active
            </div>
          )}
        </div>

        {/* Action Links */}
        <div className="pt-4 border-t border-[#4A6E8D]/25 space-y-2.5">
          <Link
            href="/profile"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-full bg-[#2C3E50]/60 hover:bg-[#4A6E8D]/50 border border-[#4A6E8D]/35 text-xs font-medium text-[#F0F0F0] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Settings className="w-4 h-4 text-[#A4C8E1]" />
            <span>Profile Settings</span>
          </Link>

          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium text-rose-300 hover:text-rose-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
