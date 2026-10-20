# Validação — CoopSeat 0.1

## Executada no ambiente de desenvolvimento Linux

- `npm ci`/instalação das dependências e lockfile gerado.
- `npm run build`: TypeScript estrito e bundle de produção Vite concluídos.
- `npm test`: validação de parâmetros de IPC, rejeição de valores inválidos e remoção de campos extras.
- `node --check` nos módulos Electron main/preload: sem erro de sintaxe.
- Cross-compilation do núcleo para Windows x64: GCC MinGW-w64 13, headers Windows, C++20; compilação e ligação concluídas.
- Dependências PE do núcleo: apenas DLLs de sistema Windows; runtime GCC/libstdc++ estático.
- `npm audit --omit=dev`: nenhuma vulnerabilidade de produção reportada no momento da geração.
- Interface aberta no Chrome for Testing com dispositivos sintéticos.
- Iniciar captura: track de vídeo ativo, elemento `<video>` reproduzindo 1920×1080.
- Câmera simulada entregou 20 fps apesar da preferência de 60; o painel mostrou corretamente 20,0 FPS negociados.
- Parar captura: track em estado `ended`, `srcObject` removido, status “Aguardando conexão” e seletores novamente ativos.
- Entrada de áudio selecionada explicitamente: track sintético ativo e `<audio>` reproduzindo, volume 0,75.
- Atalho M: volume do elemento de áudio alterado para zero.
- Nenhum erro JavaScript reportado pelo navegador nos fluxos verificados.

Esses testes não medem qualidade do áudio, compatibilidade da FIFINE ou latência real. O navegador de teste não executa os IPCs do Electron nem as APIs multimídia do Windows.

## Ainda necessário no Windows com sua placa

1. Abrir o pacote portátil no Windows e verificar início do Electron/preload.
2. Enumerar a FIFINE e seus modos; iniciar NV12 ou YUY2 e, quando oferecido, MJPEG.
3. Verificar cores, níveis de preto, orientação e proporção da imagem com um padrão conhecido do console.
4. Testar áudio HDMI, saída desejada, volume/mute e sessões longas; observar drift, cortes e uso de CPU/GPU.
5. Testar F11/Esc na janela nativa, VSync, alfinete e movimentação entre monitores/DPI diferentes.
6. Desconectar/reconectar o USB e confirmar encerramento/recuperação manual sem processo órfão.
7. Se houver falha nativa, testar o modo Compatibilidade com a mesma placa.
8. Medir latência fim a fim por filmagem simultânea do passthrough e do preview. Comparar 720p60, 1080p60 e os formatos realmente disponíveis.

A fila interna limitada e MF_LOW_LATENCY foram implementados, mas nenhum valor de milissegundos de latência fim a fim foi medido ou prometido.

## Empacotamento

O instalador NSIS não pôde ser finalizado no ambiente Linux porque o Wine disponível não executa o stub NSIS de 32 bits. A entrega usa o alvo portátil; o projeto mantém o comando de geração do instalador para execução no Windows.

O executável portátil foi gerado pelo electron-builder. Ele ainda não foi executado num Windows real; o processo de empacotamento concluído não substitui esse teste.
