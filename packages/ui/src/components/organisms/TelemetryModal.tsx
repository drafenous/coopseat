import { Button } from '../atoms';
import { Modal, ModalActions } from '../molecules';
import { useT } from '../../i18n';

/** Dismissing (Escape, backdrop) counts as a refusal: no consent without an explicit yes. */
type Props = { onChoose(granted: boolean): void };

export function TelemetryModal({ onChoose }: Props) {
  const t = useT().telemetry;
  return (
    <Modal small labelledBy="telemetry-title" onClose={() => onChoose(false)}>
      <h2 id="telemetry-title">{t.title}</h2>
      <p>{t.body}</p>
      <p>{t.never}</p>
      <p>{t.later}</p>
      <ModalActions>
        <Button variant="secondary" onClick={() => onChoose(false)}>
          {t.deny}
        </Button>
        <Button inline onClick={() => onChoose(true)}>
          {t.allow}
        </Button>
      </ModalActions>
    </Modal>
  );
}
