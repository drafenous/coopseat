import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-10 px-6 py-20">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">CoopSeat</p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Jogue e assista junto, como se estivesse no mesmo sofá.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Mostre sua tela, sua câmera e seus controles para os amigos em tempo real. Convidados assistem pelo navegador;
          chat e voz exigem conta verificada (18+).
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/cadastro" className="rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:brightness-110">
          Criar conta
        </Link>
        <Link href="/entrar" className="rounded-lg bg-white/5 px-5 py-3 font-semibold ring-1 ring-white/10 hover:bg-white/10">
          Entrar
        </Link>
      </div>
      <footer className="flex gap-4 text-sm text-muted">
        <Link href="/termos" className="hover:text-foreground">Termos de Uso</Link>
        <Link href="/privacidade" className="hover:text-foreground">Privacidade</Link>
      </footer>
    </main>
  );
}
