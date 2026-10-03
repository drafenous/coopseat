import type { Metadata } from 'next';
import { TERMS_VERSION } from '@/lib/validation/account';

export const metadata: Metadata = { title: 'Termos de Uso' };

export default function TermsPage() {
  return (
    <main className="prose prose-invert mx-auto w-full max-w-3xl flex-1 px-6 py-12 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold text-white">Termos de Uso</h1>
      <p className="text-muted">Versão {TERMS_VERSION}</p>

      <h2 className="mt-8 text-xl font-semibold text-white">1. Quem pode usar</h2>
      <p>
        O CoopSeat é exclusivo para maiores de 18 anos. Para usar chat, voz e criar salas, você precisa verificar a idade com
        documento e selfie por meio de um parceiro de verificação. Contas de menores serão encerradas.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-white">2. Sua conta</h2>
      <p>
        Você é responsável pela sua conta e pelo que acontece nas salas que cria. O apelido e o e-mail são únicos. Recomendamos
        ativar a verificação em duas etapas. Não compartilhe sua senha.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-white">3. Conduta</h2>
      <p>
        É proibido transmitir conteúdo ilegal, de terceiros sem autorização, discurso de ódio, assédio, conteúdo sexual ou
        qualquer material envolvendo menores. Podemos suspender contas que violem estas regras e colaborar com autoridades.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-white">4. Transmissões</h2>
      <p>
        As transmissões são ponto a ponto entre os participantes e não são gravadas pelo CoopSeat. Quem cria a sala decide quem
        participa e pode remover convidados.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-white">5. Encerramento</h2>
      <p>Você pode excluir sua conta a qualquer momento em Minha conta. Os dados são apagados conforme a Política de Privacidade.</p>

      <h2 className="mt-8 text-xl font-semibold text-white">6. Contato</h2>
      <p>suporte@coopseat.com</p>
    </main>
  );
}
