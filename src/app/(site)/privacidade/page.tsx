import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Política de Privacidade' };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold text-white">Política de Privacidade</h1>
      <p className="text-muted">Em conformidade com a LGPD (Lei 13.709/2018) e o ECA Digital (Lei 15.211/2025).</p>

      <h2 className="mt-8 text-xl font-semibold text-white">O que coletamos</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Conta: e-mail, apelido, foto de perfil do provedor (quando você entra com Google, Facebook, X ou Discord).</li>
        <li>Segurança: registros de acesso e tentativas, para evitar abuso (retidos por até 30 dias).</li>
        <li>
          Verificação de idade: apenas o resultado (maior de idade ou não), a data e uma impressão criptográfica irreversível do
          documento, usada para impedir que o mesmo documento verifique várias contas. Fotos, selfie e dados do documento ficam
          com o parceiro de verificação e não são armazenados pelo CoopSeat.
        </li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold text-white">O que não coletamos</h2>
      <p>Não gravamos suas transmissões, câmera, voz ou controles. A mídia trafega ponto a ponto entre os participantes.</p>

      <h2 className="mt-8 text-xl font-semibold text-white">Para que usamos</h2>
      <p>Autenticar você, manter a conta segura, cumprir a obrigação legal de verificação etária e operar as salas.</p>

      <h2 className="mt-8 text-xl font-semibold text-white">Seus direitos</h2>
      <p>
        Você pode acessar, corrigir e excluir seus dados a qualquer momento em Minha conta. A exclusão remove perfil, vínculos e
        verificações. Dúvidas: privacidade@coopseat.com.
      </p>
    </main>
  );
}
