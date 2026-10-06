import { Hand } from 'lucide-react';
import { Button } from '../atoms';
import { useT } from '../../i18n';

/** Asks the owner/moderators for permission to stream; the grant lasts only for this session. */
export function RequestStreamButton({
  requested,
  disabled,
  title,
  onRequest,
}: {
  requested: boolean;
  disabled?: boolean;
  title?: string;
  onRequest(): void;
}) {
  const t = useT().party.stream;
  return (
    <Button
      variant="secondary"
      compact
      disabled={requested || disabled}
      title={title}
      onClick={onRequest}
    >
      <Hand size={15} /> {requested ? t.requested : t.request}
    </Button>
  );
}
