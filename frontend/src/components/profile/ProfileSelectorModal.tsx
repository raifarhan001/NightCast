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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#12141F] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-white/70" />
            <h3 className="text-lg font-extrabold text-white font-display">User Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile List */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider font-mono">
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
                    className={`w-full p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                      isActive
                        ? "bg-white text-black border-white shadow-lg font-extrabold"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                        isActive ? "bg-black text-white" : "bg-white/15 text-white"
                      }`}>
                        {prof.name.slice(0, 2)}
                      </div>
                      <span className="text-sm font-bold">{prof.name}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-black stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center text-xs text-white/60">
              Default Profile Active
            </div>
          )}
        </div>

        {/* Action Links */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <Link
            href="/profile"
            onClick={onClose}
            className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
          >
            <Settings className="w-4 h-4" />
            <span>Manage Profile Settings</span>
          </Link>

          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-400 flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
