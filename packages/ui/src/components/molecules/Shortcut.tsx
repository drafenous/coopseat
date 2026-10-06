import type { ReactNode } from 'react';
import { Kbd } from '../atoms';

export function Shortcut({
  keys,
  children,
}: {
  keys: string;
  children: ReactNode;
}) {
  return (
    <span>
      <Kbd>{keys}</Kbd> {children}
    </span>
  );
}
