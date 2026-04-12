import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Bell, Calendar, Music, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const highlights = [
  {
    icon: Calendar,
    title: 'Escalas inteligentes',
    description: 'Visualize compromissos, confirme presença e mantenha a equipe alinhada.',
  },
  {
    icon: Music,
    title: 'Repertório vivo',
    description: 'Consulte músicas, links e letras em um só lugar antes de cada culto.',
  },
  {
    icon: Bell,
    title: 'Avisos em tempo real',
    description: 'Receba mudanças de escala e pedidos de substituição sem ruído.',
  },
];

export default function Index() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/78 p-7 shadow-elevated backdrop-blur-sm animate-fade-in sm:p-10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-accent/25 blur-3xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Worship Agenda</p>
          <h1 className="mt-4 text-5xl font-bold leading-[1.05] text-foreground sm:text-6xl">WORA</h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            A experiência completa para organizar ministérios de louvor com clareza, ritmo e colaboração real.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto">
                <Users className="h-5 w-5" />
                Entrar na plataforma
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Feito para equipes locais</p>
          </div>
        </section>

        <aside className="grid gap-4 animate-slide-up">
          {highlights.map((highlight) => {
            const Icon = highlight.icon;
            return (
              <article
                key={highlight.title}
                className="rounded-3xl border border-border/70 bg-card/78 p-5 shadow-card backdrop-blur-sm"
              >
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">{highlight.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{highlight.description}</p>
              </article>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
