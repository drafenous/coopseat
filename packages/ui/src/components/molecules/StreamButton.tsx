import { Radio, Square } from 'lucide-react';
import { Button } from '../atoms';
import { useT } from '../../i18n';

type Props = {
  streaming: boolean;
  busy: boolean;
  disabled?: boolean;
  title?: string;
  /** Full-width, for the input panel. The stage header uses the compact form. */
  block?: boolean;
  onStart(): void;
  onStop(): void;
};

/** Party stream on/off. In a room this also opens the capture when it is not running yet. */
export function StreamButton({
  streaming,
  busy,
  disabled,
  title,
  block,
  onStart,
  onStop,
}: Props) {
  const t = useT().party.stream;
  return (
    <Button
      inline={!block}
      stop={streaming}
      disabled={busy || (!streaming && disabled)}
      title={title}
      onClick={streaming ? onStop : onStart}
    >
      {streaming ? <Square size={16} /> : <Radio size={17} />}{' '}
      {busy ? t.starting : streaming ? t.stop : t.start}
    </Button>
  );
}
