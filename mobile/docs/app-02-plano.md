# APP-02 — Plano de implementação

Objetivo: entregar telas navegáveis do MVP aprovado, com demonstração explícita e sem executar as integrações reais das tasks seguintes.

Referências: arquitetura-inicial.md e app-01-arquitetura-servicos.md.

Execução no workspace existente: a base contém arquivos ainda não versionados necessários para esta tarefa; preservar esse trabalho e não criar commits abrangendo mudanças anteriores.

## Decisões

- Manter tema verde e componentes de formulário; Minhas lixeiras será a entrada autenticada da prévia.
- Rotas tipadas e pilha com retorno Android, seguindo a navegação condicional existente; navegador de produção será definido na integração.
- Separar lista, detalhes, histórico, adicionar, configurações, perfil e recuperação OTP. Reutilizar AuthForm para login/cadastro.
- Dados ilustrativos em memória via hook; dispositivo novo começa sem leitura. Sair limpa a demonstração.
- Wi-Fi e OTP são prévias: não enviar dados, não solicitar senha real da rede, não alegar autenticação/conexão.
- Estados de carregamento, vazio e erro exploráveis. Sem dashboard, equipes ou mapas.

## Etapas

- [x] Testes Playwright das jornadas mobile/desktop e ausência de chamadas ao backend.
- [x] Tipos, fixtures e hook da demonstração em types/bin.ts, constants/binPreview.ts e hooks/useBinPreview.ts.
- [x] Componentes AppShell e BinCard; telas em screens/bin e screens/auth.
- [x] DemoNavigator com rotas tipadas, retorno e limpeza na saída.
- [x] Documentação, 16 testes existentes, 2 jornadas Playwright e screenshot mobile.
- [x] Confirmação final conjunta de typecheck e lint após ajuste de tipos percentuais (ambos exit 0).

## Critérios de revisão

Preservar fluxo Firebase separado. Não mostrar bateria ou nível fictício como real. Validar nome vazio. Retorno preserva dados e saída limpa a sessão. Nenhuma rolagem horizontal em 390 px. Controles com rótulos acessíveis. Nenhuma tarefa de backend será declarada implementada pela prévia.

## Registro

Execução autorizada ao prosseguir para APP-02 após definição das telas e arquitetura. Plano registrado antes de alterações de produto.

Resultado em 14/10/2026: Playwright passou em 390 e 1440 px. Teste inicialmente falhou porque a versão anterior abria Visão geral; a nova navegação atende ao fluxo especificado. Revisão independente somente leitura não encontrou bloqueadores. Captura mobile inspecionada.

Limites: testes de interface executados no Chrome com viewport mobile/desktop; botão físico Android e teclado nativo não foram testados em aparelho. A verificação automatizada de overflow cobre a lista, não todas as telas. OTP, Wi-Fi, persistência e autenticação da prévia não são integrações reais. Histórico usa dados ilustrativos. Navegação web por URL/histórico do navegador não faz parte desta prévia.
