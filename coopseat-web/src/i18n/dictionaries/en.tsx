import type { ReactNode } from 'react';

export const en = {
  meta: {
    title: 'Stream your game to friends, up to 720p · CoopSeat',
    description:
      'Stream your game to friends in a public or private room, free up to 720p. Nothing is recorded. Download for Windows, or play locally with a capture card.',
    login: 'Sign in',
    loginDescription:
      'Sign in to CoopSeat with Google or e-mail to manage your account and its security.',
    mfa: 'Two-step verification',
    signup: 'Create account',
    signupDescription:
      'Create your free CoopSeat account and get ready to watch and play with your friends.',
    forgotPassword: 'Forgot password',
    resetPassword: 'Reset password',
    emailConfirmed: 'E-mail confirmed',
    authError: 'Could not continue',
    openApp: 'Returning to the app',
    account: 'My account',
    privacy: 'Privacy Policy',
    privacyDescription:
      'How CoopSeat handles your data: what we collect, what we never record and your rights under the LGPD.',
    terms: 'Terms of Use',
    termsDescription:
      'The rules for using the CoopSeat app, website and account.',
    mockVerification: 'Verification (simulated)',
    play: 'Play in the browser',
    playDescription:
      'Play your console in a Chrome or Edge tab through a capture card, with nothing to install. Free, Full HD and almost no delay.',
    download: 'Download for Windows',
    downloadDescription:
      'Download CoopSeat for free for Windows 10 and 11: installer or portable version, setup in three steps and capture card requirements.',
  },
  playPage: {
    title: 'Play your console in the browser',
    body: 'CoopSeat shows a capture card in Chrome or Edge, with nothing to install. The picture stays on your computer, and nobody else is watching.',
    requirements:
      'You need a capture card, an HDMI cable, and Chrome or Edge. Any resolution and frame rate the card can deliver.',
    download: 'Download for Windows',
  },
  common: {
    language: 'Language',
    email: 'E-mail',
    password: 'Password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    code: 'Code',
    passwordHint: 'At least 8 characters, with letters and numbers.',
    orWithEmail: 'or with e-mail',
    backToLogin: 'Back to sign in',
    goToLogin: 'Go to sign in',
    openApp: 'Open the CoopSeat app',
    termsOfUse: 'Terms of Use',
    privacyPolicy: 'Privacy Policy',
    genericError: 'Something went wrong. Please try again.',
  },
  home: {
    nav: {
      features: 'Features',
      how: 'How it works',
      local: 'Local player',
      faq: 'FAQ',
    },
    signIn: 'Sign in',
    myAccount: 'My account',
    createAccount: 'Create account',
    download: 'Download for Windows',
    downloadShort: 'Download',
    playInBrowser: 'Play in the browser',
    playFromMenu: 'Play in the browser',
    openRoom: 'Open a room',
    playLocal: 'Play without streaming',
    badge: 'Beta · Free up to 720p',
    headlineLead: 'Stream your game to friends.',
    headlineAccent: 'Play together in one room.',
    pitch:
      'Stream your game to friends in a public or private room, and invite them to watch and chat while you play. The picture comes from a capture card or a window on your own PC, free up to 720p. If you only want to play on your PC with a capture card, without streaming, the player has no limits on use, resolution or frame rate.',
    heroNote:
      'Public or private rooms · Nothing is recorded · 18+ to watch and chat',
    mock: {
      title: 'CoopSeat',
      live: 'Live',
      chain: 'Console → capture card → PC',
    },
    room: {
      live: 'Live',
      you: 'You',
      host: 'You · host',
      guest: 'Watching',
      invite: 'Invite',
      quality: '720p',
      chat: [
        { name: 'luna', text: 'no way you hit that jump 😂' },
        { name: 'theo', text: 'my turn next round!' },
      ],
    },
    stats: [
      { value: '720p', label: 'free streaming to the room' },
      { value: 'Public', label: 'or private: you choose who gets in' },
      {
        value: 'Local',
        label: 'play without streaming, at any resolution or frame rate',
      },
      {
        value: '0',
        unit: 'recordings',
        label: 'what you play stays with you',
      },
    ],
    featuresKicker: 'Rooms',
    featuresTitle: 'A room for the session.',
    featuresSubtitle:
      'Public for anyone with the link, or private with a password, approval or an allow list. Streaming is free up to 720p.',
    features: [
      {
        title: 'Public room',
        body: 'Anyone with the link joins right away and watches from the browser.',
      },
      {
        title: 'Private room',
        body: 'Set a password, ask for approval or allow only people on your list. You can remove anyone.',
      },
      {
        title: 'Streaming up to 720p',
        body: 'Free for the room, with the picture from a capture card or a PC window, and the sound.',
      },
      {
        title: 'Friends in the browser',
        body: 'Watchers install nothing. They open the link and join the room.',
      },
      {
        title: 'Room chat',
        body: 'Talk while the match is on. Watching and chat are for verified adult accounts (18+).',
      },
      {
        title: 'Local player, no limits',
        body: 'On /play, use a capture card without streaming. No limit on use, resolution or frame rate.',
      },
    ],
    howKicker: 'How it works',
    howTitle: 'Streaming takes three steps.',
    steps: [
      {
        title: 'Pick the picture',
        body: 'The console comes in through a capture card. A PC game comes in through its own window, with no card.',
      },
      {
        title: 'Open the room',
        body: 'Choose whether it is public or private, with a password, approval or an allow list.',
      },
      {
        title: 'Invite everyone',
        body: 'Friends join from the browser, watch and chat. Nothing to install.',
      },
    ],
    local: {
      kicker: 'Local player',
      title: 'Just want to play?',
      body: 'Use CoopSeat on /play with only a capture card, without opening a room and without streaming. There is no limit on use, resolution or frame rate.',
      points: [
        'The picture stays on your computer. Nobody is watching.',
        'Any resolution and frame rate your capture card can deliver.',
        'No account needed to play.',
      ],
    },
    trustKicker: 'Privacy',
    trustTitle: 'Your game stays yours.',
    trust: [
      {
        title: 'Nothing is recorded',
        body: "CoopSeat doesn't record your game or send it anywhere. What happens on your screen stays on your screen.",
      },
      {
        title: 'Secure account',
        body: 'Sign in with Google or e-mail, and add extra protection with a code from your phone.',
      },
      {
        title: 'Age check without exposure',
        body: 'To watch and chat we only keep whether you are an adult and the date, never photos or document data.',
      },
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        q: 'Is CoopSeat free?',
        a: "Yes. Streaming to a room is free up to 720p. Playing on your PC with a capture card, without streaming, has no limit on use, resolution or frame rate. If you'd like to support the project, there's a donation button inside the app.",
      },
      {
        q: 'What do I need to play?',
        a: 'To stream a PC game, pick its window. For a console, use Windows 10 or 11, a capture card and the HDMI cable. People who only watch join from the browser, with nothing to install.',
      },
      {
        q: 'Do I need an account to play?',
        a: 'Not to play locally without streaming. To open a room, watch and chat, you need a verified adult account (18+), as Brazilian law requires.',
      },
      {
        q: 'Which capture cards work?',
        a: 'Most capture cards that Windows recognizes as a video device, whether external (USB) or internal (PCIe). Some copy-protected content, like movie streaming apps, will not show up.',
      },
      {
        q: 'Is there any delay?',
        a: 'Very little. CoopSeat was built to show the picture as fast as possible, but part of the delay depends on your capture card and computer, so it can vary a bit from one setup to another.',
      },
      {
        q: 'Why does Windows show a warning when I install it?',
        a: 'CoopSeat is new and does not have a digital signature yet, so Windows shows a precaution message. Click "More info" and then "Run anyway".',
      },
      {
        q: 'Does it work on Mac or Linux?',
        a: 'For now, the app is only for Windows 10 and 11. On other systems you can try the browser version.',
      },
    ],
    ctaTitle: 'Open a room and call everyone in.',
    ctaBody:
      'Create your account, pick a public or private room and stream up to 720p. Or play only on your PC, without streaming.',
    footer: {
      tagline: 'Stream the session to your room, or play only on your PC.',
      product: 'Product',
      legal: 'Legal',
      account: 'My account',
      rights: (year: number) => `© ${year} CoopSeat`,
    },
  },
  download: {
    kicker: 'Download',
    title: 'Download CoopSeat for Windows',
    subtitle:
      'Free, with no account needed to play. Install it, plug in your capture card and start playing.',
    version: (version: string) => `Version ${version}`,
    released: (date: string) => `Released on ${date}`,
    unavailable:
      "The download isn't available right now. Please try again in a few minutes.",
    recommended: 'Recommended',
    installer: {
      title: 'Installer',
      body: 'Installs CoopSeat with Start menu and desktop shortcuts and opens CoopSeat links from the website.',
      button: 'Download installer',
    },
    portable: {
      title: 'Portable',
      body: "Runs without installing, from any folder or a USB stick. Good for computers where you can't install programs.",
      button: 'Download portable',
    },
    stepsTitle: 'After downloading',
    steps: [
      {
        title: 'Open the file',
        body: 'Run the installer, or the portable file. CoopSeat does not have a digital signature yet, so if Windows shows a protection notice, click "More info" and then "Run anyway".',
      },
      {
        title: 'Connect your capture card',
        body: "Plug the console's HDMI into the capture card's HDMI IN. If the card is external, plug its USB into the computer. Close OBS, Camera or Discord if they are using the card.",
      },
      {
        title: 'Open CoopSeat and play',
        body: 'Choose your capture card and the audio input, then click Start capture.',
      },
    ],
    requirementsTitle: 'System requirements',
    requirementsSubtitle:
      'CoopSeat is light, but the picture quality also depends on your capture card and computer.',
    requirements: [
      { label: 'System', value: 'Windows 10 or 11, 64-bit' },
      { label: 'Graphics', value: 'Graphics card compatible with DirectX 11' },
      {
        label: 'Capture card',
        value:
          'External (USB) or internal (PCIe) capture card recognized by Windows, with HDMI input',
      },
      {
        label: 'Connection',
        value: 'For external cards, USB 3.0 recommended for Full HD at 60 fps',
      },
      { label: 'Disk space', value: 'About 400 MB free' },
      { label: 'Internet', value: 'Only to download and for account features' },
    ],
    notesTitle: 'Good to know',
    notes: [
      'Windows N editions need the Media Feature Pack, a free download from Microsoft.',
      "Copy-protected content (HDCP), like movie streaming apps, doesn't show up.",
      'Mac and Linux are not supported yet.',
    ],
  },
  providers: {
    signInWith: 'Sign in with',
    continueWith: 'Continue with',
  },
  nickname: {
    label: 'Nickname',
    hint: '3 to 20 characters: letters, numbers or _.',
    checking: 'Checking…',
    available: 'Available!',
    unavailable: 'Unavailable.',
  },
  login: {
    title: 'Sign in',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    forgot: 'Forgot my password',
    submit: 'Sign in',
    pending: 'Signing in…',
    failed: 'Could not sign in.',
  },
  mfa: {
    title: 'Two-step verification',
    subtitle: 'Enter the 6-digit code from your authenticator app.',
    submit: 'Confirm',
    pending: 'Verifying…',
    invalid: 'Invalid code.',
    useSecurityCode: 'Use a security code',
    useApp: 'Use the authenticator app',
    securityCode: 'Security code',
    securityHint:
      'Enter one of the security codes you saved when you turned on two-step verification.',
  },
  signup: {
    title: 'Create account',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    submit: 'Create account',
    pending: 'Creating…',
    failed: 'Could not create the account.',
    confirmMinAge:
      "I'm 12 or older. To use the watch party (watch, chat and create rooms) I'll need to verify that I'm 18 or older.",
    acceptTerms: (terms: ReactNode, privacy: ReactNode): ReactNode => (
      <>
        I have read and accept the {terms} and the {privacy}.
      </>
    ),
    sent: (email: ReactNode): ReactNode => (
      <>
        Almost there! We sent a confirmation link to <strong>{email}</strong>.
        Open the e-mail to activate your account.
      </>
    ),
  },
  forgot: {
    title: 'Forgot my password',
    remembered: 'Remembered it?',
    accountEmail: 'Account e-mail',
    submit: 'Send link',
    pending: 'Sending…',
    failed: 'Could not send.',
  },
  reset: {
    title: 'Create a new password',
    expired: (link: (label: string) => ReactNode): ReactNode => (
      <>
        The link has expired or was already used. {link('Request a new one')}.
      </>
    ),
    mismatch: "Passwords don't match.",
    failed: 'Could not save the password.',
    submit: 'Save password',
    pending: 'Saving…',
    done: (link: (label: string) => ReactNode): ReactNode => (
      <>
        Password updated. {link('Go to my account')} or return to the app and
        sign in with the new password.
      </>
    ),
  },
  confirmed: {
    invalidTitle: 'Invalid link',
    invalidBody:
      'The link has expired or was already used. Sign in to your account to request a new one.',
    emailUpdated: 'E-mail updated',
    emailConfirmed: 'E-mail confirmed!',
    emailUpdatedBody:
      'If you confirmed on both addresses, the change is complete.',
    emailConfirmedBody: 'Your account is active. You can now use CoopSeat.',
    continueInBrowser: 'Continue in the browser',
  },
  authError: {
    title: 'Could not continue',
  },
  openApp: {
    title: 'Returning to CoopSeat',
    subtitle:
      "If the app doesn't open on its own, use the button below. Then you can close this tab.",
    invalid: 'Invalid link.',
  },
  party: {
    title: (nickname: string) => `${nickname}'s room`,
  },
  account: {
    myRoom: 'My room',
    myRoomLink: 'Link to your room',
    greeting: (name: string) => `Hi, ${name}!`,
    welcome: 'Welcome to CoopSeat!',
    playBody:
      'Plug in your capture card and play your console right in the browser, nothing to install.',
    playCta: 'Play now',
    play: 'Play',
    tabs: {
      profile: 'Profile',
      security: 'Sign-in & security',
      account: 'Account',
    },
    partyBody: 'Finish the steps below to unlock each watch-party feature.',
    partyUnlocked: 'All set! You can watch, chat and create rooms.',
    dangerTitle: 'Danger zone',
    linked: 'Account linked successfully.',
    verificationReceived:
      'We received your verification. The result will show up here shortly.',
    nicknameSaved: 'Nickname saved. Welcome to CoopSeat!',
    ageTitle: 'Age verification',
    ageStatus: 'Status:',
    ageLabels: {
      UNVERIFIED: 'Not verified',
      PENDING: 'Under review',
      VERIFIED: 'Verified (18+)',
      REJECTED: 'Rejected',
    },
    ageExplainer:
      'Required by law (ECA Digital) to watch, chat and create rooms. We only keep the result (adult) and the date, never photos or document data.',
    verifyAge: 'Verify my age',
    linkedTitle: 'Linked accounts',
    emailAndPassword: 'E-mail and password',
    unlink: 'Unlink',
    unlinked: 'Link removed.',
    link: (provider: string) => `Link ${provider}`,
    permissionsTitle: 'Watch-party permissions',
    permissions: { watch: 'Watch', chat: 'Chat', host: 'Create rooms' },
    sessionTitle: 'Session',
    signOut: 'Sign out',
    chooseNickname: 'Choose your nickname',
    nicknameExplainer:
      "It's how your friends will see you in rooms. It's unique.",
    acceptTermsRequired:
      'You must accept the Terms of Use and the Privacy Policy.',
    acceptTerms: (terms: ReactNode, privacy: ReactNode): ReactNode => (
      <>
        I&apos;m 12 or older and accept the {terms} and the {privacy}.
      </>
    ),
    terms: 'Terms',
    saveNickname: 'Save nickname',
    profileTitle: 'Profile',
    nextNicknameChange: (date: string) => `Next change available on ${date}.`,
    nicknameUpdated: 'Nickname updated.',
    addEmail: 'Add an e-mail',
    pendingEmailTitle: 'Pending e-mail change',
    confirmPending: (email: ReactNode): ReactNode => (
      <>
        Confirm the link sent to <strong>{email}</strong>.
      </>
    ),
    xNoEmail:
      "Your X account didn't share an e-mail. It's needed to recover the account and verify your age.",
    checkEmail: 'Check your e-mail.',
    sendConfirmation: 'Send confirmation',
    securityTitle: 'Security',
    createPassword: 'Create password (to also sign in with e-mail)',
    passwordSaved: 'Password saved.',
    savePassword: 'Save password',
    totpTitle: 'Two-step verification (TOTP)',
    authenticatorRemoved: 'Authenticator removed.',
    remove: 'Remove',
    scanQr:
      'Scan the QR code with your authenticator app and enter the generated code.',
    qrAlt: 'Authenticator QR code',
    totpEnabled: 'Two-step verification enabled.',
    activate: 'Activate',
    enableTotp: 'Enable two-step verification',
    totpIntro:
      'Use an authenticator app such as Google Authenticator, 1Password or Authy. Scan the QR code. If you cannot scan it, copy the setup key into the app.',
    setupKey: 'Setup key',
    copy: 'Copy',
    copied: 'Copied',
    enterCode: 'Enter the 6-digit code from the app to confirm it is set up.',
    securityCodesTitle: 'Save your security codes',
    securityCodesBody:
      'Each code works once, in place of the authenticator, if you lose the app. They are shown only now. Keep them somewhere safe.',
    securityCodesFile: (date: string) =>
      `CoopSeat security codes\nGenerated on ${date}.\n\nEach code works once, instead of the authenticator app.\nAnyone with one of these codes can sign in to your account.`,
    securityCodesLeft: (count: number) =>
      count === 1 ? '1 security code left.' : `${count} security codes left.`,
    downloadCodes: 'Download .txt',
    savedCodes: 'I have saved my security codes',
    done: 'Done',
    cancel: 'Cancel',
    enabledStatus: 'Two-step verification is on.',
    generateCodes: 'Generate new security codes',
    regenerateBody:
      'Enter a code from your authenticator app. The security codes you have now will stop working.',
    disableTotp: 'Turn off two-step verification',
    disableBody:
      'Enter a code from your authenticator app, or an unused security code.',
    disableConfirm: 'Turn off',
    totpDisabled: 'Two-step verification turned off.',
    codesRegenerated: 'New security codes generated.',
    deleteAccount: 'Delete account',
    deleteWarning: (name: ReactNode): ReactNode => (
      <>
        This deletes your account and your data forever. Type{' '}
        <strong>{name}</strong> to confirm.
      </>
    ),
    confirmation: 'Confirmation',
    deleteForever: 'Delete permanently',
  },
  gates: {
    email: 'Confirm your e-mail.',
    nickname: 'Choose a nickname.',
    age: 'Verify your age (18+).',
    mfa: 'Confirm two-step verification.',
  },
  mock: {
    title: 'Simulated verification',
    subtitle: 'Development KYC provider. Choose the outcome.',
    document: 'Document number (to test duplicates)',
    outcomes: {
      adult: 'Approve (over 18)',
      minor: 'Approve under-18 document',
      reject: 'Reject (unreadable document)',
      review: 'Send to manual review',
    },
  },
  legal: {
    kicker: 'Legal',
    onThisPage: 'On this page',
    alsoRead: 'Also read',
  },
  privacy: {
    title: 'Privacy Policy',
    compliance:
      'In compliance with the LGPD (Law 13.709/2018) and ECA Digital (Law 15.211/2025).',
    sections: [
      {
        heading: 'What we collect',
        body: (
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Account: e-mail, nickname, profile picture from the provider (when
              you sign in with Google).
            </li>
            <li>
              Security: access logs and attempts, to prevent abuse (kept for up
              to 30 days).
            </li>
            <li>
              Age verification: only the result (adult or not), the date and an
              irreversible cryptographic fingerprint of the document, used to
              prevent the same document from verifying several accounts. Photos,
              selfie and document data stay with the verification partner and
              are not stored by CoopSeat.
            </li>
          </ul>
        ) as ReactNode,
      },
      {
        heading: "What we don't collect",
        body: (
          <p>
            We don&apos;t record your streams, camera or controllers. Media
            travels peer-to-peer between participants, or through an encrypted
            relay (Cloudflare) when a direct connection isn&apos;t possible; the
            relay can&apos;t see the content.
          </p>
        ) as ReactNode,
      },
      {
        heading: 'Watch party',
        body: (
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Your IP address is visible to other participants. Peer-to-peer
              connections need it: whoever is in the room with you can see the
              IP address of your connection, as in any video call. Only join
              rooms of people you trust.
            </li>
            <li>
              Room chat is not stored: messages live only in memory on the room
              server and are erased when the session ends.
            </li>
            <li>
              We keep a record of sessions (start, end, who took part) and of
              moderation actions (kicks, bans, stopped streams) to handle
              reports, appeals and abuse. Room passwords are stored only as an
              irreversible hash.
            </li>
          </ul>
        ) as ReactNode,
      },
      {
        heading: 'How we use it',
        body: (
          <p>
            To authenticate you, keep your account secure, meet the legal
            age-verification obligation and run the rooms.
          </p>
        ) as ReactNode,
      },
      {
        heading: 'Cookies',
        body: (
          <p>
            Essential cookies keep your session, chosen language and sign-in
            security working. With your permission, we also use Google Analytics
            to see, in aggregate, which pages are visited, and Microsoft Clarity
            to record clicks, scrolling and a replay of the session. That replay
            can include what is on screen, including room chat. Microsoft
            receives this data only if you allow it. You can change your choice
            at any time under Cookie preferences, at the bottom of the site.
          </p>
        ) as ReactNode,
      },
      {
        heading: 'Windows app statistics',
        body: (
          <p>
            Only if you allow it, the app reports when it is opened and when a
            capture starts, with the app version, the capture mode and a random
            identifier that is not linked to your account. This data goes
            through our server before reaching Google Analytics, so Google never
            receives your IP. You can turn it off in the app&apos;s Preferences,
            which deletes the identifier.
          </p>
        ) as ReactNode,
      },
      {
        heading: 'Your rights',
        body: (
          <p>
            You can access, correct and delete your data at any time in My
            account. Deletion removes your profile, links and verifications.
            Questions: privacidade@coopseat.com.
          </p>
        ) as ReactNode,
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    version: (version: string) => `Version ${version}`,
    sections: [
      {
        heading: '1. Who can use it',
        body: (
          <p>
            Playing in the browser (the Play page) and the Windows app are open
            to everyone, with no account. To create an account you must be 12 or
            older. The watch party (watching, streaming, chat and creating
            rooms) is exclusively for people aged 18 or older, who must verify
            their age with a document and a selfie through a verification
            partner. Accounts of people under 12 will be closed. If you are
            under 18, use CoopSeat with the guidance of a parent or guardian.
          </p>
        ) as ReactNode,
      },
      {
        heading: '2. Your account',
        body: (
          <p>
            You are responsible for your account and for what happens in the
            rooms you create. Nicknames and e-mails are unique. We recommend
            enabling two-step verification. Do not share your password.
          </p>
        ) as ReactNode,
      },
      {
        heading: '3. Conduct',
        body: (
          <>
            <p>In rooms, streams and chat, the following is prohibited:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                any sexual content or material involving minors, which will be
                reported to the authorities;
              </li>
              <li>
                sexual or pornographic content, gore and graphic violence;
              </li>
              <li>
                illegal content, including piracy, and third-party content
                (films, series, sports, paid streams) without authorization;
              </li>
              <li>
                hate speech, threats, harassment and incitement to violence;
              </li>
              <li>
                exposing other people&apos;s personal data, including the IP
                addresses seen in a room;
              </li>
              <li>spam, scams, malware and links to them;</li>
              <li>evading bans or suspensions with another account.</li>
            </ul>
            <p className="mt-2">
              CoopSeat may suspend accounts that break these rules, permanently
              or only for some features (creating rooms, streaming, joining or
              chatting), and cooperates with authorities.
            </p>
          </>
        ) as ReactNode,
      },
      {
        heading: '4. Rooms and streams',
        body: (
          <p>
            Streams are peer-to-peer between participants and are not recorded
            by CoopSeat. Each verified account has its own room; the owner
            decides who joins (password, approval or allow list), who can stream
            (up to 10 people at a time, only while the owner is streaming) and
            who moderates. The owner and moderators can remove, ban and stop the
            streams of participants. When the owner stops streaming, the session
            ends for everyone and the chat is erased. Participants can see each
            other&apos;s IP address, as described in the Privacy Policy.
          </p>
        ) as ReactNode,
      },
      {
        heading: '5. Termination',
        body: (
          <p>
            You can delete your account at any time in My account. Data is
            erased as described in the Privacy Policy.
          </p>
        ) as ReactNode,
      },
      {
        heading: '6. Contact',
        body: (<p>suporte@coopseat.com</p>) as ReactNode,
      },
    ],
  },
  cookies: {
    preferences: 'Cookie preferences',
    acceptAll: 'Accept all',
    acceptNecessary: 'Essential only',
    save: 'Save choices',
    close: 'Close',
    consent: {
      title: 'We use cookies',
      description:
        'Essential cookies keep the site working. With your permission, we also use Google Analytics and Microsoft Clarity to understand how the site is used. You can change this at any time.',
      customize: 'Customize',
    },
    intro:
      'Choose which cookies CoopSeat may use. Essential ones are always on, because the site does not work without them.',
    necessary: {
      title: 'Essential',
      description:
        'Keep your session, chosen language and sign-in security. They cannot be turned off.',
    },
    analytics: {
      title: 'Analytics',
      description:
        'Google Analytics shows us, in aggregate, which pages are visited and where visits come from. Microsoft Clarity records clicks, scrolling and a replay of the session, including what is visible on screen, such as room chat. Only enabled if you allow it.',
    },
    more: {
      title: 'More information',
      description: (privacyLink: string) =>
        `Read our ${privacyLink} to learn how we handle your data.`,
    },
  },
  messages: {
    confirmationSent: 'We sent a confirmation link to your e-mail.',
    emailChangeSent: 'We sent a confirmation link to the new e-mail.',
    passwordUpdated: 'Password updated.',
    resetLinkSent:
      'If an account exists with that e-mail, we sent a link to reset the password.',
    resendSent:
      'If there is a pending sign-up for that e-mail, we sent the link again.',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    internal: 'Internal error. Please try again in a moment.',
    invalid_input: 'Invalid data.',
    invalid_json: 'Invalid request body.',
    bad_origin: 'Request origin not allowed.',
    rate_limited: 'Too many attempts. Wait a few minutes and try again.',
    unauthenticated: 'Your session has expired. Please sign in again.',
    auth_unavailable: "Couldn't finish right now. Please try again.",
    captcha_required: "Confirm you're not a robot.",
    captcha_failed: "Couldn't validate the captcha. Try again.",
    turn_unavailable:
      "Couldn't prepare the connection right now. Please try again.",
    relay_unavailable:
      'Your network needs a relay to connect, and it is unavailable right now. Try another network (for example, Wi-Fi instead of mobile data).',
    relay_quota_exceeded:
      "You've reached today's limit of relayed connections. Try again tomorrow or use another network.",
    relay_app_outdated:
      "This app version can't use the relay. Update CoopSeat to continue.",
    download_unavailable:
      "The download isn't available right now. Please try again in a few minutes.",
    email_unavailable: "Couldn't send the e-mail right now. Please try again.",
    invalid_credentials: 'Incorrect e-mail or password.',
    email_not_confirmed:
      'Confirm your e-mail before signing in. Check your inbox.',
    email_unconfirmed: 'Confirm your e-mail before verifying your age.',
    user_already_exists: 'That e-mail is already in use.',
    email_exists: 'That e-mail is already in use.',
    weak_password:
      'Weak password or leaked from another service. Choose another one.',
    same_password: 'The new password must be different from the current one.',
    over_email_send_rate_limit: 'Too many e-mails sent. Wait a few minutes.',
    over_request_rate_limit: 'Too many attempts. Wait a few minutes.',
    otp_expired: 'The link has expired or was already used. Request a new one.',
    mfa_verification_failed:
      'Invalid code. Check your authenticator app and try again.',
    mfa_challenge_expired: 'The code has expired. Try again.',
    mfa_factor_name_conflict: 'An authenticator with that name already exists.',
    mfa_required: 'Confirm the two-step verification code to continue.',
    mfa_expired: 'The time to confirm the code ran out. Please sign in again.',
    mfa_not_enrolled: 'No authenticator found.',
    identity_already_exists:
      'That provider account is already linked to another user.',
    identity_not_found: 'Link not found.',
    single_identity_not_deletable: 'You must keep at least one sign-in method.',
    manual_linking_disabled: 'Account linking is unavailable right now.',
    insufficient_aal: 'Confirm two-step verification to continue.',
    reauthentication_needed: 'Sign in again to change the password.',
    session_not_found: 'Your session has expired. Please sign in again.',
    refresh_token_not_found: 'Your session has expired. Please sign in again.',
    refresh_token_already_used:
      'Your session has expired. Please sign in again.',
    bad_jwt: 'Your session has expired. Please sign in again.',
    user_not_found: 'Account not found.',
    signup_disabled: 'Sign-ups are temporarily disabled.',
    ticket_invalid: 'The sign-in has expired. Try signing in again.',
    confirm_mismatch: 'Type your nickname exactly as it appears to confirm.',
    nickname_taken: 'That nickname is already in use.',
    nickname_cooldown: 'You can only change your nickname once every 30 days.',
    already_verified: 'Your age has already been verified.',
    kyc_locked: 'Attempt limit reached. Contact support.',
    kyc_attempts: 'You reached the limit of 3 attempts in 30 days.',
    kyc_unavailable:
      "Couldn't start the age verification right now. Please try again in a few minutes.",
    nickname_required: 'Enter a nickname.',
    nickname_format:
      'The nickname must be 3 to 20 characters: letters, numbers or _.',
    nickname_reserved: 'That nickname is reserved.',
    email_required: 'Enter an e-mail.',
    email_too_long: 'E-mail too long.',
    email_invalid: 'Invalid e-mail.',
    email_disposable: 'Invalid email.',
    email_undeliverable: 'Invalid email.',
    password_required: 'Enter a password.',
    password_too_short: 'The password must be at least 8 characters.',
    password_too_long: 'The password must be at most 72 characters.',
    password_weak: 'The password must contain letters and numbers.',
    terms_required: 'You must accept the Terms of Use and the Privacy Policy.',
    min_age_required: 'You must be 12 or older to create a CoopSeat account.',
    nothing_to_update: 'Nothing to update.',
    confirm_required: 'Type your nickname to confirm.',
    provider_unsupported: 'Provider not supported.',
    pkce_challenge_invalid: 'Invalid PKCE challenge.',
    pkce_verifier_invalid: 'Invalid PKCE verifier.',
    totp_format: 'The code has 6 digits.',
    login_expired: 'The sign-in has expired. Go back and try again.',
    provider_already_linked:
      'That provider account is already linked to another CoopSeat user.',
    provider_refused: 'The provider refused the sign-in. Try again.',
    provider_bad_response: 'Invalid response from the provider.',
    login_failed: "Couldn't finish signing in. Try again.",
    oauth_start_failed: "Couldn't start signing in with that provider.",
    link_expired: 'The linking link has expired. Try again from the app.',
    link_failed: "Couldn't start linking. Sign in again and retry.",
    account_suspended:
      'This account is suspended. Contact suporte@coopseat.com.',
    party_unavailable:
      'Gaming-Party is unavailable for this account right now.',
    party_disabled: 'Gaming-Party is temporarily unavailable.',
    party_not_found: 'Room not found.',
    party_forbidden: "You don't have permission to do that in this room.",
    party_requirements: 'Verify your identity (18+) to use Gaming-Party.',
    party_no_session: "This room isn't live right now.",
    party_password_invalid: 'Wrong room password.',
    party_password_format: 'The password must be 4 to 64 characters.',
    party_target_invalid: "You can't do that to this person.",
    party_target_unverified:
      'Only people with a verified identity can be added.',
    party_token_invalid: 'Your room access expired. Join the room again.',
    party_signal_invalid: 'Invalid signature.',
  },
};

export type Dictionary = typeof en;
export type ErrorCode = keyof Dictionary['errors'];
