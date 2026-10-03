import type { ComponentProps } from 'react';
import { Button as DesignButton } from '@coopseat/ui/design';

export { Alert, Card, Divider, Field, buttonClass } from '@coopseat/ui/design';

/** Site forms stack their actions, so buttons fill the card by default. */
export function Button(props: ComponentProps<typeof DesignButton>) {
  return <DesignButton wide {...props} />;
}
