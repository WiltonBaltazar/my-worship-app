import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="repertoire-card w-full max-w-md text-center">
        <h1 className="mb-2 text-6xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
        <a href="/" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/90">
          Voltar ao início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
