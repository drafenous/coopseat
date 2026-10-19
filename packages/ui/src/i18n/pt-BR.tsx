import { Kbd } from '../components/atoms/Kbd';
import type { TroubleshootIssue, UiDictionary } from './en';

export const ptBR: UiDictionary = {
  common: {
    close: 'Fechar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Salvar',
    back: 'Voltar',
    language: 'Idioma',
  },
  api: {
    network: 'Não foi possível falar com o CoopSeat. Confira sua internet.',
    generic: 'Algo deu errado. Tente novamente.',
  },
  mediaErrors: {
    NotAllowedError:
      'Acesso negado. Ative câmera e microfone para aplicativos nas configurações de privacidade do Windows.',
    NotReadableError:
      'Não foi possível abrir a placa. Feche OBS, Câmera e outros apps que estejam usando o dispositivo.',
    OverconstrainedError:
      'A placa não oferece essa resolução ou FPS. Escolha outro modo.',
    NotFoundError: 'Dispositivo não encontrado. Confira o cabo USB.',
  },
  providers: { continueWith: 'Continuar com', link: 'Vincular' },
  auth: {
    notStartedHere:
      'Esse login não foi iniciado neste app. Tente entrar de novo.',
    signedIn: 'Você entrou no CoopSeat.',
    linked: 'Conta vinculada.',
    ageSubmitted: 'Verificação de idade enviada. Seu status foi atualizado.',
    emailConfirmed: 'E-mail confirmado.',
    appOnly: 'Disponível apenas no aplicativo.',
  },
  capture: {
    nativeFailure: 'Falha nativa.',
    openInApp: 'Abra pelo aplicativo ou em localhost.',
    device: (n) => `Dispositivo ${n}`,
    devicesChanged:
      'A lista de dispositivos mudou. Se a captura parou, reconecte a placa e atualize.',
    selectCard: 'Selecione uma placa de captura.',
    disconnected: 'A placa foi desconectada ou interrompeu a captura.',
    audioFailed: (reason) => `Vídeo ativo, mas o áudio falhou: ${reason}`,
    micDenied: (reason) => `Câmera liberada, mas o microfone não: ${reason}`,
    pipFailed: (reason) =>
      `Não foi possível abrir o Picture in Picture: ${reason}`,
    access: {
      waitingExternal:
        'A abertura está demorando. O antivírus pode estar pedindo permissão para a câmera ou o microfone. Confira o aviso dele.',
      waiting:
        'Ainda aguardando permissão de câmera ou microfone. Confira o pedido do navegador ou um aviso do antivírus.',
      browserPrompt:
        'O navegador está pedindo permissão de câmera e microfone. Aceite o aviso para continuar.',
      windowsPrivacy: (device) =>
        device === 'camera'
          ? 'O Windows bloqueou a câmera. Em Configurações > Privacidade e segurança > Câmera, ative o acesso e permita apps da área de trabalho.'
          : device === 'microphone'
            ? 'O Windows bloqueou o microfone. Em Configurações > Privacidade e segurança > Microfone, ative o acesso e permita apps da área de trabalho.'
            : 'O Windows bloqueou a câmera ou o microfone. Em Configurações > Privacidade e segurança, permita apps da área de trabalho em Câmera e em Microfone.',
      externalBlock:
        'O Windows já permite o acesso, mas a câmera ou o microfone não abriu. Libere o CoopSeat na proteção de webcam do antivírus, ou feche OBS, Câmera e outros apps que estejam usando a placa.',
      externalBlockWeb:
        'O navegador já tem permissão, mas a câmera ou o microfone não abriu. Um antivírus pode estar bloqueando o dispositivo, ou outro app está usando a placa.',
      browserDenied:
        'Acesso negado. Permita câmera e microfone para este site no navegador. Se o site já estiver permitido, confira a privacidade do Windows e a proteção de webcam do antivírus.',
    },
  },
  presets: {
    updated: (name) => `Preset "${name}" atualizado.`,
    saved: (name) => `Preset "${name}" salvo.`,
    applied: (name) => `Preset "${name}" aplicado.`,
    confirmDelete: (name) => `Excluir o preset "${name}"?`,
    deleted: (name) => `Preset "${name}" excluído.`,
    notDefault: (name) => `"${name}" não é mais o preset padrão.`,
    willLoad: (name) => `"${name}" será carregado ao abrir o app.`,
  },
  page: {
    autoCinemaOff:
      'Modo cinema automático desativado. Você pode reativar na setinha ao lado do botão Cinema.',
  },
  header: {
    troubleshoot: 'Solução de problemas',
    help: 'Ajuda',
    preferences: 'Preferências',
    myAccount: 'Minha conta',
    myRoom: 'Minha sala',
    signIn: 'Entrar',
    signOut: 'Sair',
  },
  accountCta: {
    title: 'Jogue junto no CoopSeat',
    body: 'Crie uma conta grátis para conversar, falar e criar salas nas sessões.',
    signUp: 'Criar conta',
    signIn: 'Já tenho conta',
  },
  status: {
    idle: 'Pronto para conectar',
    busy: 'Conectando…',
    live: 'Captura ativa',
  },
  captureButton: {
    stop: 'Parar captura',
    cancel: 'Cancelar',
    start: 'Iniciar captura',
  },
  donate: {
    text: 'Ajude a manter esse app gratuito',
    button: 'Faça uma doação',
  },
  volume: {
    mute: 'Silenciar',
    unmute: 'Ativar som',
    muteTitle: 'Silenciar · M',
    volume: 'Volume',
  },
  advanced: {
    title: 'Avançado',
    backend: 'Modo de captura',
    native: (available) =>
      `Nativo · menor atraso${available ? '' : ' (não disponível)'}`,
    compat: 'Compatibilidade · funciona em qualquer PC',
    videoFormat: 'Formato de vídeo',
    noModes: 'Nenhum modo disponível',
    resolution: 'Resolução',
    vsyncNative: 'Evita cortes na imagem',
    vsyncCompat: 'Disponível só no modo Nativo',
  },
  effects: {
    title: 'Efeitos e filtros',
    smoothing: 'Suavizar serrilhado',
    smoothingHint: 'Deixa a imagem mais bonita, mas pode causar input lag',
    smoothingGrid:
      'Não se aplica aos efeitos CRT e LCD, que precisam dos pixels nítidos',
    effect: 'Efeito de tela',
    list: {
      none: 'Nenhum',
      crt: 'CRT retrô',
      crtFlat: 'CRT retrô (plano)',
      lcd: 'Tela de portátil (LCD)',
      vivid: 'Cores vívidas',
      protanopia: 'Daltonismo · protanopia (vermelho)',
      deuteranopia: 'Daltonismo · deuteranopia (verde)',
      tritanopia: 'Daltonismo · tritanopia (azul)',
    },
    smoothingLevel: 'Intensidade',
    smoothingLight: 'Leve · anti-aliasing',
    smoothingStrong: 'Forte · anti-aliasing + nitidez',
  },
  preferences: {
    title: 'Preferências',
    body: 'Valem para o app todo, independente da conta ou do preset.',
    cookies: 'Cookies',
    cookiesHint: 'Escolha se o site pode usar o Google Analytics',
    manage: 'Gerenciar',
    telemetry: 'Enviar estatísticas de uso anônimas',
    telemetryHint:
      'Só quando o app abre e quando a captura começa, com a versão do app e o modo de captura',
  },
  authModal: {
    mfaTitle: 'Verificação em duas etapas',
    mfaBody: 'Digite o código de 6 dígitos do seu aplicativo autenticador.',
    code: 'Código',
    title: 'Entrar no CoopSeat',
    pitch: 'Sua conta libera o chat nas sessões e permite criar salas.',
    continueIn: (provider) =>
      `Continue no navegador com ${provider}. O app volta sozinho quando terminar.`,
    orWithEmail: 'ou com e-mail',
    email: 'E-mail',
    password: 'Senha',
    signingIn: 'Entrando…',
    signIn: 'Entrar',
    forgot: 'Esqueci minha senha',
    createAccount: 'Criar conta',
    adultsOnly:
      'Contas são só para maiores de 18 anos. Para assistir como convidado você não precisa de conta.',
  },
  viewer: {
    monitor: 'Monitor de captura',
    native: 'NATIVO',
    compat: 'COMPATIBILIDADE',
    startParty: 'Iniciar uma gaming-party',
    cinemaHint: (
      <>
        Modo cinema · mexa o mouse para sair · <Kbd>F11</Kbd> monitor inteiro
      </>
    ),
  },
  help: {
    title: 'Como começar',
    steps: [
      {
        title: 'Conecte os cabos',
        body: 'HDMI do console na entrada da placa de captura, e a placa numa porta USB do computador (USB 3, se tiver).',
      },
      {
        title: 'Escolha a placa e o áudio',
        body: 'No painel à direita, selecione a placa e a entrada de áudio dela. O microfone do PC nunca é ativado sozinho.',
      },
      {
        title: 'Clique em Iniciar captura',
        body: 'A imagem do console aparece na tela. Salve tudo como preset para não configurar de novo.',
      },
    ],
    twoWays: 'Duas formas de ver só o jogo',
    cinemaTitle: 'Modo cinema',
    cinemaFooter: 'Mexa o mouse para sair',
    cinemaBody: (
      <>
        Os controles somem e o vídeo ocupa a <strong>janela</strong>. Entra
        sozinho quando você fica parado, ou pelo botão Cinema.
      </>
    ),
    fullscreenTitle: 'Tela cheia',
    fullscreenFooter: (
      <>
        <Kbd>F11</Kbd> entra e sai · <Kbd>Esc</Kbd> sai
      </>
    ),
    fullscreenBody: (
      <>
        O vídeo ocupa o <strong>monitor inteiro</strong>, sem bordas nem barra
        de tarefas.
      </>
    ),
    shortcutFullscreen: 'tela cheia',
    shortcutExit: 'sair da tela cheia e do modo cinema',
    shortcutMute: 'silenciar',
    tips: [
      'Se a placa não abrir, feche OBS, Câmera e outros apps que possam estar usando ela.',
      'Conteúdo protegido por HDCP (alguns apps de vídeo) não aparece em placas de captura.',
      'O modo Nativo tem menos atraso. Se não estiver disponível, use Compatibilidade em Avançado.',
      'Para jogar você não precisa de conta. Ela é para maiores de 18 anos: com e-mail confirmado, apelido e idade verificada, libera o chat nas sessões e permite criar salas.',
    ],
    gotIt: 'Entendi',
  },
  metrics: {
    signal: 'SINAL RECEBIDO',
    waiting: 'Aguardando dados',
    startToSee: 'Inicie a captura para ver',
    streamStartToSee: 'Assista a uma transmissão para ver',
    fps: (native) => `FPS ${native ? 'NA TELA' : 'NEGOCIADOS'}`,
    fpsDetail: 'quadros por segundo',
    dropped: 'QUADROS PERDIDOS',
    droppedDetail: 'descartados pelo app',
    loss: 'PERDA DE PACOTES',
    lossDetail: 'perdidos no caminho',
  },
  nickname: {
    title: 'Escolha seu apelido',
    body: 'É o nome que os outros veem nas sessões. Ele é único e só pode ser trocado a cada 30 dias.',
    label: 'Apelido',
    placeholder: 'Ex.: rodri_gamer',
    format: 'De 3 a 20 caracteres: letras, números ou _.',
    checking: 'Verificando…',
    available: 'Disponível.',
    taken: 'Esse apelido já está em uso.',
    acceptTerms: (terms, privacy) => (
      <>
        Tenho 18 anos ou mais e aceito os {terms} e a {privacy}.
      </>
    ),
    terms: 'Termos de Uso',
    privacy: 'Política de Privacidade',
    notNow: 'Agora não',
  },
  presetPicker: {
    label: 'Preset',
    choose: 'Escolher preset…',
    none: 'Nenhum preset salvo',
    options: 'Opções de preset',
    saveNew: 'Salvar como novo preset…',
    update: (name) => `Atualizar “${name}”`,
    stopDefault: 'Deixar de abrir com este preset',
    makeDefault: 'Abrir o app com este preset',
    delete: (name) => `Excluir “${name}”`,
    autoOpens: 'Abre automaticamente com o app',
  },
  savePreset: {
    title: 'Salvar preset',
    body: 'Guarda a placa, o áudio, o formato de imagem e as opções atuais.',
    label: 'Nome do preset',
    placeholder: 'Ex.: Nintendo Switch',
    exists: 'Já existe um preset com esse nome. Ele será substituído.',
  },
  telemetry: {
    title: 'Quer ajudar a melhorar o CoopSeat?',
    body: 'Com a sua permissão, o app avisa a gente, de forma anônima, quando é aberto e quando a captura começa, junto com a versão do app e o modo de captura. Assim sabemos quantas pessoas usam o CoopSeat e qual modo funciona melhor.',
    never:
      'Nunca enviamos o seu jogo, imagens, áudio, dispositivos, conta ou qualquer coisa que você digita.',
    later:
      'Você pode mudar isso quando quiser em Preferências (ícone de engrenagem no topo).',
    allow: 'Permitir',
    deny: 'Não, obrigado',
  },
  settings: {
    title: 'Configurar entrada',
    refresh: 'Atualizar dispositivos',
    collapse: 'Recolher painel',
    expand: 'Expandir painel',
    preset: 'PRESET',
    io: 'Entrada e saída',
    card: 'Placa de captura',
    selectDevice: 'Selecione um dispositivo',
    permit: 'Permitir câmera e microfone',
    audio: 'ÁUDIO',
    audioInput: 'Entrada de áudio da placa',
    noAudio: 'Sem áudio',
    output: 'Tocar o som em',
    systemDefault: 'Padrão do Windows',
    autoConnect: 'Capturar ao abrir',
    autoConnectHint: 'Inicia a captura assim que o app abre',
    local: 'A captura fica no seu PC. Nada é gravado.',
  },
  cinemaMenu: {
    label: 'Opções do modo cinema',
    enterIn: 'Entrar automaticamente no modo cinema em:',
    seconds: (s) => (s === 1 ? '1 segundo' : `${s} segundos`),
    never: 'Nunca',
    hint: 'Com a captura ligada, o modo cinema entra sozinho quando não há atividade no teclado nem no mouse. Mexa em qualquer coisa para voltar.',
  },
  toasts: {
    cinemaPaused: 'Modo cinema em pausa',
    stayStill: 'Fique parado para retomar a contagem',
    enteringIn: 'Entrando no modo cinema em',
    moveToPause: 'Mexa o mouse para pausar',
    enterNow: 'Entrar agora',
    disableAuto: 'Desativar automático',
    seeSolutions: 'Ver soluções',
  },
  transport: {
    fullscreen: 'tela cheia',
    exit: 'sair',
    mute: 'silenciar',
    shortcuts: 'Atalhos de teclado',
    shortcutsTitle: 'Atalhos de teclado',
    stats: 'Detalhes técnicos',
    alwaysOnTop: 'Sempre no topo',
    pip: 'Picture in Picture',
    pipTitle:
      'Picture in Picture: abre o vídeo numa janela flutuante (modo compatibilidade)',
    cinema: 'Modo cinema',
    cinemaTitle: 'Modo cinema: esconde os controles e amplia o vídeo na janela',
    cinemaText: 'Cinema',
    fullscreenLabel: 'Tela cheia no monitor inteiro',
    fullscreenTitle: 'Tela cheia no monitor inteiro · F11',
    fullscreenText: 'Tela cheia',
  },
  emptyState: {
    preparing: 'Preparando a captura…',
    ready: 'Tudo pronto para jogar',
    connect: 'Conecte sua placa de captura',
    card: 'Placa',
    chooseCard: 'Escolha uma placa no painel ao lado',
    audio: 'Áudio',
    noAudio: 'Sem áudio · escolha a entrada da placa',
    image: 'Imagem',
    detecting: 'Detectando formatos…',
    instructions: (
      <>
        Ligue o HDMI do console na placa de captura
        <br />e a placa numa porta USB do computador.
      </>
    ),
    console: 'CONSOLE',
    usb: 'CAPTURA USB',
    computer: 'COMPUTADOR',
    permit: 'Permitir câmera e microfone',
  },
  party: {
    title: (nick: string) => `Sala de ${nick}`,
    myRoom: 'Minha sala',
    leave: 'Sair da sala',
    copyLink: 'Copiar link da sala',
    copied: 'Link da sala copiado.',
    tabs: { chat: 'Chat', people: 'Pessoas', settings: 'Sala' },
    status: {
      connecting: 'Conectando…',
      reconnecting: 'Reconectando…',
      open: 'Ao vivo',
      closed: 'Offline',
    },
    gate: {
      loading: 'Abrindo a sala…',
      offline: (nick: string) => `${nick} não está com a sala aberta agora`,
      offlineBody:
        'A sala abre quando alguém autorizado começa a transmitir. Esta página confere de novo sozinha.',
      ownerOffline: 'Sua sala está fechada',
      ownerOfflineBody:
        'Comece a transmitir para abrir a sessão. Ela continua enquanto houver alguém na sala e se encerra quando a sala fica vazia.',
      canOpen: 'Esta sala está fechada',
      canOpenBody:
        'Você pode transmitir aqui. Comece a transmissão para abrir a sessão, mesmo com o dono offline.',
      password: 'Esta sala tem senha',
      passwordLabel: 'Senha da sala',
      enter: 'Entrar',
      pending: 'Aguardando aprovação',
      pendingBody:
        'Alguém da sala precisa liberar sua entrada. Mantenha esta página aberta; ninguém vê sua conexão até lá.',
      notInvited: 'Esta sala é só para convidados',
      notInvitedBody: 'Só quem está na lista do dono pode entrar.',
      banned: 'Você não pode entrar nesta sala',
      unavailable: 'As salas estão indisponíveis para a sua conta.',
      disabled: 'As salas estão temporariamente desativadas.',
      requirements: 'Verifique sua conta para entrar',
      requirementsBody: 'As salas são só para contas verificadas.',
      missing: {
        email: 'Confirme seu e-mail',
        nickname: 'Escolha um apelido',
        age: 'Verifique sua idade (18+)',
        mfa: 'Ative a verificação em duas etapas',
      } as Record<string, string>,
      openAccount: 'Abrir minha conta',
      ended: {
        owner_ended: 'A sessão foi encerrada.',
        owner_timeout: 'A sessão acabou: o dono perdeu a conexão.',
        empty: 'A sala ficou vazia e a sessão foi encerrada.',
        max_duration: 'A sessão atingiu o tempo máximo.',
        sanction: 'A sessão foi encerrada pelo CoopSeat.',
        operator: 'A sessão foi encerrada pelo CoopSeat.',
      },
      endedBody: 'Todos foram desconectados e o chat foi apagado.',
      removed: {
        kick: 'Você foi removido da sessão.',
        ban: 'Você foi banido desta sala.',
        sanction: 'Seu acesso foi suspenso pelo CoopSeat.',
        full: 'A sala está cheia.',
        denied: 'Sua entrada não foi aprovada.',
        replaced: 'Você abriu esta sala em outra janela.',
        token_expired: 'Seu acesso expirou.',
        invalid: 'Seu acesso não é mais válido.',
      },
      retry: 'Tentar de novo',
      signIn: 'Entre para acessar',
      ipNotice:
        'As transmissões são ponto a ponto: os outros participantes podem ver seu endereço IP. Entre só em salas de pessoas em quem você confia.',
    },
    stream: {
      start: 'Iniciar transmissão',
      stop: 'Parar transmissão',
      starting: 'Iniciando…',
      request: 'Pedir para transmitir',
      requested: 'Pedido enviado',
      resume:
        'Sua transmissão foi interrompida. Confira a fonte no painel de entrada e clique em Iniciar transmissão.',
    },
    source: {
      kind: 'Tipo de captura',
      card: 'Dispositivo de Captura',
      screen: 'Captura de Tela',
      window: 'Captura de Janela',
      pick: 'Clique na fonte que você quer transmitir',
      pickInPanel: 'Escolha a tela ou janela no painel de entrada.',
      audio: 'Incluir áudio do sistema',
      audioHint:
        'Outras transmissões tocando aqui também podem entrar; use fones.',
      desktopAudio: {
        window: {
          label: 'Incluir áudio do programa',
          hint: 'Só o som do programa desta janela. Em Windows antigos, entra o áudio do sistema.',
        },
        screen: {
          label: 'Incluir áudio do PC',
          hint: 'Todo o som do computador, menos o do CoopSeat (chat e outras transmissões).',
        },
      },
      refresh: 'Atualizar',
      loading: 'Procurando fontes…',
      empty: 'Nenhuma fonte encontrada.',
      browserPicker:
        'Ao iniciar a transmissão, o navegador vai perguntar qual tela ou janela compartilhar.',
    },
    layout: {
      label: 'Layout',
      stage: 'Palco principal',
      grid: 'Grade',
      splitOrientation: 'Direção da divisão',
      horizontal: 'Lado a lado',
      vertical: 'Empilhado',
    },
    stage: {
      empty: 'Ninguém está transmitindo ainda',
      emptyOwner: 'Comece a transmitir para abrir a sessão',
      you: 'Você',
      connecting: 'Conectando…',
      reconnecting: 'Reconectando…',
      failed: 'Conexão perdida',
      focus: 'Mostrar no palco',
      hideFromGrid: 'Tirar da grade',
      showInGrid: 'Mostrar na grade',
      emptyCell: 'Solte uma transmissão aqui',
      mute: 'Silenciar',
      unmute: 'Ativar som',
      loss: (pct: number) => `${pct.toLocaleString('pt-BR')}% de perda`,
      openPanel: 'Mostrar painel da sala',
      hidden: (n: number) =>
        n === 1
          ? '1 transmissão oculta (desconectada para economizar dados)'
          : `${n} transmissões ocultas (desconectadas para economizar dados)`,
    },
    chat: {
      placeholder: 'Envie uma mensagem',
      send: 'Enviar',
      empty: 'Nenhuma mensagem ainda. Diga oi!',
      disabled: 'O chat está desligado',
      muted: 'Você não pode conversar nesta sala',
      emoji: 'Emoji',
      delete: 'Apagar mensagem',
      erased: 'O chat é apagado quando a sessão termina.',
    },
    people: {
      owner: 'Dono',
      moderator: 'Moderador',
      streaming: 'Ao vivo',
      away: 'Reconectando',
      actions: (nick: string) => `Ações para ${nick}`,
      kick: 'Remover da sessão',
      ban: 'Banir da sala',
      ban24: 'Banir por 24 horas',
      grant: 'Permitir transmitir',
      revoke: 'Retirar permissão de transmitir',
      kill: 'Parar transmissão',
      confirmBan: (nick: string) =>
        `Banir ${nick} da sala? A pessoa não poderá voltar.`,
    },
    approvals: {
      title: 'Aguardando entrada',
      approve: 'Liberar',
      deny: 'Recusar',
    },
    requests: {
      title: 'Pedindo para transmitir',
      grant: 'Permitir',
      deny: 'Ignorar',
    },
    settings: {
      access: 'Acesso',
      accessHint: 'Opcional. Com senha definida, quem entrar precisa dela.',
      password: 'Senha',
      passwordSet: 'Há uma senha definida',
      passwordNone: 'Sem senha',
      setPassword: 'Definir',
      removePassword: 'Remover',
      passwordPlaceholder: '4 a 64 caracteres',
      visibility: 'Visibilidade da sala',
      visibilityOptions: {
        protected: 'Protegido — com aprovação ou lista de acesso',
        private: 'Privado — somente na lista de acesso',
        public: 'Público — aprovação imediata',
      },
      whitelist: 'Lista de acesso',
      emptyWhitelist: {
        title: 'Ninguém na lista de acesso',
        hint: 'Quem você adicionar entra direto e pode transmitir se você liberar.',
      },
      nickname: 'Apelido',
      add: 'Adicionar',
      canStream: 'Pode transmitir',
      remove: (nick: string) => `Remover ${nick}`,
      moderators: 'Moderadores',
      emptyModerators: {
        title: 'Nenhum moderador',
        hint: 'Eles ajudam a aprovar entradas, cuidar das transmissões e da sala.',
      },
      modOptions: (nick: string) => `Permissões de ${nick}`,
      modPerms: {
        canKick: 'Remover',
        canBan: 'Banir',
        canStopStreams: 'Parar transmissões',
        canApprove: 'Aprovar entradas',
        canGrantStream: 'Permitir transmissão',
        canDeleteMessages: 'Apagar mensagens',
      },
      bans: 'Banidos',
      emptyBans: {
        title: 'Ninguém banido',
        hint: 'Quem for banido não consegue entrar nesta sala até você desbanir.',
      },
      unban: 'Desbanir',
      until: (date: string) => `até ${date}`,
      forever: 'permanente',
      layout: 'Layout padrão',
      saved: 'Sala atualizada.',
      limits: (people: number, streamers: number) =>
        `Até ${people} pessoas e ${streamers} transmissores por sessão.`,
      endSession: 'Encerrar sessão',
      confirmEnd: 'Encerrar a sessão para todos? O chat será apagado.',
    },
    granted: 'Agora você pode transmitir.',
    revoked: 'Sua permissão de transmitir foi retirada.',
    banned: 'Usuário banido.',
    errors: {
      generic: 'Algo deu errado na sala.',
      rate_limited: 'Vá com calma.',
      too_large: 'Essa mensagem é grande demais.',
      invalid: 'Pedido inválido.',
      pending: 'Aguarde ser liberado primeiro.',
      forbidden: 'Você não tem permissão para isso.',
      chat_forbidden: 'Você não pode conversar nesta sala.',
      chat_rate_limited: 'Você está enviando mensagens rápido demais.',
      chat_invalid: 'As mensagens podem ter até 200 caracteres.',
      stream_forbidden: 'Você não tem permissão para transmitir.',
      owner_not_live:
        'Você só pode transmitir enquanto o dono estiver ao vivo.',
      stream_full: 'O limite de transmissores foi atingido.',
    },
  },
  troubleshoot: {
    title: 'Solução de problemas',
    intro:
      'Os problemas mais comuns e como resolver. Clique num item para ver os passos.',
    issues: (desktop) => {
      const list: (TroubleshootIssue | false)[] = [
        {
          id: 'not-listed',
          title: 'A placa não aparece na lista',
          steps: [
            <>
              Ligue a placa direto numa porta USB do computador, sem hub nem
              extensão. Prefira USB 3 (porta azul ou com "SS"), de preferência
              atrás do gabinete.
            </>,
            <>
              Troque de porta e clique em{' '}
              <strong>Atualizar dispositivos</strong> (ícone ↻ no painel).
            </>,
            <>
              Abra o <strong>Gerenciador de Dispositivos</strong> do Windows e
              veja se a placa aparece em "Câmeras" ou "Dispositivos de imagem"
              sem um aviso amarelo.
            </>,
            <>
              Desconecte a placa por alguns segundos e conecte de novo. Se
              continuar sumida, reinicie o PC.
            </>,
          ],
        },
        {
          id: 'black',
          title: 'A captura inicia, mas a tela fica preta',
          steps: [
            <>
              Confira se o console está ligado e se o cabo HDMI vai da{' '}
              <strong>saída</strong> do console para a <strong>entrada</strong>{' '}
              (HDMI IN) da placa.
            </>,
            <>
              No PlayStation, desative o HDCP:{' '}
              <strong>
                Configurações &gt; Sistema &gt; HDMI &gt; Ativar HDCP
              </strong>
              . Apps de filme e streaming continuam bloqueados com HDCP
              desligado, isso é normal.
            </>,
            <>
              Teste outro formato em <strong>Avançado</strong>, como 1920 × 1080
              a 60 ou 30 fps. Algumas placas não entregam 4K ou 120 Hz.
            </>,
            <>Troque o cabo HDMI ou ajuste a saída do console para 1080p.</>,
          ],
        },
        {
          id: 'busy',
          title: '"Não foi possível abrir a placa" ou a placa está em uso',
          steps: [
            <>
              Só um programa por vez consegue usar a placa. Feche OBS, o app
              Câmera, Discord, Teams, Zoom e outras abas do navegador que usem a
              câmera.
            </>,
            <>
              Confira na bandeja do Windows (perto do relógio) se algum desses
              apps continua aberto em segundo plano.
            </>,
            <>Se nada resolver, desconecte e reconecte a placa.</>,
          ],
        },
        !desktop && {
          id: 'browser',
          title: 'Permissões do navegador',
          steps: [
            <>
              Clique no <strong>cadeado</strong> (ou no ícone de configurações)
              à esquerda do endereço do site e coloque <strong>Câmera</strong> e{' '}
              <strong>Microfone</strong> como <strong>Permitir</strong>. Depois
              recarregue a página.
            </>,
            <>
              O microfone é necessário porque o navegador trata o áudio da placa
              como um microfone. O microfone do PC só é usado se você escolher
              ele.
            </>,
            <>
              Se você clicou em "Bloquear" antes, o navegador não pergunta de
              novo: libere pelo cadeado ou em{' '}
              <strong>
                Configurações &gt; Privacidade &gt; Configurações do site
              </strong>
              .
            </>,
            <>
              Use Chrome ou Edge atualizados. Outros navegadores podem não
              listar todos os dispositivos ou não deixar escolher a saída de
              som.
            </>,
            <>
              Para menos atraso e sem depender do navegador, use o app CoopSeat
              para Windows.
            </>,
          ],
        },
        {
          id: 'windows',
          title: 'Permissões de câmera e microfone do Windows',
          steps: [
            <>
              Abra{' '}
              <strong>
                Configurações &gt; Privacidade e segurança &gt; Câmera
              </strong>{' '}
              e ative <strong>Acesso à câmera</strong> e{' '}
              <strong>
                Permitir que aplicativos da área de trabalho acessem a câmera
              </strong>
              .
            </>,
            <>
              Faça o mesmo em{' '}
              <strong>Privacidade e segurança &gt; Microfone</strong>, senão o
              áudio da placa não chega.
            </>,
            <>
              Em{' '}
              <strong>
                Configurações &gt; Sistema &gt; Som &gt; Mais configurações de
                som &gt; Gravação
              </strong>
              , confirme que a entrada de áudio da placa não está desativada.
            </>,
          ],
        },
        {
          id: 'antivirus',
          title: 'Antivírus ou Windows bloqueando',
          steps: desktop
            ? [
                <>
                  Se aparecer "O Windows protegeu o computador", clique em{' '}
                  <strong>Mais informações &gt; Executar assim mesmo</strong>.
                </>,
                <>
                  Alguns antivírus colocam o núcleo de captura (
                  <strong>InputCapture.exe</strong>) em quarentena, e aí o modo
                  Nativo fica indisponível. Restaure o arquivo e adicione a
                  pasta do CoopSeat às exceções.
                </>,
                <>
                  Antivírus com <strong>proteção de webcam</strong> (Kaspersky,
                  ESET, Avast, AVG, Bitdefender, Norton) podem bloquear a placa
                  em silêncio. Libere o CoopSeat nessa proteção.
                </>,
                <>
                  Se precisar, desative o antivírus por alguns minutos só para
                  testar. Se funcionar, o problema está nas regras dele.
                </>,
              ]
            : [
                <>
                  Antivírus com <strong>proteção de webcam</strong> (Kaspersky,
                  ESET, Avast, AVG, Bitdefender, Norton) podem bloquear o
                  navegador em silêncio. Libere o Chrome/Edge nessa proteção.
                </>,
                <>
                  Extensões de privacidade ou bloqueadores podem impedir o
                  acesso à câmera. Teste numa janela anônima sem extensões.
                </>,
                <>
                  Em computadores de empresa ou escola, políticas do
                  administrador podem bloquear câmera e microfone.
                </>,
              ],
        },
        {
          id: 'audio',
          title: 'Sem som, som baixo ou picotando',
          steps: [
            <>
              Em <strong>Entrada de áudio da placa</strong>, escolha a entrada
              da placa (por exemplo "Interface de áudio digital…"), não o
              microfone do PC.
            </>,
            <>
              Confira se o volume não está em 0% ou mudo (tecla{' '}
              <strong>M</strong>) e se <strong>Tocar o som em</strong> aponta
              para seus fones ou caixas.
            </>,
            <>
              No console, deixe a saída de áudio em HDMI e o formato em PCM ou
              estéreo. Bitstream ou Dolby podem chegar mudos.
            </>,
            <>
              Som picotado costuma ser falta de banda USB: use USB 3, tire
              outros aparelhos da mesma porta e feche apps pesados.
            </>,
          ],
        },
        {
          id: 'lag',
          title: 'Atraso, travadas ou FPS baixo',
          steps: [
            desktop ? (
              <>
                Use o modo <strong>Nativo</strong> em Avançado: ele tem bem
                menos atraso que o modo Compatibilidade.
              </>
            ) : (
              <>
                O app CoopSeat para Windows tem o modo Nativo, com bem menos
                atraso que o navegador.
              </>
            ),
            <>
              Ligue a placa numa porta USB 3. Em USB 2, 1080p60 só funciona
              comprimido (MJPG) e pode travar.
            </>,
            desktop ? (
              <>
                Deixe o <strong>VSync</strong> desligado para menos atraso.
                Ligue só se aparecerem cortes na imagem.
              </>
            ) : (
              <>Feche outras abas e apps pesados enquanto joga.</>
            ),
            <>
              Use o plano de energia <strong>Alto desempenho</strong> no Windows
              e mantenha o driver da placa de vídeo atualizado.
            </>,
          ],
        },
        desktop && {
          id: 'native',
          title: 'Modo Nativo não disponível',
          steps: [
            <>
              Normalmente o antivírus removeu ou bloqueou o{' '}
              <strong>InputCapture.exe</strong>. Veja a quarentena e adicione a
              pasta do CoopSeat às exceções.
            </>,
            <>Reinstale o CoopSeat pelo instalador mais recente.</>,
            <>
              Enquanto isso, o modo <strong>Compatibilidade</strong> funciona em
              qualquer PC.
            </>,
          ],
        },
      ];
      return list.filter((x): x is TroubleshootIssue => Boolean(x));
    },
  },
};
