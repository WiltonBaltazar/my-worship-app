import { Link, Navigate } from 'react-router-dom';
import { Users, Shield, ArrowRight, Calendar, Music, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();

  // Redirect logged-in users to dashboard
  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      {/* Hero */}
      <div className="page-container flex flex-col items-center justify-center min-h-screen text-center">
        <div className="animate-fade-in">
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-elevated">
            <Music className="h-10 w-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-5xl font-bold text-foreground mb-2">
            WORA
          </h1>
          <p className="text-lg text-primary font-medium mb-4">Worship Agenda</p>
          <p className="text-muted-foreground mb-8 max-w-md">
            Organize escalas, gerencie repertório e mantenha sua equipe de louvor conectada.
          </p>
        </div>

        <div className="space-y-4 w-full max-w-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Link to="/auth" className="block">
            <Button size="lg" className="w-full">
              <Users className="h-5 w-5 mr-2" />
              Entrar
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-16 w-full max-w-md animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Escalas</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Music className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Repertório</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Avisos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
