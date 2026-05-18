import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: AuthLanding,
});

function useSplineViewer() {
  useEffect(() => {
    const id = "spline-viewer-script";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.type = "module";
    s.src = "https://unpkg.com/@splinetool/viewer@1.12.94/build/spline-viewer.js";
    document.head.appendChild(s);
  }, []);
}

type Mode = "signin" | "signup" | "forgot";

function AuthLanding() {
  useSplineViewer();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in, skip straight to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/dashboard" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your inbox for a reset link");
        setMode("signin");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#07070b] text-white">
      {/* Spline 3D background — keep pointer events enabled */}
      <div className="absolute inset-0 z-0">
        {/* @ts-expect-error - custom element */}
        <spline-viewer
          url="https://prod.spline.design/Dz6o7LVZzvTInuOJ/scene.splinecode"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Subtle left-side dark gradient so the card is readable without
          covering the right half where the 3D scene lives */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-full md:w-[55%]"
        style={{
          background:
            "linear-gradient(90deg, rgba(7,7,11,0.85) 0%, rgba(7,7,11,0.55) 55%, rgba(7,7,11,0) 100%)",
        }}
      />

      {/* Auth surface. Wrapper lets cursor pass through; the card itself
          captures events so the Spline scene stays fully interactive on the
          right side. */}
      <div className="pointer-events-none relative z-20 flex min-h-screen items-center px-6 md:px-[8vw]">
        <div className="pointer-events-auto w-full max-w-[420px]">
          {/* brand */}
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 backdrop-blur">
              <span className="text-sm font-semibold">S</span>
            </div>
            <span className="text-sm font-medium tracking-tight text-white/90">ScholarSense</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-7 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">
                {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}
              </h1>
              <p className="mt-1.5 text-sm text-white/60">
                {mode === "signup"
                  ? "Start exploring student performance analytics."
                  : mode === "forgot"
                  ? "We'll email you a recovery link."
                  : "Sign in to continue to your workspace."}
              </p>
            </div>

            {/* toggle */}
            {mode !== "forgot" && (
              <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/30 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`rounded-md py-1.5 transition ${
                    mode === "signin" ? "bg-white/10 text-white" : "text-white/55 hover:text-white"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-md py-1.5 transition ${
                    mode === "signup" ? "bg-white/10 text-white" : "text-white/55 hover:text-white"
                  }`}
                >
                  Sign up
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 transition group-focus-within:text-white/80" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/30 focus:bg-black/40 focus:ring-2 focus:ring-white/10"
                />
              </div>

              {mode !== "forgot" && (
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 transition group-focus-within:text-white/80" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                    className="h-11 w-full rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/30 focus:bg-black/40 focus:ring-2 focus:ring-white/10"
                  />
                </div>
              )}

              {mode === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-white/55 transition hover:text-white"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group/btn inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
                    <ArrowRight className="h-4 w-4 transition group-hover/btn:translate-x-0.5" />
                  </>
                )}
              </button>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="block w-full text-center text-xs text-white/55 transition hover:text-white"
                >
                  Back to sign in
                </button>
              )}
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-white/40 md:text-left">
            By continuing you agree to our terms ·{" "}
            <Link to="/dashboard" className="underline-offset-2 hover:text-white/70 hover:underline">
              Skip to dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
