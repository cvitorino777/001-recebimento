# DOCA·105 — Sistema de Recebimento

Protótipo funcional (HTML + CSS + JS puro, sem backend) para substituir a planilha de Excel do processo de recebimento de mercadorias: **Chegada → Pendentes → 5000 → Espelho/Movimentação 105**, com divergências e relatório.

Feito pra rodar direto no navegador, sem precisar de servidor. Os dados ficam só na memória da página — se recarregar, tudo zera.

---

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Estrutura da página: sidebar, telas e os modais (Registrar chegada, Criar 5000, Registrar divergência) |
| `styles.css` | Todo o visual: cores, tabela, cards, calendário, toggles, gráficos |
| `app.js` | Toda a lógica: estado dos dados, regras de bloqueio, cálculo de tempo, cópia do número do 5000 |

Pra usar: baixa os três na **mesma pasta** e abre o `index.html` no navegador.

---

## O fluxo que o sistema representa (dividido entre dois papéis)

1. Caminhão chega, descarrega. NF e CT vão pra fiscal — **quem faz o recebimento registra a chegada na aba Recebimentos** (fornecedor + NF).
2. Isso já cria o item em **Pendentes**, pra onde o sistema pula automaticamente.
3. **A fiscal confere** em Pendentes se o pedido bate, se o valor bate, e dá a aprovação (três toggles).
4. Só depois desses três OKs (**Pedido / Valor / Aprovação**) a fiscal cria o **5000** — número que vai lançado no SAP — direto ali em Pendentes.
5. **Quem fez o recebimento volta pra aba Recebimentos**, encontra o 5000 que a fiscal deixou (aparece na mesma linha, com botão de copiar), marca o **espelho impresso** e lança a **mov. 105** — as duas ações acontecem ali, na aba Recebimentos.
6. Se alguma NF tiver problema (pedido ou valor divergente, erro na nota, etc.), isso é registrado em Divergências e **bloqueia** o 105 até ser resolvido.

---

## Telas

### 1. Dashboard
- Visão geral com números do dia (chegadas, pendentes, divergências, concluídos) — o card de "Chegaram hoje" mostra a variação em relação a ontem.
- Gráfico de **recebimentos dos últimos 7 dias** e um gráfico de **divergências por tipo** (rosca), os dois puxados dos dados reais que forem sendo lançados no sistema — sem número inventado.
- Tabela com os últimos 5 recebimentos, no mesmo formato usado em todo o sistema.

### 2. Recebimentos
- É aqui que a chegada da NF é registrada (**+ Registrar chegada**): fornecedor, número da NF e, se já souber, os três toggles de conferência (opcional nessa hora).
- Ao salvar, o sistema pula automaticamente pra aba **Pendentes**, onde a fiscal termina a conferência e cria o 5000.
- A tela mostra **tudo que chegou hoje** — tanto o que ainda está em Pendentes (linha cinza, sem 5000 ainda) quanto o que já tem 5000 — numa tabela só, com busca (NF, fornecedor ou 5000) e filtros de status.
- **É aqui que se marca espelho impresso e mov. 105**, assim que a fiscal deixar o número do 5000 — os toggles ficam direto na linha da tabela, igual ao Histórico.
- Pra ver dias anteriores, tem um link direto pro Histórico.

### 3. Pendentes
- Lista de tudo que chegou e ainda não tem 5000 (ou já tem, mas fica registrado pro levantamento do dia).
- Os três toggles — **Pedido**, **Valor**, **Aprovação** — são marcados aqui pela fiscal.
- O botão **+ Criar 5000** só libera quando os três toggles estiverem marcados.
- Ao criar o 5000, a fiscal digita o número manualmente (formato `5000` + 6 dígitos, ex: `5000867123` — é o número gerado no SAP, não o sistema que inventa).
- **O item não desaparece da lista** depois de virar 5000 — fica marcado com o selo "5000 criado: [número]" (clicável, copia o número).
- **Filtros** (Todos / Falta Pedido / Falta Valor / Falta Aprovação / Liberado p/ 5000 / Já com 5000) — pra isolar rápido quem está travando o processo e tirar um print pra cobrar quem precisa resolver.

