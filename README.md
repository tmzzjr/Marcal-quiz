# Quebrando Ciclos — quiz

Quiz de diagnóstico no estilo do onboarding da BetterMe (tema escuro, cards de
resposta que invertem para creme, progresso segmentado, botão pílula).

- Perguntas transcritas do quiz original em `quiz-data.js`
- Sem framework e sem build: `index.html`, `styles.css`, `app.js`
- Servido por `server.js`, um estático em Node sem dependências
- Fotos recortadas com matting, exibidas soltas sobre o fundo com máscara em degradê
- Progresso salvo no navegador por 14 dias, com popup para retomar

## Rodar local

    node server.js     # http://localhost:3000

## Deploy

Push na `master` publica sozinho no Railway.
