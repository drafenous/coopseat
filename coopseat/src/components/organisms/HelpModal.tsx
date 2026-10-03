import {Clapperboard,Keyboard,Lightbulb,Maximize} from 'lucide-react';
import {Button,Kbd,MiniMonitor,MiniWindow} from '../atoms';
import {Modal,ModeCard,Shortcut,StepItem} from '../molecules';
import './HelpModal.css';

export function HelpModal({onClose}:{onClose():void}){
 return <Modal labelledBy="help-title" closeButton onClose={onClose}>
  <h2 id="help-title">Como começar</h2>
  <ol className="steps">
   <StepItem step={1} title="Conecte os cabos">HDMI do console na entrada da placa de captura, e a placa numa porta USB do computador (USB 3, se tiver).</StepItem>
   <StepItem step={2} title="Escolha a placa e o áudio">No painel à direita, selecione a placa e a entrada de áudio dela. O microfone do PC nunca é ativado sozinho.</StepItem>
   <StepItem step={3} title="Clique em Iniciar captura">A imagem do console aparece na tela. Salve tudo como preset para não configurar de novo.</StepItem>
  </ol>
  <h3 className="help-subtitle">Duas formas de ver só o jogo</h3>
  <div className="modes">
   <ModeCard illustration={<MiniWindow/>} icon={<Clapperboard size={15}/>} title="Modo cinema" footer="Mexa o mouse para sair">Os controles somem e o vídeo ocupa a <strong>janela</strong>. Entra sozinho quando você fica parado, ou pelo botão Cinema.</ModeCard>
   <ModeCard illustration={<MiniMonitor/>} icon={<Maximize size={15}/>} title="Tela cheia" footer={<><Kbd>F11</Kbd> entra e sai · <Kbd>Esc</Kbd> sai</>}>O vídeo ocupa o <strong>monitor inteiro</strong>, sem bordas nem barra de tarefas.</ModeCard>
  </div>
  <div className="help-keys"><Keyboard size={15}/><Shortcut keys="F11">tela cheia</Shortcut><Shortcut keys="Esc">sair da tela cheia e do modo cinema</Shortcut><Shortcut keys="M">silenciar</Shortcut></div>
  <div className="help-tips"><Lightbulb size={15}/><div>
   <p>Se a placa não abrir, feche OBS, Câmera e outros apps que possam estar usando ela.</p>
   <p>Conteúdo protegido por HDCP (alguns apps de vídeo) não aparece em placas de captura.</p>
   <p>O modo Nativo tem menos atraso. Se não estiver disponível, use Compatibilidade em Avançado.</p>
   <p>Para jogar você não precisa de conta. Ela é para maiores de 18 anos: com e-mail confirmado, apelido e idade verificada, libera chat e voz nas sessões e permite criar salas.</p>
  </div></div>
  <Button onClick={onClose}>Entendi</Button>
 </Modal>;
}
