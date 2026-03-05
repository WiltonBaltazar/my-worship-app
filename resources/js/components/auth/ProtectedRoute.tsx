import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireLeader?: boolean;
  requireSoundTechManager?: boolean;
}

export function ProtectedRoute({ children, requireAdmin, requireLeader, requireSoundTechManager }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, isLeader, isSoundTechManager } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireLeader && !isLeader) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireSoundTechManager && !isSoundTechManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
