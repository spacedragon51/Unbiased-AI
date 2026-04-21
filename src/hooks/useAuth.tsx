import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AppRole = "admin" | "analyst" | "viewer";

export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  user_metadata: {
    display_name?: string | null;
    full_name?: string | null;
  };
}

interface AuthContextType {
  session: AppUser | null;
  user: AppUser | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  updateProfile: (data: { displayName?: string; email?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "uaids-auth-user";

function loadUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

function saveUser(user: AppUser | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadUser();
    setUser(stored);
    setLoading(false);
  }, []);

  const signIn = async (email: string, _password: string) => {
    const newUser: AppUser = {
      id: crypto.randomUUID(),
      uid: crypto.randomUUID(),
      email,
      displayName: email.split("@")[0],
      user_metadata: { display_name: email.split("@")[0] },
    };
    saveUser(newUser);
    setUser(newUser);
  };

  const signUp = async (email: string, _password: string, displayName?: string) => {
    const newUser: AppUser = {
      id: crypto.randomUUID(),
      uid: crypto.randomUUID(),
      email,
      displayName: displayName || email.split("@")[0],
      user_metadata: { display_name: displayName || email.split("@")[0] },
    };
    saveUser(newUser);
    setUser(newUser);
  };

  const signOut = async () => {
    saveUser(null);
    setUser(null);
  };

  const updateProfile = async (data: { displayName?: string; email?: string }) => {
    if (!user) return;
    const updated: AppUser = {
      ...user,
      displayName: data.displayName ?? user.displayName,
      email: data.email ?? user.email,
      user_metadata: {
        ...user.user_metadata,
        display_name: data.displayName ?? user.user_metadata.display_name,
      },
    };
    saveUser(updated);
    setUser(updated);
  };

  const roles: AppRole[] = user ? ["analyst"] : [];
  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider
      value={{ session: user, user, roles, loading, signOut, signIn, signUp, hasRole, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
