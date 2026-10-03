import { route } from '@/server/http';
import { changePassword } from '@/server/password';

export const POST = route(changePassword);
