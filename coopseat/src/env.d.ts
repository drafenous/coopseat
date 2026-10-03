import type {DesktopBridge} from '@coopseat/ui';

declare global { interface Window { input?: DesktopBridge } }