### 4. Divergências
Duas seções:
- **Aguardando conferência do compras** — gerada automaticamente a partir dos Pendentes que ainda não têm os três OKs, mostrando o que falta (Pedido / Valor / Aprovação) e um campo livre pra anotar observação.
- **Divergências registradas** — cadastradas manualmente (**+ Registrar divergência**): NF, fornecedor, tipo (Quantidade incorreta / Material incorreto / NF divergente / Pedido incorreto / Preço divergente / Material danificado / Fornecedor incorreto / Outros), descrição e **evidências** (fotos ou documentos anexados — ficam guardados só na memória da página, como o resto dos dados). Enquanto estiver "Aberta", bloqueia o 105 daquela NF. Pode marcar como "Resolvida" quando corrigir.

### 5. Histórico (com relatório junto)
- Uma linha por recebimento (com ou sem 5000 ainda), no mesmo formato de tabela usado em todo o sistema, com **agenda mensal** ao lado: dias com recebimento aparecem com uma bolinha; clicar num dia filtra a tabela só pra aquele dia. Setas `‹ ›` trocam de mês. É aqui que ficam **todos os dias**, diferente de Recebimentos, que só mostra hoje.
- **O relatório logo abaixo da tabela acompanha o período que está sendo visto**: se você está no mês de agosto, o tempo médio e o gráfico são de agosto; se navegar pra julho, viram os números de julho; se clicar num dia específico, ficam só daquele dia.
- **Exportar CSV** — um botão pra tabela de recebimentos do período, outro pro relatório (tempos de 5000 até 105) — os dois já filtrados pelo período que estiver sendo visto.
- **Trilha de auditoria** no fim da página, com as últimas 15 atividades do sistema (quem fez o quê e quando).

### 6. Configurações
- Campo **Responsável**, pra definir o nome de quem está usando o sistema no momento (sem senha — é só identificação, não login de verdade). Esse nome é o que aparece na trilha de auditoria.

---

## Padrão visual

Toda tela que lista recebimentos (Dashboard, Recebimentos, Histórico) usa a **mesma tabela**, com as mesmas colunas fixas: **5000 · Forn. · NF · Chegou · Espelho impresso · Mov. 105 · Status**. Itens que ainda não têm 5000 (só chegaram, aguardando a fiscal) aparecem na mesma tabela com "Aguardando fiscal" no lugar do número e um clique leva direto pra Pendentes.

---

## O que ainda é só protótipo (não é sistema real ainda)

- **Sem banco de dados** — os dados vivem só na memória do navegador; fechar/recarregar a página apaga tudo, inclusive as evidências anexadas e a trilha de auditoria.
- **Sem login de verdade** — o campo "Responsável" em Configurações é só um nome digitado, sem senha nem controle de acesso; qualquer um pode mudar o nome a qualquer momento.
- **Sem integração com SAP** — nada é lançado ou lido de lá automaticamente; os campos são preenchidos manualmente.
- **Sem integração com o Arquivei** — puxar dados de NF automaticamente ainda não foi implementado (era o plano de fase 2, ver conversa anterior).

---

## Possíveis próximos passos

1. **Banco de dados real** (ex: PostgreSQL) + backend, pra persistir os dados e permitir múltiplos usuários ao mesmo tempo.
2. **Integração com Arquivei** (via API) pra puxar os dados da NF automaticamente ao invés de digitar.
3. **Integração com SAP** (fase mais avançada, depende do que o TI da empresa liberar — API/OData, exportação de relatório, ou RPA).
4. **Login de verdade**, com senha e permissões — hoje o "responsável" é só um nome digitado, sem nenhuma validação.
5. **Persistir evidências e trilha de auditoria** em disco/banco — hoje somem ao recarregar a página, junto com o resto dos dados.
