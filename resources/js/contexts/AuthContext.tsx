import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest, clearAuthToken, getAuthToken, setAuthToken } from '@/lib/api';

type AppRole = 'admin' | 'leader' | 'member' | 'sound_tech';

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthSession {
  token: string;
}

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  home_group: 'GHH' | 'GHS' | 'GHJ' | 'GHC' | null;
  can_lead: boolean;
  can_be_tech_lead: boolean;
  can_be_tech_sound: boolean;
  can_be_tech_streaming: boolean;
  is_active: boolean;
  is_approved: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthPayload {
  user: AuthUser;
  profile: Profile | null;
  roles: AppRole[];
}

interface SignUpResponse extends Partial<AuthPayload> {
  token?: string;
  requires_approval?: boolean;
}

interface SignInResponse extends AuthPayload {
  token: string;
}

interface SignUpAbilities {
  canLead?: boolean;
  instruments?: string[];
  voices?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isLeader: boolean;
  isSoundTechManager: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    abilities?: SignUpAbilities,
  ) => Promise<{ error: Error | null; requiresApproval: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const clearState = () => {
    clearAuthToken();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const applyAuthPayload = (payload: Partial<AuthPayload>, tokenOverride?: string | null) => {
    const token = tokenOverride ?? getAuthToken();

    setUser(payload.user ?? null);
    setProfile(payload.profile ?? null);
    setRoles(payload.roles ?? []);
    setSession(token ? { token } : null);
  };

  const refreshProfile = async () => {
    const token = getAuthToken();

    if (!token) {
      clearState();
      return;
    }

    const payload = await apiRequest<AuthPayload>('/api/auth/me');
    applyAuthPayload(payload, token);
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = getAuthToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const payload = await apiRequest<AuthPayload>('/api/auth/me');
        applyAuthPayload(payload, token);
      } catch {
        clearState();
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrapAuth();
  }, []);

  const signUp = async (email: string, password: string, name: string, abilities?: SignUpAbilities) => {
    try {
      const response = await apiRequest<SignUpResponse>('/api/auth/register', {
        method: 'POST',
        auth: false,
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          can_lead: abilities?.canLead ?? false,
          instruments: abilities?.instruments ?? [],
          voices: abilities?.voices ?? [],
        },
      });

      const requiresApproval = response.requires_approval === true;

      if (requiresApproval) {
        clearState();
        return { error: null, requiresApproval: true };
      }

      if (response.token) {
        setAuthToken(response.token);
      }

      applyAuthPayload(response, response.token ?? getAuthToken());

      return { error: null, requiresApproval: false };
    } catch (error) {
      return { error: error as Error, requiresApproval: false };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiRequest<SignInResponse>('/api/auth/login', {
        method: 'POST',
        auth: false,
        body: {
          email: email.trim().toLowerCase(),
          password,
        },
      });

      setAuthToken(response.token);
      applyAuthPayload(response, response.token);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      if (getAuthToken()) {
        await apiRequest<{ message: string }>('/api/auth/logout', {
          method: 'POST',
        });
      }
    } catch {
      // Clear local auth state even when logout endpoint fails.
    } finally {
      clearState();
    }
  };

  const isAdmin = roles.includes('admin');
  const isLeader = roles.includes('leader') || isAdmin;
  const isSoundTechManager = roles.includes('sound_tech') || isLeader;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        isAdmin,
        isLeader,
        isSoundTechManager,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
