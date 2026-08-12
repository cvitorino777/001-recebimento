# DOCA·105 — Sistema de Recebimento

Protótipo funcional (HTML + CSS + JS puro, sem backend) para substituir a planilha de Excel do processo de recebimento de mercadorias: **Pendentes → 5000 → Espelho/Movimentação 105 → Divergências**, com painel de tempo.

Feito pra rodar direto no navegador, sem precisar de servidor. Os dados ficam só na memória da página — se recarregar, tudo zera.

---

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Estrutura da página: sidebar, telas e os modais (Registrar chegada, Criar 5000, Registrar divergência) |
| `styles.css` | Todo o visual: cores, tabela, cards, calendário, toggles |
| `app.js` | Toda a lógica: estado dos dados, regras de bloqueio, cálculo de tempo, cópia do número do 5000 |

Pra usar: baixa os três na **mesma pasta** e abre o `index.html` no navegador.

---

## O fluxo que o sistema representa

Baseado no processo real da empresa:

1. Caminhão chega, descarrega. NF e CT vão pra fiscal — **a chegada é registrada na aba Recebimentos**.
2. Isso já cria o item em **Pendentes**, pra onde o sistema pula automaticamente.
3. **Compras confere** se o pedido bate e se o valor bate, e dá a aprovação — os três toggles são marcados em Pendentes.
4. Só depois desses três OKs (**Pedido / Valor / Aprovação**) a fiscal pode gerar o **5000** — número que vai lançado no SAP.
5. O **espelho** é impresso e conferido fisicamente contra o sistema.
6. Feita a conferência, lança-se a **movimentação 105** no SAP (entrada de fato) — isso acontece na aba Histórico.
7. Se alguma NF tiver problema (pedido ou valor divergente, erro na nota, etc.), isso **bloqueia** o 105 até ser resolvido.

---

## Telas

### 1. Recebimentos
- É aqui que a chegada da NF é registrada (**+ Registrar chegada**): fornecedor, número da NF e, se já souber, os três toggles de conferência (opcional nessa hora).
- Ao salvar, o sistema pula automaticamente pra aba **Pendentes**, onde a conferência é finalizada e o 5000 é criado.
- A tela mostra **tudo que chegou hoje** — tanto o que ainda está em Pendentes quanto o que já virou 5000 — com busca (NF, fornecedor ou 5000) e os mesmos filtros de status (Pendentes / Em conferência / Concluídos / Divergências).
- Pra ver dias anteriores, tem um link direto pro Histórico.

### 2. Pendentes
- Lista de tudo que chegou e ainda não tem 5000 (ou já tem, mas fica registrado pro levantamento do dia).
- Os três toggles — **Pedido**, **Valor**, **Aprovação** — são marcados aqui.
- O botão **+ Criar 5000** só libera quando os três toggles estiverem marcados.
- Ao criar o 5000, a fiscal digita o número manualmente (formato `5000` + 6 dígitos, ex: `5000867123` — é o número gerado no SAP, não o sistema que inventa).
- **O item não desaparece da lista** depois de virar 5000 — fica marcado com o selo "5000 criado: [número]" (clicável, copia o número).
- **Filtros** (Todos / Falta Pedido / Falta Valor / Falta Aprovação / Liberado p/ 5000 / Já com 5000) — pra isolar rápido quem está travando o processo e tirar um print pra cobrar quem precisa resolver.

### 3. Histórico
- Uma linha por "5000" criado, com colunas separadas: número do 5000 (clicável — copia pra colar no SAP), Fornecedor, NF, data/hora de criação, toggle de **espelho impresso**, toggle de **mov. 105**, e status (Em andamento / Bloqueado / Concluído).
- O toggle de mov. 105 **trava automaticamente** se existir uma divergência aberta pra aquela NF — reproduz o "bloqueio" que hoje é feito manualmente na outra aba do Excel.
- **Agenda mensal** ao lado da tabela: dias com recebimento aparecem com uma bolinha; clicar num dia filtra a tabela só pra aquele dia (pra ver o que foi recebido, independente de status). Setas `‹ ›` trocam de mês. É aqui que ficam **todos os dias**, diferente de Recebimentos, que só mostra hoje.

### 4. Divergências
Duas seções:
- **Aguardando conferência do compras** — gerada automaticamente a partir dos Pendentes que ainda não têm os três OKs, mostrando o que falta (Pedido / Valor / Aprovação) e um campo livre pra anotar observação.
- **Divergências registradas** — cadastradas manualmente (**+ Registrar divergência**): NF, fornecedor, tipo (Quantidade incorreta / Material incorreto / NF divergente / Pedido incorreto / Preço divergente / Material danificado / Fornecedor incorreto / Outros), descrição e **evidências** (fotos ou documentos anexados — ficam guardados só na memória da página, como o resto dos dados). Enquanto estiver "Aberta", bloqueia o 105 daquela NF. Pode marcar como "Resolvida" quando corrigir.

### 5. Painel de tempo
- Tempo médio entre a criação do 5000 e a conclusão do 105.
- Contadores de concluídos e em andamento.
- Gráfico de barras com o tempo (em minutos) de cada recebimento concluído — substitui o cálculo manual que era feito pra gerar o gráfico no Excel.
- **Exportar CSV** com número do 5000, fornecedor, NF, data de criação/conclusão e tempo em minutos — abre direto no Excel.

### 6. Responsável e trilha de auditoria
- Em **Configurações**, dá pra definir o nome de quem está usando o sistema no momento (sem senha — é só identificação, não login de verdade).
- Toda ação relevante (criar NF pendente, criar 5000, imprimir espelho, lançar mov. 105, registrar/resolver divergência) fica registrada com data/hora e o nome do responsável.
- A trilha aparece no fim da tela de **Histórico**, com as últimas 15 atividades.
- **Exportar CSV** também disponível no Histórico, com a lista de recebimentos (respeita o filtro de dia, se houver um selecionado).

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
