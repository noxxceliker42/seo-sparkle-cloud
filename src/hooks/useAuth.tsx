import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "editor" | "viewer";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  firm_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  hasRole: (role: AppRole) => boolean;
  hasMinRole: (minRole: AppRole) => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ROLE_HIERARCHY: Record<AppRole, number> = { viewer: 0, editor: 1, admin: 2 };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    role: null,
    loading: true,
    isAuthenticated: false,
  });

  const fetchProfileAndRole = useCallback(async (userId: string): Promise<{ profile: Profile | null; role: AppRole | null }> => {
    const timeout = new Promise<{ profile: null; role: null }>((resolve) =>
      setTimeout(() => {
        console.warn("fetchProfileAndRole timeout (5s) — continuing without profile");
        resolve({ profile: null, role: null });
      }, 5000)
    );
    const work = (async () => {
      try {
        const [profileRes, roleRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId),
        ]);
        const profile = profileRes.data as Profile | null;
        const roles = (roleRes.data || []).map((r: { role: string }) => r.role as AppRole);
        let bestRole: AppRole | null = null;
        for (const r of roles) {
          if (!bestRole || ROLE_HIERARCHY[r] > ROLE_HIERARCHY[bestRole]) bestRole = r;
        }
        return { profile, role: bestRole };
      } catch (err) {
        console.error("fetchProfileAndRole error:", err);
        return { profile: null, role: null };
      }
    })();
    return Promise.race([work, timeout]);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const { profile, role } = await fetchProfileAndRole(state.user.id);
    setState((s) => ({ ...s, profile, role }));
  }, [state.user, fetchProfileAndRole]);

  useEffect(() => {
    let initialLoadDone = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, "initialDone:", initialLoadDone);

      // Only reset state on explicit sign-out
      if (event === "SIGNED_OUT") {
        setState({ user: null, session: null, profile: null, role: null, loading: false, isAuthenticated: false });
        return;
      }

      if (session?.user) {
        // CRITICAL: Do NOT set loading:true on subsequent SIGNED_IN events (e.g. tab return).
        // Only set loading during initial load. This prevents unmounting all pages.
        if (!initialLoadDone) {
          // Initial load — show loading state
          setState((s) => ({ ...s, user: session.user, session, isAuthenticated: true, loading: true }));
        } else {
          // Subsequent events (tab return, token refresh) — update user/session silently
          setState((s) => ({ ...s, user: session.user, session, isAuthenticated: true }));
        }

        // Defer Supabase calls to avoid deadlocks
        setTimeout(async () => {
          const { profile, role } = await fetchProfileAndRole(session.user.id);
          setState((s) => ({ ...s, profile, role, loading: false }));
        }, 0);
      }
      // Ignore TOKEN_REFRESHED, INITIAL_SESSION etc. when session is null — no redirect
    });

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { profile, role } = await fetchProfileAndRole(session.user.id);
        setState({ user: session.user, session, profile, role, loading: false, isAuthenticated: true });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
      initialLoadDone = true;
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileAndRole]);

  const hasRole = useCallback((r: AppRole) => state.role === r, [state.role]);
  const hasMinRole = useCallback((minRole: AppRole) => {
    if (!state.role) return false;
    return ROLE_HIERARCHY[state.role] >= ROLE_HIERARCHY[minRole];
  }, [state.role]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, hasRole, hasMinRole, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
