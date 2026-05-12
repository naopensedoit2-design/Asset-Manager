export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center text-center px-6">
      <p className="text-gold font-serif tracking-[0.3em] uppercase text-sm mb-4">
        404
      </p>
      <h1 className="font-serif text-4xl text-text-primary mb-4">
        Página não encontrada
      </h1>
      <p className="font-sans text-text-secondary mb-8">
        A página que você procura não existe ou foi movida.
      </p>
      <a
        href="/"
        className="font-sans text-gold hover:text-gold-light transition-colors text-sm underline underline-offset-4"
      >
        ← Voltar ao início
      </a>
    </div>
  );
}
