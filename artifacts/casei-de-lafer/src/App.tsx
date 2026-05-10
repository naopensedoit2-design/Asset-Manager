import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonOutline from "@/components/ui/ButtonOutline";
import SectionWrapper from "@/components/ui/SectionWrapper";

const queryClient = new QueryClient();

function DesignSystemPreview() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Typography preview */}
      <SectionWrapper>
        <p className="text-gold font-serif tracking-[0.3em] uppercase text-sm mb-4">
          Casei de Lafer
        </p>
        <h1 className="font-serif text-5xl md:text-7xl font-medium text-text-primary leading-tight mb-6">
          Uma chegada à altura do seu casamento
        </h1>
        <p className="text-text-secondary text-lg max-w-xl mb-10">
          MP Lafer conversível clássico para casamentos na Serra Gaúcha.
          Chegada da noiva, ensaios fotográficos e fuga dos noivos.
        </p>

        <div className="flex flex-wrap gap-4 mb-16">
          <ButtonPrimary>Verificar Disponibilidade</ButtonPrimary>
          <ButtonOutline>Ver Galeria</ButtonOutline>
        </div>

        <div className="divider-gold my-8" />

        {/* Color palette */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          {[
            { bg: "bg-bg-primary border border-border-subtle", label: "#0a0a0a — bg-primary" },
            { bg: "bg-bg-secondary", label: "#111111 — bg-secondary" },
            { bg: "bg-bg-card", label: "#161616 — bg-card" },
            { bg: "bg-gold", label: "#C9A84C — gold" },
          ].map(({ bg, label }) => (
            <div key={label}>
              <div className={`h-16 rounded ${bg}`} />
              <p className="text-text-muted text-xs mt-2 font-mono">{label}</p>
            </div>
          ))}
        </div>

        {/* Font preview */}
        <div className="mt-12 space-y-4">
          <p className="font-serif text-3xl text-text-primary">
            Playfair Display — Títulos
          </p>
          <p className="font-sans text-base text-text-secondary">
            Inter — Corpo e interface. Limpo, legível, premium.
          </p>
          <p className="font-sans text-sm text-text-muted tracking-widest uppercase">
            Tracking widest — CTAs e labels
          </p>
        </div>
      </SectionWrapper>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={DesignSystemPreview} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
