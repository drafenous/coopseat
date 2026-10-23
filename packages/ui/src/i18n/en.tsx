import type { ReactNode } from 'react';
import { Kbd } from '../components/atoms/Kbd';

export type TroubleshootIssue = {
  id: string;
  title: string;
  steps: ReactNode[];
};

export const en = {
  common: {
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    back: 'Back',
    language: 'Language',
  },
  api: {
    network: "Couldn't reach CoopSeat. Check your internet connection.",
    generic: 'Something went wrong. Please try again.',
  },
  mediaErrors: {
    NotAllowedError:
      'Access denied. Allow camera and microphone for apps in the Windows privacy settings.',
    NotReadableError:
      "Couldn't open the capture card. Close OBS, Camera and other apps that may be using the device.",
    OverconstrainedError:
      "The capture card doesn't offer that resolution or FPS. Choose another mode.",
    NotFoundError: 'Device not found. Check the USB cable.',
  } as Record<string, string>,
  providers: { continueWith: 'Continue with', link: 'Link' },
  auth: {
    notStartedHere:
      "This sign-in wasn't started in this app. Try signing in again.",
    signedIn: 'You signed in to CoopSeat.',
    linked: 'Account linked.',
    ageSubmitted: 'Age verification submitted. Your status has been updated.',
    emailConfirmed: 'E-mail confirmed.',
    appOnly: 'Only available in the app.',
  },
  capture: {
    nativeFailure: 'Native capture failed.',
    openInApp: 'Open it in the app or on localhost.',
    device: (n: number) => `Device ${n}`,
    devicesChanged:
      'The device list changed. If the capture stopped, reconnect the card and refresh.',
    selectCard: 'Select a capture card.',
    disconnected: 'The capture card was disconnected or stopped capturing.',
    audioFailed: (reason: string) =>
      `Video is on, but the audio failed: ${reason}`,
    micDenied: (reason: string) =>
      `Camera allowed, but not the microphone: ${reason}`,
    pipFailed: (reason: string) =>
      `Couldn't open Picture in Picture: ${reason}`,
    access: {
      waitingExternal:
        'Opening the device is taking a while. Your antivirus may be asking permission for the camera or microphone. Check its prompt.',
      waiting:
        'Still waiting for camera or microphone permission. Check the browser prompt or an antivirus prompt.',
      browserPrompt:
        'The browser is asking for camera and microphone permission. Allow it to continue.',
      windowsPrivacy: (device: 'camera' | 'microphone' | 'both'): string =>
        device === 'camera'
          ? 'Windows blocked the camera. In Settings > Privacy & security > Camera, turn access on and allow desktop apps.'
          : device === 'microphone'
            ? 'Windows blocked the microphone. In Settings > Privacy & security > Microphone, turn access on and allow desktop apps.'
            : 'Windows blocked the camera or microphone. In Settings > Privacy & security, allow desktop apps under Camera and under Microphone.',
      externalBlock:
        'Windows already allows access, but the camera or microphone did not open. Allow CoopSeat in your antivirus webcam protection, or close OBS, Camera and other apps using the capture card.',
      externalBlockWeb:
        'The browser already has permission, but the camera or microphone did not open. An antivirus may be blocking the device, or another app is using the capture card.',
      browserDenied:
        'Access denied. Allow camera and microphone for this site in the browser settings. If the site is already allowed, check Windows privacy and your antivirus webcam protection.',
    },
  },
  presets: {
    updated: (name: string) => `Preset "${name}" updated.`,
    saved: (name: string) => `Preset "${name}" saved.`,
    applied: (name: string) => `Preset "${name}" applied.`,
    confirmDelete: (name: string) => `Delete the preset "${name}"?`,
    deleted: (name: string) => `Preset "${name}" deleted.`,
    notDefault: (name: string) => `"${name}" is no longer the default preset.`,
    willLoad: (name: string) => `"${name}" will load when the app opens.`,
  },
  page: {
    autoCinemaOff:
      'Automatic cinema mode turned off. You can turn it back on in the arrow next to the Cinema button.',
  },
  header: {
    troubleshoot: 'Troubleshooting',
    help: 'Help',
    preferences: 'Preferences',
    myAccount: 'My account',
    myRoom: 'My room',
    rooms: 'Rooms',
    openInApp: 'Open in the app',
    signIn: 'Sign in',
    signOut: 'Sign out',
  },
  directory: {
    title: 'Rooms',
    intro:
      'Rooms the host chose to show here. An open room has a live session.',
    searchLabel: 'Find a room',
    searchPlaceholder: 'Name or room link',
    search: 'Search',
    searchHint: 'Type a name or paste a room link, then press Enter.',
    host: 'Host',
    open: 'Open',
    closed: 'Closed',
    all: 'All',
    filters: 'Show',
    filter: 'Filter',
    passwordFilter: 'Password',
    passwordAny: 'Any',
    passwordYes: 'With password',
    passwordNo: 'No password',
    visibilityFilter: 'Visibility',
    visibilityAny: 'Any',
    visibilityProtected: 'Protected',
    visibilityPrivate: 'Private',
    visibilityPublic: 'Public',
    peopleLabel: (count: number, capacity: number) =>
      `${count} of ${capacity} people`,
    password: 'Password',
    noPassword: 'No password',
    approval: 'Approval',
    noApproval: 'No approval',
    inviteOnly: 'Invite only',
    enter: 'Enter',
    openInApp: 'Open in the app',
    browse: 'See all rooms',
    empty: 'No rooms in this view.',
    emptyHint: 'Try another filter, or search for a room by name.',
    loading: 'Loading rooms…',
    notFound: 'No room with that name.',
    unlisted: 'This room is not in the public list.',
    invalid: 'Use a nickname or a room link.',
    error: "Couldn't load rooms. Try again.",
    back: 'Back',
    pages: 'Pages',
    previous: 'Previous',
    next: 'Next',
    pageLabel: (page: number, pages: number) => `Page ${page} of ${pages}`,
  },
  update: {
    available: (version: string) => `Version ${version} is available.`,
    download: 'Download',
    later: 'Later',
  },
  accountCta: {
    title: 'Play together on CoopSeat',
    body: 'Create a free account to chat, talk and create rooms in sessions.',
    signUp: 'Create account',
    signIn: 'I already have an account',
  },
  captureButton: {
    stop: 'Stop capture',
    cancel: 'Cancel',
    start: 'Start capture',
  },
  donate: { text: 'Help keep this app free', button: 'Make a donation' },
  volume: {
    mute: 'Mute',
    unmute: 'Unmute',
    muteTitle: 'Mute · M',
    volume: 'Volume',
  },
  advanced: {
    title: 'Advanced',
    format: 'Format',
    noModes: 'No modes available',
    resolution: 'Resolution',
    vsyncNative: 'Prevents tearing in the image',
    vsyncCompat: 'Only available in Native mode',
  },
  effects: {
    title: 'Effects & filters',
    smoothing: 'Smooth jagged edges',
    smoothingHint: 'Makes the image look nicer, but may cause input lag',
    smoothingGrid:
      "Doesn't apply to the CRT and LCD effects, which need sharp pixels",
    effect: 'Screen effect',
    list: {
      none: 'None',
      crt: 'Retro CRT',
      crtFlat: 'Retro CRT (flat)',
      lcd: 'Handheld screen (LCD)',
      vivid: 'Vivid colors',
      protanopia: 'Color blindness · protanopia (red)',
      deuteranopia: 'Color blindness · deuteranopia (green)',
      tritanopia: 'Color blindness · tritanopia (blue)',
    },
    smoothingLevel: 'Intensity',
    smoothingLight: 'Light · anti-aliasing',
    smoothingStrong: 'Strong · anti-aliasing + sharpening',
  },
  preferences: {
    title: 'Preferences',
    body: 'Apply to the whole app, whatever the account or preset.',
    cookies: 'Cookies',
    cookiesHint:
      'Choose whether the site may use Google Analytics and Microsoft Clarity',
    manage: 'Manage',
    telemetry: 'Share anonymous usage statistics',
    telemetryHint:
      'Only when the app opens and when a capture starts, with the app version and capture mode',
  },
  authModal: {
    mfaTitle: 'Two-step verification',
    mfaBody: 'Enter the 6-digit code from your authenticator app.',
    useSecurityCode: 'Use a security code',
    useApp: 'Use the authenticator app',
    securityCode: 'Security code',
    securityHint:
      'Enter one of the security codes you saved when you turned on two-step verification.',
    code: 'Code',
    title: 'Sign in to CoopSeat',
    pitch: 'Your account unlocks chat in sessions and lets you create rooms.',
    continueIn: (provider: string) =>
      `Continue in the browser with ${provider}. The app comes back on its own when you're done.`,
    orWithEmail: 'or with e-mail',
    email: 'E-mail',
    password: 'Password',
    signingIn: 'Signing in…',
    signIn: 'Sign in',
    forgot: 'Forgot my password',
    createAccount: 'Create account',
    adultsOnly:
      "Accounts are only for people aged 18 or older. You don't need an account to watch as a guest.",
  },
  viewer: {
    monitor: 'Capture monitor',
    native: 'NATIVE',
    compat: 'COMPATIBILITY',
    startParty: 'Start a gaming-party',
    cinemaHint: (
      <>
        Cinema mode · move the mouse to exit · <Kbd>F11</Kbd> whole monitor
      </>
    ),
  },
  help: {
    title: 'Getting started',
    steps: [
      {
        title: 'Connect the cables',
        body: "The console's HDMI into the capture card's input, and the card into a USB port on the computer (USB 3, if you have one).",
      },
      {
        title: 'Choose the card and its audio',
        body: "In the panel on the right, select the card and its audio input. The PC's microphone is never turned on by itself.",
      },
      {
        title: 'Click Start capture',
        body: "The console's picture shows up on screen. Save everything as a preset so you don't have to set it up again.",
      },
    ],
    twoWays: 'Two ways to see just the game',
    cinemaTitle: 'Cinema mode',
    cinemaFooter: 'Move the mouse to exit',
    cinemaBody: (
      <>
        The controls disappear and the video fills the <strong>window</strong>.
        It kicks in on its own when you stay still, or through the Cinema
        button.
      </>
    ),
    fullscreenTitle: 'Fullscreen',
    fullscreenFooter: (
      <>
        <Kbd>F11</Kbd> enters and exits · <Kbd>Esc</Kbd> exits
      </>
    ),
    fullscreenBody: (
      <>
        The video fills the <strong>whole monitor</strong>, with no borders or
        taskbar.
      </>
    ),
    shortcutFullscreen: 'fullscreen',
    shortcutExit: 'exit fullscreen and cinema mode',
    shortcutMute: 'mute',
    tips: [
      "If the card doesn't open, close OBS, Camera and other apps that may be using it.",
      "HDCP-protected content (some video apps) doesn't show up on capture cards.",
      'The Windows app captures in Native mode, with less latency. The browser uses Compatibility mode.',
      "You don't need an account to play. Accounts are for people 18 or older: with a confirmed e-mail, a nickname and a verified age, they unlock chat in sessions and let you create rooms.",
    ],
    gotIt: 'Got it',
  },
  metrics: {
    signal: 'SIGNAL RECEIVED',
    waiting: 'Waiting for data',
    startToSee: 'Start the capture to see it',
    streamStartToSee: 'Watch a stream to see it',
    fps: (native: boolean) => `FPS ${native ? 'ON SCREEN' : 'NEGOTIATED'}`,
    fpsDetail: 'frames per second',
    dropped: 'DROPPED FRAMES',
    droppedDetail: 'discarded by the app',
    loss: 'PACKET LOSS',
    lossDetail: 'lost on the way',
  },
  nickname: {
    title: 'Choose your nickname',
    body: "It's the name others see in sessions. It's unique and can only be changed every 30 days.",
    label: 'Nickname',
    placeholder: 'E.g.: rodri_gamer',
    format: '3 to 20 characters: letters, numbers or _.',
    checking: 'Checking…',
    available: 'Available.',
    taken: 'That nickname is already in use.',
    acceptTerms: (terms: ReactNode, privacy: ReactNode): ReactNode => (
      <>
        I'm 18 or older and accept the {terms} and the {privacy}.
      </>
    ),
    terms: 'Terms of Use',
    privacy: 'Privacy Policy',
    notNow: 'Not now',
  },
  presetPicker: {
    label: 'Preset',
    choose: 'Choose preset…',
    none: 'No saved presets',
    options: 'Preset options',
    saveNew: 'Save as new preset…',
    update: (name: string) => `Update “${name}”`,
    stopDefault: 'Stop opening with this preset',
    makeDefault: 'Open the app with this preset',
    delete: (name: string) => `Delete “${name}”`,
    autoOpens: 'Opens automatically with the app',
  },
  savePreset: {
    title: 'Save preset',
    body: 'Stores the card, audio, image format and current options.',
    label: 'Preset name',
    placeholder: 'E.g.: Nintendo Switch',
    exists: 'A preset with that name already exists. It will be replaced.',
  },
  telemetry: {
    title: 'Help improve CoopSeat?',
    body: 'With your permission, the app tells us anonymously when it is opened and when a capture starts, along with the app version and capture mode. That shows us how many people use CoopSeat and which mode works best.',
    never:
      'We never send your gameplay, images, audio, devices, account or anything you type.',
    later:
      'You can change this at any time in Preferences (gear icon at the top).',
    allow: 'Allow',
    deny: 'No, thanks',
  },
  settings: {
    title: 'Set up input',
    refresh: 'Refresh devices',
    collapse: 'Collapse panel',
    expand: 'Expand panel',
    preset: 'PRESET',
    io: 'Input & output',
    card: 'Capture card',
    selectDevice: 'Select a device',
    permit: 'Allow camera and microphone',
    audio: 'AUDIO',
    audioInput: "Card's audio input",
    noAudio: 'No audio',
    output: 'Play sound on',
    systemDefault: 'Windows default',
    local: 'The capture stays on your PC. Nothing is recorded.',
  },
  cinemaMenu: {
    label: 'Cinema mode options',
    enterIn: 'Automatically enter cinema mode in:',
    seconds: (s: number) => (s === 1 ? '1 second' : `${s} seconds`),
    never: 'Never',
    hint: 'While capturing, cinema mode turns on by itself when there is no keyboard or mouse activity. Touch anything to come back.',
  },
  toasts: {
    cinemaPaused: 'Cinema mode paused',
    stayStill: 'Stay still to resume the countdown',
    enteringIn: 'Entering cinema mode in',
    moveToPause: 'Move the mouse to pause',
    enterNow: 'Enter now',
    disableAuto: 'Turn off automatic',
    seeSolutions: 'See solutions',
  },
  transport: {
    fullscreen: 'fullscreen',
    exit: 'exit',
    mute: 'mute',
    shortcuts: 'Keyboard shortcuts',
    shortcutsTitle: 'Keyboard shortcuts',
    stats: 'Technical details',
    alwaysOnTop: 'Always on top',
    pip: 'Picture in Picture',
    pipTitle:
      'Picture in Picture: opens the video in a floating window (compatibility mode)',
    cinema: 'Cinema mode',
    cinemaTitle:
      'Cinema mode: hides the controls and enlarges the video in the window',
    cinemaText: 'Cinema',
    fullscreenLabel: 'Fullscreen on the whole monitor',
    fullscreenTitle: 'Fullscreen on the whole monitor · F11',
    fullscreenText: 'Fullscreen',
  },
  report: {
    open: 'Report',
    openTitle: 'Report abuse, a technical problem or send feedback',
    title: 'Report a problem',
    category: 'Category',
    categories: {
      abuse: 'Abuse',
      technical: 'Technical problem',
      feedback: 'Feedback',
    },
    email: 'E-mail',
    emailHint: 'We reply to this address.',
    message: 'Message',
    images: 'Evidence',
    imagesHint: 'Up to 3 images. JPEG, PNG or WebP, 1 MB each.',
    addImage: 'Add image',
    removeImage: 'Remove image',
    imageType: 'Use a JPEG, PNG or WebP image.',
    imageSize: 'Each image must be 1 MB or smaller.',
    imageLimit: 'You can attach up to 3 images.',
    submit: 'Send report',
    pending: 'Sending…',
  },
  emptyState: {
    preparing: 'Preparing the capture…',
    ready: 'All set to play',
    connect: 'Connect your capture card',
    card: 'Card',
    chooseCard: 'Choose a card in the side panel',
    audio: 'Audio',
    noAudio: "No audio · choose the card's input",
    image: 'Image',
    detecting: 'Detecting formats…',
    instructions: (
      <>
        Plug the console's HDMI into the capture card
        <br />
        and the card into a USB port on the computer.
      </>
    ),
    console: 'CONSOLE',
    usb: 'USB CAPTURE',
    computer: 'COMPUTER',
    permit: 'Allow camera and microphone',
  },
  party: {
    title: (nick: string) => `${nick}'s room`,
    myRoom: 'My room',
    leave: 'Leave room',
    copyLink: 'Copy room link',
    copied: 'Room link copied.',
    tabs: { chat: 'Chat', people: 'People', settings: 'Room' },
    status: {
      connecting: 'Connecting…',
      reconnecting: 'Reconnecting…',
      open: 'Live',
      closed: 'Offline',
    },
    gate: {
      loading: 'Opening the room…',
      offline: (nick: string) => `${nick}'s room isn't open right now`,
      offlineBody:
        'The room opens when someone allowed to stream starts. This page checks again on its own.',
      ownerOffline: 'Your room is closed',
      ownerOfflineBody:
        'Start streaming to open the session. It stays open while someone is in the room and ends when the room is empty.',
      canOpen: 'This room is closed',
      canOpenBody:
        'You can stream here. Start streaming to open the session, even if the owner is offline.',
      password: 'This room has a password',
      passwordLabel: 'Room password',
      enter: 'Enter',
      pending: 'Waiting for approval',
      pendingBody:
        'Someone in the room needs to let you in. Keep this page open; nobody sees your connection until then.',
      notInvited: 'This room is invite-only',
      notInvitedBody: "Only people on the owner's list can enter.",
      banned: "You can't enter this room",
      unavailable: 'Party rooms are unavailable for your account.',
      disabled: 'Party rooms are temporarily disabled.',
      requirements: 'Verify your account to enter',
      requirementsBody: 'Rooms are only for verified accounts.',
      missing: {
        email: 'Confirm your e-mail',
        nickname: 'Choose a nickname',
        age: 'Verify your age (18+)',
        mfa: 'Turn on two-step verification',
      } as Record<string, string>,
      openAccount: 'Open my account',
      ended: {
        owner_ended: 'The session has ended.',
        owner_timeout: 'The session ended: the owner lost connection.',
        empty: 'The room was empty, so the session ended.',
        max_duration: 'The session reached its time limit.',
        sanction: 'The session was ended by CoopSeat.',
        operator: 'The session was ended by CoopSeat.',
      },
      endedBody: 'Everyone was disconnected and the chat was erased.',
      removed: {
        kick: 'You were removed from the session.',
        ban: 'You were banned from this room.',
        sanction: 'Your access was suspended by CoopSeat.',
        full: 'The room is full.',
        denied: 'Your entry was not approved.',
        replaced: 'You opened this room in another window.',
        token_expired: 'Your access expired.',
        invalid: 'Your access is no longer valid.',
      },
      retry: 'Try again',
      signIn: 'Sign in to enter',
      ipNotice:
        'Streams are peer-to-peer: other participants can see your IP address. Only join rooms of people you trust.',
    },
    stream: {
      start: 'Start streaming',
      stop: 'Stop streaming',
      starting: 'Starting…',
      request: 'Ask to stream',
      requested: 'Request sent',
      resume:
        'Your stream was interrupted. Check the source in the input panel and click Start streaming.',
    },
    source: {
      kind: 'Capture type',
      card: 'Capture Device',
      screen: 'Screen Capture',
      window: 'Window Capture',
      pick: 'Click the source you want to stream',
      pickInPanel: 'Choose the screen or window in the input panel.',
      desktopAudio: {
        system: {
          label: 'Include system audio',
          hint: "All of the computer's sound except CoopSeat's (chat and other streams). On older Windows, the whole system mix is used.",
        },
        window: {
          label: 'Include window audio',
          hint: "Only this window's program. Turns off while system audio is on, so the sound is not sent twice.",
        },
      },
      refresh: 'Refresh',
      loading: 'Looking for sources…',
      empty: 'No sources found.',
      browserPicker:
        'When you start streaming, your browser will ask which screen or window to share.',
    },
    layout: {
      label: 'Layout',
      stage: 'Main stage',
      grid: 'Grid',
      splitOrientation: 'Split direction',
      horizontal: 'Side by side',
      vertical: 'Stacked',
    },
    stage: {
      empty: 'Nobody is streaming yet',
      emptyOwner: 'Start streaming to open the session',
      you: 'You',
      connecting: 'Connecting…',
      reconnecting: 'Reconnecting…',
      failed: 'Connection lost',
      focus: 'Show on stage',
      hideFromGrid: 'Hide from grid',
      showInGrid: 'Show in grid',
      emptyCell: 'Drop a stream here',
      mute: 'Mute',
      unmute: 'Unmute',
      loss: (pct: number) => `${pct}% loss`,
      openPanel: 'Show room panel',
      hidden: (n: number) =>
        n === 1
          ? '1 hidden stream (disconnected to save data)'
          : `${n} hidden streams (disconnected to save data)`,
    },
    chat: {
      placeholder: 'Send a message',
      send: 'Send',
      empty: 'No messages yet. Say hi!',
      disabled: 'Chat is turned off',
      muted: "You can't chat in this room",
      emoji: 'Emoji',
      delete: 'Delete message',
      erased: 'The chat is erased when the session ends.',
    },
    people: {
      owner: 'Owner',
      moderator: 'Moderator',
      streaming: 'Live',
      away: 'Reconnecting',
      actions: (nick: string) => `Actions for ${nick}`,
      kick: 'Remove from session',
      ban: 'Ban from room',
      ban24: 'Ban for 24 hours',
      grant: 'Allow streaming',
      revoke: 'Take back streaming',
      kill: 'Stop stream',
      confirmBan: (nick: string) =>
        `Ban ${nick} from the room? They won't be able to come back.`,
    },
    approvals: { title: 'Waiting to enter', approve: 'Let in', deny: 'Deny' },
    requests: { title: 'Asking to stream', grant: 'Allow', deny: 'Ignore' },
    settings: {
      access: 'Access',
      accessHint:
        'Optional. Anyone who joins still needs the password when it is set.',
      password: 'Password',
      passwordSet: 'A password is set',
      passwordNone: 'No password',
      setPassword: 'Set',
      removePassword: 'Remove',
      passwordPlaceholder: '4 to 64 characters',
      listed: 'Show in the room list',
      listedHint:
        'People can find this room in the public list, with how many are inside and whether it asks for a password or approval.',
      visibility: 'Room visibility',
      visibilityOptions: {
        protected: 'Protected — approval or allow list',
        private: 'Private — allow list only',
        public: 'Public — join immediately',
      },
      whitelist: 'Allow list',
      emptyWhitelist: {
        title: 'Nobody on the allow list',
        hint: 'People you add skip the wait and can stream if you turn that on.',
      },
      nickname: 'Nickname',
      add: 'Add',
      canStream: 'Can stream',
      remove: (nick: string) => `Remove ${nick}`,
      moderators: 'Moderators',
      emptyModerators: {
        title: 'No moderators yet',
        hint: 'They can approve entries, manage streams and keep the room in order.',
      },
      modOptions: (nick: string) => `${nick}'s permissions`,
      modPerms: {
        canKick: 'Remove',
        canBan: 'Ban',
        canStopStreams: 'Stop streams',
        canApprove: 'Approve entries',
        canGrantStream: 'Allow streaming',
        canDeleteMessages: 'Delete messages',
      },
      bans: 'Banned',
      emptyBans: {
        title: 'No one is banned',
        hint: 'Banned people cannot join this room until you unban them.',
      },
      unban: 'Unban',
      until: (date: string) => `until ${date}`,
      forever: 'permanent',
      layout: 'Default layout',
      saved: 'Room updated.',
      limits: (people: number, streamers: number) =>
        `Up to ${people} people and ${streamers} streamers per session.`,
      endSession: 'End session',
      confirmEnd: 'End the session for everyone? The chat will be erased.',
    },
    granted: 'You can stream now.',
    revoked: 'Your streaming permission was taken back.',
    banned: 'User banned.',
    errors: {
      generic: 'Something went wrong in the room.',
      rate_limited: 'Slow down a little.',
      too_large: 'That message is too large.',
      invalid: 'Invalid request.',
      pending: 'Wait to be let in first.',
      forbidden: "You don't have permission for that.",
      chat_forbidden: "You can't chat in this room.",
      chat_rate_limited: "You're sending messages too fast.",
      chat_invalid: 'Messages can have up to 200 characters.',
      stream_forbidden: "You don't have permission to stream.",
      owner_not_live: 'You can only stream while the owner is live.',
      stream_full: 'The streamer limit was reached.',
    },
  },
  troubleshoot: {
    title: 'Troubleshooting',
    intro:
      'The most common problems and how to fix them. Click an item to see the steps.',
    issues: (desktop: boolean): TroubleshootIssue[] => {
      const list: (TroubleshootIssue | false)[] = [
        {
          id: 'not-listed',
          title: "The card doesn't show up in the list",
          steps: [
            <>
              Plug the card straight into a USB port on the computer, without a
              hub or extension. Prefer USB 3 (blue port or marked "SS"), ideally
              on the back of the case.
            </>,
            <>
              Switch ports and click <strong>Refresh devices</strong> (↻ icon in
              the panel).
            </>,
            <>
              Open the Windows <strong>Device Manager</strong> and check that
              the card shows up under "Cameras" or "Imaging devices" without a
              yellow warning.
            </>,
            <>
              Unplug the card for a few seconds and plug it back in. If it's
              still missing, restart the PC.
            </>,
          ],
        },
        {
          id: 'black',
          title: 'The capture starts, but the screen stays black',
          steps: [
            <>
              Check that the console is on and that the HDMI cable goes from the
              console's <strong>output</strong> to the card's{' '}
              <strong>input</strong> (HDMI IN).
            </>,
            <>
              On PlayStation, turn off HDCP:{' '}
              <strong>Settings &gt; System &gt; HDMI &gt; Enable HDCP</strong>.
              Movie and streaming apps stay blocked with HDCP off; that's
              normal.
            </>,
            <>
              Try another format under <strong>Advanced</strong>, such as 1920 ×
              1080 at 60 or 30 fps. Some cards don't deliver 4K or 120 Hz.
            </>,
            <>Swap the HDMI cable or set the console's output to 1080p.</>,
          ],
        },
        {
          id: 'busy',
          title: '"Couldn\'t open the capture card" or the card is in use',
          steps: [
            <>
              Only one program at a time can use the card. Close OBS, the Camera
              app, Discord, Teams, Zoom and other browser tabs using the camera.
            </>,
            <>
              Check the Windows tray (near the clock) to see whether any of
              those apps is still open in the background.
            </>,
            <>If nothing helps, unplug and replug the card.</>,
          ],
        },
        !desktop && {
          id: 'browser',
          title: 'Browser permissions',
          steps: [
            <>
              Click the <strong>padlock</strong> (or the settings icon) to the
              left of the site address and set <strong>Camera</strong> and{' '}
              <strong>Microphone</strong> to <strong>Allow</strong>. Then reload
              the page.
            </>,
            <>
              The microphone is needed because the browser treats the card's
              audio as a microphone. The PC's microphone is only used if you
              choose it.
            </>,
            <>
              If you clicked "Block" before, the browser won't ask again: allow
              it through the padlock or under{' '}
              <strong>Settings &gt; Privacy &gt; Site settings</strong>.
            </>,
            <>
              Use an up-to-date Chrome or Edge. Other browsers may not list
              every device or may not let you choose the sound output.
            </>,
            <>
              For less latency and no browser dependency, use the CoopSeat app
              for Windows.
            </>,
          ],
        },
        {
          id: 'windows',
          title: 'Windows camera and microphone permissions',
          steps: [
            <>
              Open{' '}
              <strong>Settings &gt; Privacy &amp; security &gt; Camera</strong>{' '}
              and turn on <strong>Camera access</strong> and{' '}
              <strong>Let desktop apps access your camera</strong>.
            </>,
            <>
              Do the same under{' '}
              <strong>Privacy &amp; security &gt; Microphone</strong>, otherwise
              the card's audio won't come through.
            </>,
            <>
              Under{' '}
              <strong>
                Settings &gt; System &gt; Sound &gt; More sound settings &gt;
                Recording
              </strong>
              , make sure the card's audio input isn't disabled.
            </>,
          ],
        },
        {
          id: 'antivirus',
          title: 'Antivirus or Windows blocking',
          steps: desktop
            ? [
                <>
                  If "Windows protected your PC" shows up, click{' '}
                  <strong>More info &gt; Run anyway</strong>.
                </>,
                <>
                  Some antivirus programs quarantine the capture core (
                  <strong>InputCapture.exe</strong>), and then Native mode
                  becomes unavailable. Restore the file and add the CoopSeat
                  folder to the exceptions.
                </>,
                <>
                  Antivirus programs with <strong>webcam protection</strong>{' '}
                  (Kaspersky, ESET, Avast, AVG, Bitdefender, Norton) may
                  silently block the card. Allow CoopSeat in that protection.
                </>,
                <>
                  If needed, turn off the antivirus for a few minutes just to
                  test. If it works, the problem is in its rules.
                </>,
              ]
            : [
                <>
                  Antivirus programs with <strong>webcam protection</strong>{' '}
                  (Kaspersky, ESET, Avast, AVG, Bitdefender, Norton) may
                  silently block the browser. Allow Chrome/Edge in that
                  protection.
                </>,
                <>
                  Privacy extensions or blockers may prevent camera access. Test
                  in a private window without extensions.
                </>,
                <>
                  On work or school computers, administrator policies may block
                  the camera and microphone.
                </>,
              ],
        },
        {
          id: 'audio',
          title: 'No sound, low sound or choppy sound',
          steps: [
            <>
              Under <strong>Card's audio input</strong>, choose the card's input
              (for example "Digital Audio Interface…"), not the PC's microphone.
            </>,
            <>
              Check that the volume isn't at 0% or muted (<strong>M</strong>{' '}
              key) and that <strong>Play sound on</strong> points to your
              headphones or speakers.
            </>,
            <>
              On the console, set the audio output to HDMI and the format to PCM
              or stereo. Bitstream or Dolby may arrive muted.
            </>,
            <>
              Choppy sound is usually a lack of USB bandwidth: use USB 3, remove
              other devices from the same port and close heavy apps.
            </>,
          ],
        },
        {
          id: 'lag',
          title: 'Latency, stutters or low FPS',
          steps: [
            ...(desktop
              ? []
              : [
                  <>
                    The CoopSeat app for Windows captures in Native mode, with
                    much less latency than the browser.
                  </>,
                ]),
            <>
              Plug the card into a USB 3 port. On USB 2, 1080p60 only works
              compressed (MJPG) and may stutter.
            </>,
            desktop ? (
              <>
                Keep <strong>VSync</strong> off for less latency. Only turn it
                on if you see tearing in the image.
              </>
            ) : (
              <>Close other tabs and heavy apps while playing.</>
            ),
            <>
              Use the <strong>High performance</strong> power plan on Windows
              and keep your graphics driver up to date.
            </>,
          ],
        },
        desktop && {
          id: 'native',
          title: 'Native mode not available',
          steps: [
            <>
              Usually the antivirus removed or blocked{' '}
              <strong>InputCapture.exe</strong>. Check the quarantine and add
              the CoopSeat folder to the exceptions.
            </>,
            <>Reinstall CoopSeat with the latest installer.</>,
            <>
              If the native core can't start, the app uses{' '}
              <strong>Compatibility</strong> mode on its own.
            </>,
          ],
        },
      ];
      return list.filter((x): x is TroubleshootIssue => Boolean(x));
    },
  },
};

export type UiDictionary = typeof en;
