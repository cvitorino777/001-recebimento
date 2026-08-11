# DOCA·105 — Sistema de Recebimento

Protótipo funcional (HTML + CSS + JS puro, sem backend) para substituir a planilha de Excel do processo de recebimento de mercadorias: **Pendentes → 5000 → Espelho/Movimentação 105 → Divergências**, com painel de tempo.

Feito pra rodar direto no navegador, sem precisar de servidor. Os dados ficam só na memória da página — se recarregar, tudo zera.

---

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Estrutura da página: sidebar, telas e os modais (Nova NF pendente, Criar 5000, Registrar divergência) |
| `styles.css` | Todo o visual: cores, tabela, cards, calendário, toggles |
| `app.js` | Toda a lógica: estado dos dados, regras de bloqueio, cálculo de tempo, cópia do número do 5000 |

Pra usar: baixa os três na **mesma pasta** e abre o `index.html` no navegador.

---

## O fluxo que o sistema representa

Baseado no processo real da empresa:

1. Caminhão chega, descarrega. NF e CT vão pra fiscal.
2. **Compras confere** se o pedido bate e se o valor bate, e dá a aprovação.
3. Só depois desses três OKs (**Pedido / Valor / Aprovação**) a fiscal pode gerar o **5000** — número que vai lançado no SAP.
4. O **espelho** é impresso e conferido fisicamente contra o sistema.
5. Feita a conferência, lança-se a **movimentação 105** no SAP (entrada de fato).
6. Se alguma NF tiver problema (pedido ou valor divergente, erro na nota, etc.), isso **bloqueia** o 105 até ser resolvido.

---

## Telas

### 1. Pendentes
- Cadastro de NF (**+ Nova NF pendente**): fornecedor, número da NF, número do pedido (opcional).
- No cadastro já dá pra marcar os três toggles — **Pedido**, **Valor**, **Aprovação** — mas não é obrigatório marcar tudo pra salvar; dá pra completar depois.
- O botão **+ Criar 5000** só libera quando os três toggles estiverem marcados.
- Ao criar o 5000, a fiscal digita o número manualmente (formato `5000` + 6 dígitos, ex: `5000867123` — é o número gerado no SAP, não o sistema que inventa).
- **O item não desaparece da lista** depois de virar 5000 — fica marcado com o selo "5000 criado: [número]" (clicável, copia o número). Isso permite, no fim do dia, levantar quais fornecedores/NFs passaram pela conferência.

### 2. Recebimentos
- Uma linha por "5000" criado, com colunas separadas: número do 5000 (clicável — copia pra colar no SAP), Fornecedor, NF, data/hora de criação, toggle de **espelho impresso**, toggle de **mov. 105**, e status (Em andamento / Bloqueado / Concluído).
- O toggle de mov. 105 **trava automaticamente** se existir uma divergência aberta pra aquela NF — reproduz o "bloqueio" que hoje é feito manualmente na outra aba do Excel.
- **Agenda mensal** ao lado da tabela: dias com recebimento aparecem com uma bolinha; clicar num dia filtra a tabela só pra aquele dia (pra ver o que foi recebido, independente de status). Setas `‹ ›` trocam de mês.

### 3. Divergências
Duas seções:
- **Aguardando conferência do compras** — gerada automaticamente a partir dos Pendentes que ainda não têm os três OKs, mostrando o que falta (Pedido / Valor / Aprovação) e um campo livre pra anotar observação.
- **Divergências registradas** — cadastradas manualmente (**+ Registrar divergência**): NF, fornecedor, tipo (Pedido divergente / Valor divergente / NF com erro / Outro motivo) e descrição. Enquanto estiver "Aberta", bloqueia o 105 daquela NF. Pode marcar como "Resolvida" quando corrigir.

### 4. Painel de tempo
- Tempo médio entre a criação do 5000 e a conclusão do 105.
- Contadores de concluídos e em andamento.
- Gráfico de barras com o tempo (em minutos) de cada recebimento concluído — substitui o cálculo manual que era feito pra gerar o gráfico no Excel.

---

## O que ainda é só protótipo (não é sistema real ainda)

- **Sem banco de dados** — os dados vivem só na memória do navegador; fechar/recarregar a página apaga tudo.
- **Sem login/usuários** — não distingue quem é fiscal, compras, etc.
- **Sem integração com SAP** — nada é lançado ou lido de lá automaticamente; os campos são preenchidos manualmente.
- **Sem integração com o Arquivei** — puxar dados de NF automaticamente ainda não foi implementado (era o plano de fase 2, ver conversa anterior).

---

## Possíveis próximos passos

1. **Banco de dados real** (ex: PostgreSQL) + backend, pra persistir os dados e permitir múltiplos usuários ao mesmo tempo.
2. **Integração com Arquivei** (via API) pra puxar os dados da NF automaticamente ao invés de digitar.
3. **Integração com SAP** (fase mais avançada, depende do que o TI da empresa liberar — API/OData, exportação de relatório, ou RPA).
4. **Controle de usuário/login**, pra saber quem fez cada lançamento.
5. **Exportar relatórios** (ex: PDF/Excel) do painel de tempo e do levantamento de fornecedores do dia.
