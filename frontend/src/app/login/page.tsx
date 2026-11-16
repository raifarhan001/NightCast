"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { apiFetch, setStoredToken } from "../../lib/api";
import { useUserStore } from "../../store/userStore";
import { syncUserDataWithCloud } from "../../lib/sync";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("redirect") || "/";

  const { user, initialized, setUser, fetchProfiles, setActiveProfile } = useUserStore();

  React.useEffect(() => {
    if (initialized && user) {
      const target = decodeURIComponent(returnUrl);
      router.replace(target.startsWith("/") && !target.startsWith("/login") ? target : "/");
    }
  }, [initialized, user, returnUrl, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Client-side validations
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    if (!cleanPassword) {
      setError("Password cannot be empty.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      });

      if (!res?.access_token) {
        throw new Error("Authentication failed: No access token received.");
      }

      // Store token in both localStorage and cookie
      setStoredToken(res.access_token);

      // Load user details
      const me = res.user?.id ? res.user : await apiFetch("/api/auth/me");
      if (!me || !me.id) {
        throw new Error("Failed to load user profile.");
      }
      setUser(me);

      // Load and set profiles
      const profiles = await fetchProfiles();
      if (profiles && profiles.length > 0) {
        setActiveProfile(profiles[0]);
        await syncUserDataWithCloud(profiles[0].id).catch(() => {});
      }

      // Smooth redirect to requested page or home
      const decodedTarget = decodeURIComponent(returnUrl);
      const safeTarget = decodedTarget.startsWith("/") && 
                         !decodedTarget.startsWith("/login") && 
                         !decodedTarget.startsWith("/signup") && 
                         !decodedTarget.startsWith("/register")
        ? decodedTarget 
        : "/";
      router.push(safeTarget);
      router.refresh();
    } catch (err: any) {
      const msg = err?.message || "Incorrect email or password. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 select-none">
      {/* Background radial gradient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#39AEA9]/12 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#A4C8E1]/8 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-[#0B131B]/90 backdrop-blur-3xl border border-white/[0.12] rounded-3xl p-7 sm:p-9 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_25px_60px_-15px_rgba(0,0,0,0.95)] z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#A4C8E1] to-[#39AEA9] text-[#0B131B] shadow-[0_0_24px_rgba(57,174,169,0.4)] mb-3.5">
            <LogIn className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm text-[#8FA8AD] mt-1.5 font-sans">
            Sign in to continue watching across all your devices
          </p>
        </div>

        {/* Error Alert Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-sans leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="flex-1">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A4C8E1]">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8FA8AD]" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] focus:border-[#39AEA9] focus:bg-white/[0.06] text-white placeholder-[#8FA8AD]/50 text-sm outline-none transition-all duration-200"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[#A4C8E1]">Password</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8FA8AD]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] focus:border-[#39AEA9] focus:bg-white/[0.06] text-white placeholder-[#8FA8AD]/50 text-sm outline-none transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8FA8AD] hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#A4C8E1] to-[#39AEA9] hover:from-[#b8d6eb] hover:to-[#42bfb9] text-[#0B131B] font-bold text-sm shadow-[0_0_24px_rgba(57,174,169,0.35)] hover:shadow-[0_0_32px_rgba(57,174,169,0.5)] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-8 pt-6 border-t border-white/[0.08] text-center font-sans">
          <p className="text-xs text-[#8FA8AD]">
            Don&apos;t have an account?{" "}
            <Link
              href={returnUrl !== "/" ? `/signup?redirect=${encodeURIComponent(returnUrl)}` : "/signup"}
              className="text-[#39AEA9] hover:text-[#A4C8E1] font-semibold underline underline-offset-4 transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#39AEA9] animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
