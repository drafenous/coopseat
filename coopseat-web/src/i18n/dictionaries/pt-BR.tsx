import type { Dictionary } from './en';

export const ptBR: Dictionary = {
  meta: {
    description: 'Assista e jogue junto com seus amigos, com sua câmera, seu controle e sua tela.',
    login: 'Entrar',
    mfa: 'Verificação em duas etapas',
    signup: 'Criar conta',
    forgotPassword: 'Esqueci minha senha',
    resetPassword: 'Redefinir senha',
    emailConfirmed: 'E-mail confirmado',
    authError: 'Não foi possível continuar',
    openApp: 'Voltando para o app',
    account: 'Minha conta',
    privacy: 'Política de Privacidade',
    terms: 'Termos de Uso',
    mockVerification: 'Verificação (simulada)',
    play: 'Jogar',
    playDescription: 'Jogue o console numa aba do navegador pela placa de captura.',
    download: 'Download',
    downloadDescription: 'Baixe o CoopSeat para Windows 10 e 11 e veja os requisitos do sistema.',
  },
  common: {
    language: 'Idioma',
    email: 'E-mail',
    password: 'Senha',
    newPassword: 'Nova senha',
    confirmPassword: 'Confirme a senha',
    code: 'Código',
    passwordHint: 'Mínimo de 8 caracteres, com letras e números.',
    orWithEmail: 'ou com e-mail',
    backToLogin: 'Voltar para o login',
    goToLogin: 'Ir para o login',
    openApp: 'Abrir o app CoopSeat',
    termsOfUse: 'Termos de Uso',
    privacyPolicy: 'Política de Privacidade',
    genericError: 'Algo deu errado. Tente novamente.',
  },
  home: {
    nav: { features: 'Recursos', how: 'Como funciona', party: 'Watch party', faq: 'Dúvidas' },
    signIn: 'Entrar',
    myAccount: 'Minha conta',
    createAccount: 'Criar conta',
    download: 'Baixar para Windows',
    downloadShort: 'Baixar',
    playInBrowser: 'Jogar no navegador',
    badge: 'Beta · Grátis · Windows 10/11',
    headlineLead: 'Seu console no PC.',
    headlineAccent: 'Seus amigos no sofá.',
    pitch:
      'Ligue o videogame no computador com uma placa de captura e jogue na tela do PC, com imagem nítida, som do jogo e quase nenhum atraso. Em breve, dá para chamar os amigos para assistir e jogar junto.',
    heroNote: 'Grátis · Não precisa de conta para jogar · Nunca gravamos o seu jogo',
    mock: {
      title: 'CoopSeat',
      live: 'Ao vivo',
      watching: (n: number) => `${n} assistindo`,
      soon: 'Em breve',
      chain: 'Console → placa de captura → PC',
    },
    stats: [
      { value: 'Full HD', label: 'imagem nítida e fluida, como na sua TV' },
      { value: '3 passos', label: 'de ligar os cabos até começar a jogar' },
      { value: 'Grátis', label: 'sem assinatura e sem taxas escondidas' },
      { value: '0', label: 'gravações: o que você joga fica com você' },
    ],
    featuresKicker: 'Recursos',
    featuresTitle: 'Feito para jogar, não para transmitir.',
    featuresSubtitle:
      'Nada de configuração complicada. Conecte a placa de captura, abra o CoopSeat e o seu jogo aparece na tela, pronto para jogar.',
    features: [
      {
        title: 'Quase nenhum atraso',
        body: 'O que você aperta no controle aparece na tela na hora, para você jogar de verdade, e não só assistir.',
      },
      {
        title: 'Imagem nítida e fluida',
        body: 'Full HD a 60 quadros por segundo, com as cores e o formato de tela que você veria na TV.',
      },
      {
        title: 'Com o som do jogo',
        body: 'O som do videogame vem junto com a imagem, no seu fone ou nas caixas de som.',
      },
      {
        title: 'Tela cheia, sem distrações',
        body: 'Aperte F11 e o jogo ocupa a tela toda. Pare de mexer o mouse e os botões somem, deixando só o jogo.',
      },
      {
        title: 'Funciona no navegador também',
        body: 'Não quer instalar nada? Jogue direto numa aba do Chrome ou do Edge.',
      },
      {
        title: 'Lembra das suas configurações',
        body: 'Salve o seu jeito preferido e o CoopSeat se conecta sozinho toda vez que você abrir.',
      },
    ],
    howKicker: 'Como funciona',
    howTitle: 'Para jogar, são só três passos.',
    steps: [
      {
        title: 'Conecte',
        body: 'Ligue o videogame na placa de captura com o cabo HDMI. Se a placa for externa, ligue-a no computador com o cabo USB.',
      },
      {
        title: 'Abra o CoopSeat',
        body: 'Escolha a sua placa de captura na lista. O CoopSeat escolhe a melhor qualidade de imagem para você.',
      },
      {
        title: 'Jogue',
        body: 'Clique em Iniciar e pegue o controle. Pronto!',
      },
    ],
    party: {
      kicker: 'Watch party',
      soon: 'Em breve',
      title: 'O sofá, agora online.',
      body: 'Abra uma sala e chame os amigos para ver você jogar e conversar pelo chat, como se eles estivessem no sofá do seu lado.',
      points: [
        'Os amigos assistem direto pelo navegador, sem instalar nada.',
        'Assistir e usar o chat é só para contas de maiores de 18 anos verificadas, como a lei brasileira exige.',
        'Você decide quem entra na sala e pode tirar qualquer pessoa quando quiser.',
      ],
      cta: 'Criar minha conta',
      host: 'Você · anfitrião',
      guest: 'Assistindo',
      live: 'Ao vivo',
      invite: 'Convidar',
      chat: [
        { name: 'luna', text: 'não acredito que você acertou esse pulo 😂' },
        { name: 'theo', text: 'próxima rodada é minha!' },
      ],
    },
    trustKicker: 'Privacidade',
    trustTitle: 'Seu jogo continua seu.',
    trust: [
      {
        title: 'Nada é gravado',
        body: 'O CoopSeat não grava o seu jogo nem envia para lugar nenhum. O que acontece na sua tela fica na sua tela.',
      },
      {
        title: 'Conta segura',
        body: 'Entre com Google ou e-mail e, se quiser, ative uma proteção extra com um código no celular.',
      },
      {
        title: 'Verificação de idade sem exposição',
        body: 'Para a watch party guardamos só se você é maior de idade e a data, nunca fotos ou dados do documento.',
      },
    ],
    faqTitle: 'Perguntas frequentes',
    faq: [
      {
        q: 'O CoopSeat é grátis?',
        a: 'Sim. O app e o site são gratuitos. Se quiser apoiar o projeto, há um botão de doação dentro do app.',
      },
      {
        q: 'O que eu preciso para jogar?',
        a: 'Um computador com Windows 10 ou 11, uma placa de captura (externa USB ou interna) e o cabo HDMI do seu videogame. Só isso.',
      },
      {
        q: 'Preciso de conta para jogar?',
        a: 'Não. Dá para jogar sem conta. Para assistir e conversar com os amigos, que chega em breve, vai ser preciso uma conta de maior de 18 anos verificada.',
      },
      {
        q: 'Quais placas de captura funcionam?',
        a: 'A maioria das placas de captura que o Windows reconhece como dispositivo de vídeo, sejam externas (USB) ou internas (PCIe). Alguns conteúdos protegidos contra cópia, como apps de filmes e séries, não aparecem.',
      },
      {
        q: 'Tem atraso?',
        a: 'Muito pouco. O CoopSeat foi feito para mostrar a imagem o mais rápido possível, mas parte do atraso depende da placa de captura e do computador, então pode variar um pouco de um para outro.',
      },
      {
        q: 'Por que o Windows mostra um aviso na instalação?',
        a: 'O CoopSeat é novo e ainda não tem assinatura digital, então o Windows mostra um aviso por precaução. Clique em "Mais informações" e depois em "Executar assim mesmo".',
      },
      {
        q: 'Funciona no Mac ou no Linux?',
        a: 'Por enquanto, o app é só para Windows 10 e 11. Em outros sistemas, dá para testar a versão no navegador.',
      },
    ],
    ctaTitle: 'Pronto para pegar o seu lugar?',
    ctaBody: 'Baixe o CoopSeat, conecte a placa de captura e comece a jogar em minutos.',
    footer: {
      tagline: 'Jogue e assista junto, como se estivesse no mesmo sofá.',
      product: 'Produto',
      legal: 'Legal',
      account: 'Minha conta',
      rights: (year: number) => `© ${year} CoopSeat`,
    },
  },
  download: {
    kicker: 'Download',
    title: 'Baixe o CoopSeat para Windows',
    subtitle: 'Grátis e sem precisar de conta para jogar. Instale, conecte sua placa de captura e comece a jogar.',
    version: (version: string) => `Versão ${version}`,
    released: (date: string) => `Lançada em ${date}`,
    unavailable: 'O download não está disponível agora. Tente novamente em alguns minutos.',
    recommended: 'Recomendado',
    installer: {
      title: 'Instalador',
      body: 'Instala o CoopSeat com atalhos no menu Iniciar e na área de trabalho e abre os links do CoopSeat vindos do site.',
      button: 'Baixar instalador',
    },
    portable: {
      title: 'Portátil',
      body: 'Roda sem instalar, de qualquer pasta ou pendrive. Bom para computadores onde você não pode instalar programas. A primeira abertura demora um pouco mais.',
      button: 'Baixar portátil',
    },
    stepsTitle: 'Depois de baixar',
    steps: [
      {
        title: 'Abra o arquivo',
        body: 'Execute o instalador, ou o arquivo portátil. O CoopSeat ainda não tem assinatura digital, então, se o Windows mostrar um aviso de proteção, clique em "Mais informações" e depois em "Executar assim mesmo".',
      },
      {
        title: 'Conecte a placa de captura',
        body: 'Ligue o HDMI do console no HDMI IN da placa. Se a placa for externa, ligue o USB dela no computador. Feche OBS, Câmera ou Discord se estiverem usando a placa.',
      },
      {
        title: 'Abra o CoopSeat e jogue',
        body: 'Escolha sua placa de captura e a entrada de áudio e clique em Iniciar captura.',
      },
    ],
    requirementsTitle: 'Requisitos do sistema',
    requirementsSubtitle: 'O CoopSeat é leve, mas a qualidade da imagem também depende da sua placa de captura e do computador.',
    requirements: [
      { label: 'Sistema', value: 'Windows 10 ou 11, 64 bits' },
      { label: 'Vídeo', value: 'Placa de vídeo compatível com DirectX 11' },
      { label: 'Placa de captura', value: 'Placa de captura externa (USB) ou interna (PCIe) reconhecida pelo Windows, com entrada HDMI' },
      { label: 'Conexão', value: 'Para placas externas, USB 3.0 recomendado para Full HD a 60 fps' },
      { label: 'Espaço em disco', value: 'Cerca de 400 MB livres' },
      { label: 'Internet', value: 'Só para baixar e para os recursos de conta' },
    ],
    notesTitle: 'Bom saber',
    notes: [
      'As edições N do Windows precisam do Media Feature Pack, gratuito no site da Microsoft.',
      'Conteúdo protegido contra cópia (HDCP), como apps de streaming de filmes, não aparece.',
      'Mac e Linux ainda não são suportados.',
    ],
  },
  providers: {
    signInWith: 'Entrar com',
    continueWith: 'Continuar com',
  },
  nickname: {
    label: 'Apelido',
    hint: '3 a 20 caracteres: letras, números ou _.',
    checking: 'Verificando…',
    available: 'Disponível!',
    unavailable: 'Indisponível.',
  },
  login: {
    title: 'Entrar',
    noAccount: 'Não tem conta?',
    signUp: 'Cadastre-se',
    forgot: 'Esqueci minha senha',
    submit: 'Entrar',
    pending: 'Entrando…',
    failed: 'Não foi possível entrar.',
  },
  mfa: {
    title: 'Verificação em duas etapas',
    subtitle: 'Digite o código de 6 dígitos do seu app autenticador.',
    submit: 'Confirmar',
    pending: 'Verificando…',
    invalid: 'Código inválido.',
  },
  signup: {
    title: 'Criar conta',
    haveAccount: 'Já tem conta?',
    signIn: 'Entrar',
    submit: 'Criar conta',
    pending: 'Criando…',
    failed: 'Não foi possível criar a conta.',
    confirmMinAge: 'Tenho 12 anos ou mais. Para usar a watch party (assistir, chat e criar salas), vou precisar verificar que tenho 18 anos ou mais.',
    acceptTerms: (terms, privacy) => (
      <>
        Li e aceito os {terms} e a {privacy}.
      </>
    ),
    sent: (email) => (
      <>
        Quase lá! Enviamos um link de confirmação para <strong>{email}</strong>. Abra o e-mail para ativar a conta.
      </>
    ),
  },
  forgot: {
    title: 'Esqueci minha senha',
    remembered: 'Lembrou?',
    accountEmail: 'E-mail da conta',
    submit: 'Enviar link',
    pending: 'Enviando…',
    failed: 'Não foi possível enviar.',
  },
  reset: {
    title: 'Criar nova senha',
    expired: (link) => <>O link expirou ou já foi usado. {link('Peça um novo')}.</>,
    mismatch: 'As senhas não conferem.',
    failed: 'Não foi possível salvar a senha.',
    submit: 'Salvar senha',
    pending: 'Salvando…',
    done: (link) => <>Senha atualizada. {link('Ir para minha conta')} ou volte ao app e entre com a nova senha.</>,
  },
  confirmed: {
    invalidTitle: 'Link inválido',
    invalidBody: 'O link expirou ou já foi usado. Entre na sua conta para pedir um novo.',
    emailUpdated: 'E-mail atualizado',
    emailConfirmed: 'E-mail confirmado!',
    emailUpdatedBody: 'Se você confirmou nos dois endereços, a troca foi concluída.',
    emailConfirmedBody: 'Sua conta está ativa. Você já pode usar o CoopSeat.',
    continueInBrowser: 'Continuar no navegador',
  },
  authError: {
    title: 'Não foi possível continuar',
  },
  openApp: {
    title: 'Voltando para o CoopSeat',
    subtitle: 'Se o app não abrir sozinho, use o botão abaixo. Depois pode fechar esta aba.',
    invalid: 'Link inválido.',
  },
  account: {
    greeting: (name) => `Olá, ${name}!`,
    welcome: 'Bem-vindo ao CoopSeat!',
    playBody: 'Conecte sua placa de captura e jogue o seu console direto no navegador, sem instalar nada.',
    playCta: 'Jogar agora',
    play: 'Jogar',
    tabs: { profile: 'Perfil', security: 'Login e segurança', account: 'Conta' },
    partyBody: 'Conclua os passos abaixo para liberar cada recurso da watch-party.',
    partyUnlocked: 'Tudo liberado! Você já pode assistir, conversar e criar salas.',
    dangerTitle: 'Zona de perigo',
    linked: 'Conta vinculada com sucesso.',
    verificationReceived: 'Recebemos sua verificação. O resultado aparece aqui em instantes.',
    nicknameSaved: 'Apelido salvo. Bem-vindo ao CoopSeat!',
    ageTitle: 'Verificação de idade',
    ageStatus: 'Status:',
    ageLabels: {
      UNVERIFIED: 'Não verificada',
      PENDING: 'Em análise',
      VERIFIED: 'Verificada (18+)',
      REJECTED: 'Recusada',
    },
    ageExplainer:
      'Exigida por lei (ECA Digital) para assistir, usar o chat e criar salas. Guardamos apenas o resultado (maior de idade) e a data, nunca fotos ou dados do documento.',
    verifyAge: 'Verificar minha idade',
    linkedTitle: 'Contas vinculadas',
    emailAndPassword: 'E-mail e senha',
    unlink: 'Desvincular',
    unlinked: 'Vínculo removido.',
    link: (provider) => `Vincular ${provider}`,
    permissionsTitle: 'Permissões na watch-party',
    permissions: { watch: 'Assistir', chat: 'Chat', host: 'Criar salas' },
    sessionTitle: 'Sessão',
    signOut: 'Sair',
    chooseNickname: 'Escolha seu apelido',
    nicknameExplainer: 'É assim que seus amigos vão te ver nas salas. Ele é único.',
    acceptTermsRequired: 'É preciso aceitar os Termos de Uso e a Política de Privacidade.',
    acceptTerms: (terms, privacy) => (
      <>
        Tenho 12 anos ou mais e aceito os {terms} e a {privacy}.
      </>
    ),
    terms: 'Termos',
    saveNickname: 'Salvar apelido',
    profileTitle: 'Perfil',
    nextNicknameChange: (date) => `Próxima troca liberada em ${date}.`,
    nicknameUpdated: 'Apelido atualizado.',
    addEmail: 'Adicione um e-mail',
    pendingEmailTitle: 'Troca de e-mail pendente',
    confirmPending: (email) => (
      <>
        Confirme o link enviado para <strong>{email}</strong>.
      </>
    ),
    xNoEmail: 'Sua conta do X não informou e-mail. Ele é necessário para recuperar a conta e verificar a idade.',
    checkEmail: 'Verifique seu e-mail.',
    sendConfirmation: 'Enviar confirmação',
    securityTitle: 'Segurança',
    createPassword: 'Criar senha (para entrar também com e-mail)',
    passwordSaved: 'Senha salva.',
    savePassword: 'Salvar senha',
    totpTitle: 'Verificação em duas etapas (TOTP)',
    authenticatorRemoved: 'Autenticador removido.',
    remove: 'Remover',
    scanQr: 'Escaneie o QR code no seu app autenticador e digite o código gerado.',
    qrAlt: 'QR code do autenticador',
    totpEnabled: 'Verificação em duas etapas ativada.',
    activate: 'Ativar',
    enableTotp: 'Ativar verificação em duas etapas',
    deleteAccount: 'Excluir conta',
    deleteWarning: (name) => (
      <>
        Isso apaga sua conta e seus dados para sempre. Digite <strong>{name}</strong> para confirmar.
      </>
    ),
    confirmation: 'Confirmação',
    deleteForever: 'Excluir definitivamente',
  },
  gates: {
    email: 'Confirme seu e-mail.',
    nickname: 'Escolha um apelido.',
    age: 'Verifique sua idade (18+).',
    mfa: 'Confirme a autenticação em duas etapas.',
  },
  mock: {
    title: 'Verificação simulada',
    subtitle: 'Provedor de KYC de desenvolvimento. Escolha o resultado.',
    document: 'Número do documento (para testar duplicidade)',
    outcomes: {
      adult: 'Aprovar (maior de 18)',
      minor: 'Aprovar documento de menor de 18',
      reject: 'Recusar (documento ilegível)',
      review: 'Enviar para análise manual',
    },
  },
  legal: {
    kicker: 'Legal',
    onThisPage: 'Nesta página',
    alsoRead: 'Leia também',
  },
  privacy: {
    title: 'Política de Privacidade',
    compliance: 'Em conformidade com a LGPD (Lei 13.709/2018) e o ECA Digital (Lei 15.211/2025).',
    sections: [
      {
        heading: 'O que coletamos',
        body: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Conta: e-mail, apelido, foto de perfil do provedor (quando você entra com Google).</li>
            <li>Segurança: registros de acesso e tentativas, para evitar abuso (retidos por até 30 dias).</li>
            <li>
              Verificação de idade: apenas o resultado (maior de idade ou não), a data e uma impressão criptográfica irreversível do
              documento, usada para impedir que o mesmo documento verifique várias contas. Fotos, selfie e dados do documento ficam
              com o parceiro de verificação e não são armazenados pelo CoopSeat.
            </li>
          </ul>
        ),
      },
      {
        heading: 'O que não coletamos',
        body: <p>Não gravamos suas transmissões, câmera ou controles. A mídia trafega ponto a ponto entre os participantes.</p>,
      },
      {
        heading: 'Para que usamos',
        body: <p>Autenticar você, manter a conta segura, cumprir a obrigação legal de verificação etária e operar as salas.</p>,
      },
      {
        heading: 'Cookies',
        body: (
          <p>
            Cookies essenciais mantêm sua sessão, o idioma escolhido e a segurança do login. Com a sua permissão, também usamos o
            Google Analytics para ver, de forma agregada, quais páginas são visitadas. Você pode mudar sua escolha a qualquer
            momento em Preferências de cookies, no rodapé do site.
          </p>
        ),
      },
      {
        heading: 'Estatísticas do app para Windows',
        body: (
          <p>
            Só se você permitir, o app avisa quando é aberto e quando a captura começa, com a versão do app, o modo de captura e um
            identificador aleatório que não está ligado à sua conta. Esses dados passam pelo nosso servidor antes de chegar ao Google
            Analytics, então o Google não recebe o seu IP. Você pode desligar isso nas Preferências do app, e o identificador é apagado.
          </p>
        ),
      },
      {
        heading: 'Seus direitos',
        body: (
          <p>
            Você pode acessar, corrigir e excluir seus dados a qualquer momento em Minha conta. A exclusão remove perfil, vínculos e
            verificações. Dúvidas: privacidade@coopseat.com.
          </p>
        ),
      },
    ],
  },
  terms: {
    title: 'Termos de Uso',
    version: (version) => `Versão ${version}`,
    sections: [
      {
        heading: '1. Quem pode usar',
        body: (
          <p>
            Jogar no navegador (a página Jogar) e o app para Windows são livres para todos, sem conta. Para criar uma conta é
            preciso ter 12 anos ou mais. A watch party (assistir, transmitir, usar o chat e criar salas) é exclusiva para maiores
            de 18 anos, que precisam verificar a idade com documento e selfie por meio de um parceiro de verificação. Contas de
            menores de 12 anos serão encerradas. Se você tem menos de 18 anos, use o CoopSeat com a orientação dos seus pais ou
            responsáveis.
          </p>
        ),
      },
      {
        heading: '2. Sua conta',
        body: (
          <p>
            Você é responsável pela sua conta e pelo que acontece nas salas que cria. O apelido e o e-mail são únicos. Recomendamos
            ativar a verificação em duas etapas. Não compartilhe sua senha.
          </p>
        ),
      },
      {
        heading: '3. Conduta',
        body: (
          <p>
            É proibido transmitir conteúdo ilegal, de terceiros sem autorização, discurso de ódio, assédio, conteúdo sexual ou
            qualquer material envolvendo menores. Podemos suspender contas que violem estas regras e colaborar com autoridades.
          </p>
        ),
      },
      {
        heading: '4. Transmissões',
        body: (
          <p>
            As transmissões são ponto a ponto entre os participantes e não são gravadas pelo CoopSeat. Quem cria a sala decide quem
            participa e pode remover convidados.
          </p>
        ),
      },
      {
        heading: '5. Encerramento',
        body: <p>Você pode excluir sua conta a qualquer momento em Minha conta. Os dados são apagados conforme a Política de Privacidade.</p>,
      },
      {
        heading: '6. Contato',
        body: <p>suporte@coopseat.com</p>,
      },
    ],
  },
  cookies: {
    preferences: 'Preferências de cookies',
    acceptAll: 'Aceitar todos',
    acceptNecessary: 'Só os essenciais',
    save: 'Salvar escolhas',
    close: 'Fechar',
    consent: {
      title: 'Usamos cookies',
      description:
        'Cookies essenciais fazem o site funcionar. Com a sua permissão, também usamos o Google Analytics para entender como o site é usado. Você pode mudar isso quando quiser.',
      customize: 'Personalizar',
    },
    intro: 'Escolha quais cookies o CoopSeat pode usar. Os essenciais ficam sempre ligados, porque o site não funciona sem eles.',
    necessary: {
      title: 'Essenciais',
      description: 'Mantêm sua sessão, o idioma escolhido e a segurança do login. Não dá para desligar.',
    },
    analytics: {
      title: 'Estatísticas',
      description:
        'Google Analytics: mostra para a gente, de forma agregada, quais páginas são visitadas e de onde vêm os acessos. Só é ativado se você permitir.',
    },
    more: {
      title: 'Mais informações',
      description: (privacyLink) => `Leia a nossa ${privacyLink} para saber como tratamos os seus dados.`,
    },
  },
  messages: {
    confirmationSent: 'Enviamos um link de confirmação para o seu e-mail.',
    emailChangeSent: 'Enviamos um link de confirmação para o novo e-mail.',
    passwordUpdated: 'Senha atualizada.',
    resetLinkSent: 'Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.',
    resendSent: 'Se houver um cadastro pendente para esse e-mail, reenviamos o link.',
  },
  errors: {
    generic: 'Algo deu errado. Tente novamente.',
    internal: 'Erro interno. Tente novamente em instantes.',
    invalid_input: 'Dados inválidos.',
    invalid_json: 'Corpo da requisição inválido.',
    bad_origin: 'Origem da requisição não permitida.',
    rate_limited: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    unauthenticated: 'Sua sessão expirou. Entre novamente.',
    auth_unavailable: 'Não foi possível concluir agora. Tente novamente.',
    captcha_required: 'Confirme que você não é um robô.',
    captcha_failed: 'Não foi possível validar o captcha. Tente de novo.',
    turn_unavailable: 'Não foi possível preparar a conexão agora. Tente novamente.',
    download_unavailable: 'O download não está disponível agora. Tente novamente em alguns minutos.',
    email_unavailable: 'Não foi possível enviar o e-mail agora. Tente novamente.',
    invalid_credentials: 'E-mail ou senha incorretos.',
    email_not_confirmed: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
    email_unconfirmed: 'Confirme seu e-mail antes de verificar a idade.',
    user_already_exists: 'Esse e-mail já está em uso.',
    email_exists: 'Esse e-mail já está em uso.',
    weak_password: 'Senha fraca ou já vazada em outro serviço. Escolha outra.',
    same_password: 'A nova senha precisa ser diferente da atual.',
    over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos.',
    over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos.',
    otp_expired: 'O link expirou ou já foi usado. Peça um novo.',
    mfa_verification_failed: 'Código inválido. Confira o app autenticador e tente de novo.',
    mfa_challenge_expired: 'O código expirou. Tente de novo.',
    mfa_factor_name_conflict: 'Já existe um autenticador com esse nome.',
    mfa_required: 'Confirme o código de autenticação em duas etapas para continuar.',
    mfa_expired: 'O tempo para confirmar o código acabou. Entre novamente.',
    mfa_not_enrolled: 'Nenhum autenticador encontrado.',
    identity_already_exists: 'Essa conta do provedor já está vinculada a outro usuário.',
    identity_not_found: 'Vínculo não encontrado.',
    single_identity_not_deletable: 'Você precisa manter pelo menos uma forma de login.',
    manual_linking_disabled: 'Vinculação de contas indisponível no momento.',
    insufficient_aal: 'Confirme a autenticação em duas etapas para continuar.',
    reauthentication_needed: 'Entre novamente para alterar a senha.',
    session_not_found: 'Sua sessão expirou. Entre novamente.',
    refresh_token_not_found: 'Sua sessão expirou. Entre novamente.',
    refresh_token_already_used: 'Sua sessão expirou. Entre novamente.',
    bad_jwt: 'Sua sessão expirou. Entre novamente.',
    user_not_found: 'Conta não encontrada.',
    signup_disabled: 'Cadastros temporariamente desativados.',
    ticket_invalid: 'O login expirou. Tente entrar de novo.',
    confirm_mismatch: 'Digite seu apelido exatamente como aparece para confirmar.',
    nickname_taken: 'Esse apelido já está em uso.',
    nickname_cooldown: 'Você só pode trocar de apelido uma vez a cada 30 dias.',
    already_verified: 'Sua idade já foi verificada.',
    kyc_locked: 'Limite de tentativas atingido. Fale com o suporte.',
    kyc_attempts: 'Você atingiu o limite de 3 tentativas em 30 dias.',
    kyc_unavailable: 'Não foi possível iniciar a verificação de idade agora. Tente novamente em alguns minutos.',
    nickname_required: 'Informe um apelido.',
    nickname_format: 'O apelido deve ter de 3 a 20 caracteres: letras, números ou _.',
    nickname_reserved: 'Esse apelido é reservado.',
    email_required: 'Informe um e-mail.',
    email_too_long: 'E-mail muito longo.',
    email_invalid: 'E-mail inválido.',
    password_required: 'Informe uma senha.',
    password_too_short: 'A senha deve ter pelo menos 8 caracteres.',
    password_too_long: 'A senha deve ter no máximo 72 caracteres.',
    password_weak: 'A senha deve ter letras e números.',
    terms_required: 'É preciso aceitar os Termos de Uso e a Política de Privacidade.',
    min_age_required: 'É preciso ter 12 anos ou mais para criar uma conta no CoopSeat.',
    nothing_to_update: 'Nada para atualizar.',
    confirm_required: 'Digite seu apelido para confirmar.',
    provider_unsupported: 'Provedor não suportado.',
    pkce_challenge_invalid: 'Desafio PKCE inválido.',
    pkce_verifier_invalid: 'Verificador PKCE inválido.',
    totp_format: 'O código tem 6 dígitos.',
    login_expired: 'O login expirou. Volte e tente de novo.',
    provider_already_linked: 'Essa conta do provedor já está vinculada a outro usuário do CoopSeat.',
    provider_refused: 'O provedor recusou o login. Tente de novo.',
    provider_bad_response: 'Resposta inválida do provedor.',
    login_failed: 'Não foi possível concluir o login. Tente de novo.',
    oauth_start_failed: 'Não foi possível iniciar o login com esse provedor.',
    link_expired: 'O link de vinculação expirou. Tente de novo pelo app.',
    link_failed: 'Não foi possível iniciar a vinculação. Entre novamente e tente de novo.',
  },
};
