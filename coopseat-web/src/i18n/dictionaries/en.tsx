import type { ReactNode } from 'react';

export const en = {
  meta: {
    description: 'Watch and play together with your friends, with your camera, your controller and your screen.',
    login: 'Sign in',
    mfa: 'Two-step verification',
    signup: 'Create account',
    forgotPassword: 'Forgot password',
    resetPassword: 'Reset password',
    emailConfirmed: 'E-mail confirmed',
    authError: 'Could not continue',
    openApp: 'Returning to the app',
    account: 'My account',
    privacy: 'Privacy Policy',
    terms: 'Terms of Use',
    mockVerification: 'Verification (simulated)',
    play: 'Play',
    playDescription: 'Play your console in a browser tab through a USB capture card.',
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
    nav: { features: 'Features', how: 'How it works', party: 'Watch party', faq: 'FAQ' },
    signIn: 'Sign in',
    myAccount: 'My account',
    createAccount: 'Create account',
    download: 'Download for Windows',
    downloadShort: 'Download',
    playInBrowser: 'Play in the browser',
    badge: 'Beta · Free · Windows 10/11',
    headlineLead: 'Your console on your PC.',
    headlineAccent: 'Your friends on the couch.',
    pitch:
      'Connect your console to the computer with a capture card and play on your PC screen, with a sharp picture, game sound and almost no delay. Soon you will also be able to invite friends to watch and play along.',
    heroNote: 'Free · No account needed to play · We never record your game',
    mock: {
      title: 'CoopSeat',
      live: 'Live',
      watching: (n: number) => `${n} watching`,
      soon: 'Soon',
      chain: 'Console → capture card → PC',
    },
    stats: [
      { value: 'Full HD', label: 'sharp, smooth picture, just like on your TV' },
      { value: '3 steps', label: 'from plugging in to playing' },
      { value: 'Free', label: 'no subscription and no hidden fees' },
      { value: '0', label: 'recordings: what you play stays with you' },
    ],
    featuresKicker: 'Features',
    featuresTitle: 'Made for playing, not for streaming.',
    featuresSubtitle:
      'No complicated setup. Plug in your capture card, open CoopSeat and your game shows up on the screen, ready to play.',
    features: [
      {
        title: 'Almost no delay',
        body: 'What you press on the controller shows up on the screen right away, so you can really play instead of just watching.',
      },
      {
        title: 'Sharp, smooth picture',
        body: 'Full HD at 60 frames per second, with the colors and proportions you would see on your TV.',
      },
      {
        title: 'Game sound included',
        body: 'The console sound comes along with the picture, through your headphones or speakers.',
      },
      {
        title: 'Full screen, no distractions',
        body: 'Press F11 and the game fills the screen. Stop moving the mouse and the buttons disappear, leaving only the game.',
      },
      {
        title: 'Works in the browser too',
        body: "Don't want to install anything? Play straight from a Chrome or Edge tab.",
      },
      {
        title: 'Remembers your settings',
        body: 'Save your favorite setup and CoopSeat connects on its own every time you open it.',
      },
    ],
    howKicker: 'How it works',
    howTitle: 'Playing takes three steps.',
    steps: [
      {
        title: 'Plug it in',
        body: 'Connect the console to the capture card with the HDMI cable, and the capture card to the computer with the USB cable.',
      },
      {
        title: 'Open CoopSeat',
        body: 'Choose your capture card from the list. CoopSeat picks the best picture quality for you.',
      },
      {
        title: 'Play',
        body: "Click Start and grab your controller. That's it!",
      },
    ],
    party: {
      kicker: 'Watch party',
      soon: 'Coming soon',
      title: 'The couch, now online.',
      body: 'Open a room and invite your friends to watch you play and chat along, as if they were sitting on the couch with you.',
      points: [
        'Friends watch straight from the browser, with no account and nothing to install.',
        'Chat is only for verified adult accounts (18+), as Brazilian law requires.',
        'You decide who joins the room and can remove anyone at any time.',
      ],
      cta: 'Create your account',
      host: 'You · host',
      guest: 'Watching',
      live: 'Live',
      invite: 'Invite',
      chat: [
        { name: 'luna', text: 'no way you hit that jump 😂' },
        { name: 'theo', text: 'my turn next round!' },
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
        body: 'For chat we only keep whether you are an adult and the date, never photos or document data.',
      },
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        q: 'Is CoopSeat free?',
        a: "Yes. The app and the website are free. If you'd like to support the project, there's a donation button inside the app.",
      },
      {
        q: 'What do I need to play?',
        a: 'A computer with Windows 10 or 11, a USB capture card and the HDMI cable from your console. That’s all.',
      },
      {
        q: 'Do I need an account to play?',
        a: 'No. You can play without an account. It will only be needed to watch and chat with friends, which is coming soon.',
      },
      {
        q: 'Which capture cards work?',
        a: 'Most USB capture cards that Windows recognizes. Some copy-protected content, like movie streaming apps, will not show up.',
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
    ctaTitle: 'Ready to take your seat?',
    ctaBody: 'Download CoopSeat, plug in your capture card and start playing in minutes.',
    footer: {
      tagline: 'Play and watch together, as if you were on the same couch.',
      product: 'Product',
      legal: 'Legal',
      account: 'My account',
      source: 'GitHub',
      rights: (year: number) => `© ${year} CoopSeat`,
    },
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
  },
  signup: {
    title: 'Create account',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    submit: 'Create account',
    pending: 'Creating…',
    failed: 'Could not create the account.',
    confirmAdult: "I'm 18 or older. I'll verify my age to use chat and create rooms.",
    acceptTerms: (terms: ReactNode, privacy: ReactNode): ReactNode => (
      <>
        I have read and accept the {terms} and the {privacy}.
      </>
    ),
    sent: (email: ReactNode): ReactNode => (
      <>
        Almost there! We sent a confirmation link to <strong>{email}</strong>. Open the e-mail to activate your account.
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
      <>The link has expired or was already used. {link('Request a new one')}.</>
    ),
    mismatch: "Passwords don't match.",
    failed: 'Could not save the password.',
    submit: 'Save password',
    pending: 'Saving…',
    done: (link: (label: string) => ReactNode): ReactNode => (
      <>Password updated. {link('Go to my account')} or return to the app and sign in with the new password.</>
    ),
  },
  confirmed: {
    invalidTitle: 'Invalid link',
    invalidBody: 'The link has expired or was already used. Sign in to your account to request a new one.',
    emailUpdated: 'E-mail updated',
    emailConfirmed: 'E-mail confirmed!',
    emailUpdatedBody: 'If you confirmed on both addresses, the change is complete.',
    emailConfirmedBody: 'Your account is active. You can now use CoopSeat.',
    continueInBrowser: 'Continue in the browser',
  },
  authError: {
    title: 'Could not continue',
  },
  openApp: {
    title: 'Returning to CoopSeat',
    subtitle: "If the app doesn't open on its own, use the button below. Then you can close this tab.",
    invalid: 'Invalid link.',
  },
  account: {
    greeting: (name: string) => `Hi, ${name}!`,
    welcome: 'Welcome to CoopSeat!',
    playBody: 'Plug in your capture card and play your console right in the browser, nothing to install.',
    playCta: 'Play now',
    play: 'Play',
    tabs: { profile: 'Profile', security: 'Sign-in & security', account: 'Account' },
    partyBody: 'Finish the steps below to unlock each watch-party feature.',
    partyUnlocked: 'All set! You can watch, chat and create rooms.',
    dangerTitle: 'Danger zone',
    linked: 'Account linked successfully.',
    verificationReceived: 'We received your verification. The result will show up here shortly.',
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
      'Required by law (ECA Digital) for chat and creating rooms. We only keep the result (adult) and the date, never photos or document data.',
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
    nicknameExplainer: "It's how your friends will see you in rooms. It's unique.",
    acceptTermsRequired: 'You must accept the Terms of Use and the Privacy Policy.',
    acceptTerms: (terms: ReactNode, privacy: ReactNode): ReactNode => (
      <>
        I'm 18 or older and accept the {terms} and the {privacy}.
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
    xNoEmail: "Your X account didn't share an e-mail. It's needed to recover the account and verify your age.",
    checkEmail: 'Check your e-mail.',
    sendConfirmation: 'Send confirmation',
    securityTitle: 'Security',
    createPassword: 'Create password (to also sign in with e-mail)',
    passwordSaved: 'Password saved.',
    savePassword: 'Save password',
    totpTitle: 'Two-step verification (TOTP)',
    authenticatorRemoved: 'Authenticator removed.',
    remove: 'Remove',
    scanQr: 'Scan the QR code with your authenticator app and enter the generated code.',
    qrAlt: 'Authenticator QR code',
    totpEnabled: 'Two-step verification enabled.',
    activate: 'Activate',
    enableTotp: 'Enable two-step verification',
    deleteAccount: 'Delete account',
    deleteWarning: (name: ReactNode): ReactNode => (
      <>
        This deletes your account and your data forever. Type <strong>{name}</strong> to confirm.
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
    compliance: 'In compliance with the LGPD (Law 13.709/2018) and ECA Digital (Law 15.211/2025).',
    sections: [
      {
        heading: 'What we collect',
        body: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Account: e-mail, nickname, profile picture from the provider (when you sign in with Google).</li>
            <li>Security: access logs and attempts, to prevent abuse (kept for up to 30 days).</li>
            <li>
              Age verification: only the result (adult or not), the date and an irreversible cryptographic fingerprint of the
              document, used to prevent the same document from verifying several accounts. Photos, selfie and document data stay
              with the verification partner and are not stored by CoopSeat.
            </li>
          </ul>
        ) as ReactNode,
      },
      {
        heading: "What we don't collect",
        body: (
          <p>We don't record your streams, camera or controllers. Media travels peer-to-peer between participants.</p>
        ) as ReactNode,
      },
      {
        heading: 'How we use it',
        body: (
          <p>To authenticate you, keep your account secure, meet the legal age-verification obligation and run the rooms.</p>
        ) as ReactNode,
      },
      {
        heading: 'Cookies',
        body: (
          <p>
            Essential cookies keep your session, chosen language and sign-in security working. With your permission, we also use
            Google Analytics to see, in aggregate, which pages are visited. You can change your choice at any time under Cookie
            preferences, at the bottom of the site.
          </p>
        ) as ReactNode,
      },
      {
        heading: 'Windows app statistics',
        body: (
          <p>
            Only if you allow it, the app reports when it is opened and when a capture starts, with the app version, the capture mode
            and a random identifier that is not linked to your account. This data goes through our server before reaching Google
            Analytics, so Google never receives your IP. You can turn it off in the app's Preferences, which deletes the identifier.
          </p>
        ) as ReactNode,
      },
      {
        heading: 'Your rights',
        body: (
          <p>
            You can access, correct and delete your data at any time in My account. Deletion removes your profile, links and
            verifications. Questions: privacidade@coopseat.com.
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
            CoopSeat is exclusively for people aged 18 or older. To use chat and create rooms, you must verify your age
            with a document and a selfie through a verification partner. Accounts belonging to minors will be closed.
          </p>
        ) as ReactNode,
      },
      {
        heading: '2. Your account',
        body: (
          <p>
            You are responsible for your account and for what happens in the rooms you create. Nicknames and e-mails are unique.
            We recommend enabling two-step verification. Do not share your password.
          </p>
        ) as ReactNode,
      },
      {
        heading: '3. Conduct',
        body: (
          <p>
            Streaming illegal content, third-party content without authorization, hate speech, harassment, sexual content or any
            material involving minors is prohibited. We may suspend accounts that break these rules and cooperate with
            authorities.
          </p>
        ) as ReactNode,
      },
      {
        heading: '4. Streams',
        body: (
          <p>
            Streams are peer-to-peer between participants and are not recorded by CoopSeat. Whoever creates the room decides who
            joins and can remove guests.
          </p>
        ) as ReactNode,
      },
      {
        heading: '5. Termination',
        body: (
          <p>You can delete your account at any time in My account. Data is erased as described in the Privacy Policy.</p>
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
        'Essential cookies keep the site working. With your permission, we also use Google Analytics to understand how the site is used. You can change this at any time.',
      customize: 'Customize',
    },
    intro: 'Choose which cookies CoopSeat may use. Essential ones are always on, because the site does not work without them.',
    necessary: {
      title: 'Essential',
      description: 'Keep your session, chosen language and sign-in security. They cannot be turned off.',
    },
    analytics: {
      title: 'Analytics',
      description:
        'Google Analytics: shows us, in aggregate, which pages are visited and where visits come from. Only enabled if you allow it.',
    },
    more: {
      title: 'More information',
      description: (privacyLink: string) => `Read our ${privacyLink} to learn how we handle your data.`,
    },
  },
  messages: {
    confirmationSent: 'We sent a confirmation link to your e-mail.',
    emailChangeSent: 'We sent a confirmation link to the new e-mail.',
    passwordUpdated: 'Password updated.',
    resetLinkSent: 'If an account exists with that e-mail, we sent a link to reset the password.',
    resendSent: 'If there is a pending sign-up for that e-mail, we sent the link again.',
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
    turn_unavailable: "Couldn't prepare the connection right now. Please try again.",
    email_unavailable: "Couldn't send the e-mail right now. Please try again.",
    invalid_credentials: 'Incorrect e-mail or password.',
    email_not_confirmed: 'Confirm your e-mail before signing in. Check your inbox.',
    email_unconfirmed: 'Confirm your e-mail before verifying your age.',
    user_already_exists: 'That e-mail is already in use.',
    email_exists: 'That e-mail is already in use.',
    weak_password: 'Weak password or leaked from another service. Choose another one.',
    same_password: 'The new password must be different from the current one.',
    over_email_send_rate_limit: 'Too many e-mails sent. Wait a few minutes.',
    over_request_rate_limit: 'Too many attempts. Wait a few minutes.',
    otp_expired: 'The link has expired or was already used. Request a new one.',
    mfa_verification_failed: 'Invalid code. Check your authenticator app and try again.',
    mfa_challenge_expired: 'The code has expired. Try again.',
    mfa_factor_name_conflict: 'An authenticator with that name already exists.',
    mfa_required: 'Confirm the two-step verification code to continue.',
    mfa_expired: 'The time to confirm the code ran out. Please sign in again.',
    mfa_not_enrolled: 'No authenticator found.',
    identity_already_exists: 'That provider account is already linked to another user.',
    identity_not_found: 'Link not found.',
    single_identity_not_deletable: 'You must keep at least one sign-in method.',
    manual_linking_disabled: 'Account linking is unavailable right now.',
    insufficient_aal: 'Confirm two-step verification to continue.',
    reauthentication_needed: 'Sign in again to change the password.',
    session_not_found: 'Your session has expired. Please sign in again.',
    refresh_token_not_found: 'Your session has expired. Please sign in again.',
    refresh_token_already_used: 'Your session has expired. Please sign in again.',
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
    nickname_required: 'Enter a nickname.',
    nickname_format: 'The nickname must be 3 to 20 characters: letters, numbers or _.',
    nickname_reserved: 'That nickname is reserved.',
    email_required: 'Enter an e-mail.',
    email_too_long: 'E-mail too long.',
    email_invalid: 'Invalid e-mail.',
    password_required: 'Enter a password.',
    password_too_short: 'The password must be at least 8 characters.',
    password_too_long: 'The password must be at most 72 characters.',
    password_weak: 'The password must contain letters and numbers.',
    terms_required: 'You must accept the Terms of Use and the Privacy Policy.',
    adult_required: 'CoopSeat is exclusively for people aged 18 or older.',
    nothing_to_update: 'Nothing to update.',
    confirm_required: 'Type your nickname to confirm.',
    provider_unsupported: 'Provider not supported.',
    pkce_challenge_invalid: 'Invalid PKCE challenge.',
    pkce_verifier_invalid: 'Invalid PKCE verifier.',
    totp_format: 'The code has 6 digits.',
    login_expired: 'The sign-in has expired. Go back and try again.',
    provider_already_linked: 'That provider account is already linked to another CoopSeat user.',
    provider_refused: 'The provider refused the sign-in. Try again.',
    provider_bad_response: 'Invalid response from the provider.',
    login_failed: "Couldn't finish signing in. Try again.",
    oauth_start_failed: "Couldn't start signing in with that provider.",
    link_expired: 'The linking link has expired. Try again from the app.',
    link_failed: "Couldn't start linking. Sign in again and retry.",
  },
};

export type Dictionary = typeof en;
export type ErrorCode = keyof Dictionary['errors'];
