import Link from 'next/link';
import { Brand, buttonClass } from '@coopseat/ui/design';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-10 px-6 py-20">
      <div>
        <Brand href="/" version={null} />
        <h1 className="mt-8 text-4xl font-bold text-white sm:text-5xl">Jogue e assista junto, como se estivesse no mesmo sofá.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Mostre sua tela, sua câmera e seus controles para os amigos em tempo real. Convidados assistem pelo navegador;
          chat e voz exigem conta verificada (18+).
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <a href="/play" className={buttonClass({ inline: true })}>
          Jogar no navegador
        </a>
        <Link href="/cadastro" className={buttonClass({ variant: 'secondary' })}>
          Criar conta
        </Link>
        <Link href="/entrar" className={buttonClass({ variant: 'secondary' })}>
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
