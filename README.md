# Cotação PV

Checkout de cotação **white label** para associações de proteção veicular, integrado ao **Power CRM**. Um único sistema atende vários clientes: cada associação tem a própria marca, as próprias regras de aceitação e a própria tabela de preço, e cada cotação é criada e atualizada no Power CRM dela.

## Fluxo do cliente final

1. **Contato:** nome e telefone. O lead já vai para o CRM aqui, para recuperar quem abandona.
2. **Veículo:** tipo, uso (particular, aplicativo, táxi), placa ou seleção pela FIPE, cidade/UF e cupom.
   Checa se o veículo e a cidade são aceitos e calcula o preço.
3. **Plano:** mostra os planos com mensalidade e adesão.
4. **Dados:** e-mail, CPF e endereço (CEP preenche pelo ViaCEP).
5. **Concluído:** botão para o WhatsApp da associação com o número da cotação.

A cada etapa a cotação é atualizada no CRM. Se o CRM falhar, o cliente segue e o erro fica registrado no lead.

## Rodando

```bash
npm install
cp .env.example .env.local
npm run dev
```

- http://localhost:3000 lista os clientes configurados.
- http://localhost:3000/demo/cotacao é o checkout do cliente de demonstração.
- http://localhost:3000/demo/painel mostra os leads e exatamente o que foi enviado ao Power CRM.
  Em produção exige `PAINEL_CHAVE` (`/demo/painel?chave=...`).

Placas de exemplo no modo simulado: `ABC1D23`, `BRA2E19`, `MOT0A12`. Qualquer outra cai na seleção pela FIPE.

```bash
npm test          # testes de preço, aceitação, validações e fluxo completo
npm run typecheck
```

## Estrutura

| Caminho | O que é |
| --- | --- |
| `src/tenants/` | Configuração de cada cliente: marca, regras, planos e tabela de preço. |
| `src/lib/pricing.ts` | Motor de preço: faixa FIPE x plano, multiplicador por UF e por uso, adesão, cupom. |
| `src/lib/acceptance.ts` | Regras de aceitação de veículo e cidade. |
| `src/lib/checkout.ts` | Regras de cada etapa do checkout (validação, ordem das etapas, sincronização). |
| `src/lib/crm/` | Integração com o CRM. `power-mapping.ts` monta os dados, `power-mock.ts` simula, `power-api.ts` é o conector real. |
| `src/lib/vehicles/` | Consulta de placa e tabela FIPE (simulada ou pela API pública parallelum). |
| `src/lib/store.ts` | Armazenamento provisório em memória. |
| `src/app/api/[tenant]/` | API usada pelo checkout. |
| `src/app/[tenant]/cotacao` | Tela do checkout. |
| `src/proxy.ts`, `src/lib/routing.ts` | Reconhecimento do cliente pelo domínio. |

## Adicionar um cliente

1. Copie `src/tenants/demo.ts` para `src/tenants/<slug>.ts` e ajuste marca, regras, planos e preços.
2. Registre em `src/tenants/index.ts`.
3. Coloque o token da Power API desse cliente na variável indicada em `crm.tokenEnv`.

## Integração com o Power CRM

- `CRM_MODE=mock` (padrão): nada sai do sistema; o painel mostra o que seria enviado.
- `CRM_MODE=power`: usa `src/lib/crm/power-api.ts`.

**Pendente de confirmação na documentação da Power API** (marcado com `TODO(power)` no código):
- caminhos de "cadastro de cotação" e "alterar cotação";
- formato do cabeçalho de autenticação;
- nomes dos campos (hoje seguem o formulário dinâmico público do Power, `pwrVhclPlts`, `pwrAssocNm` etc.);
- onde a resposta traz o id da cotação;
- se dá para ler planos e tabelas de preço pela API (aí `src/tenants` passa a ser alimentado pelo Power).

## Publicar no domínio do cliente

Uma única instalação atende todos os clientes. Cada cliente lista os seus domínios em `domains`
(`src/tenants/<slug>.ts`) e o sistema reconhece o cliente pelo domínio da requisição (`src/proxy.ts`).
O mesmo cliente pode usar os dois formatos ao mesmo tempo.

**Opção A, subdomínio (recomendada): `cotacao.cliente.com.br`**

1. Adicione `cotacao.cliente.com.br` em `domains` do cliente.
2. No DNS do cliente, crie um `CNAME` de `cotacao` apontando para o endereço da nossa hospedagem.
3. Adicione o domínio na hospedagem para gerar o certificado HTTPS.

Funciona com qualquer site do cliente, inclusive os feitos em construtores (Wix, Base44, WordPress hospedado etc.).

**Opção B, caminho no site do cliente: `cliente.com.br/cotacao`**

Só funciona se o servidor ou a CDN do site do cliente puder repassar um caminho para outro endereço.

1. Adicione `cliente.com.br` (e `www.cliente.com.br`, se usar) em `domains`.
2. Na nossa hospedagem, defina `ASSET_PREFIX` com o nosso endereço (ex.: `https://app.cotacaopv.com.br`),
   para os arquivos JS/CSS virem de nós e não do site do cliente.
3. No site do cliente, repasse `/cotacao` e tudo abaixo dele para nós, mantendo o caminho e enviando o domínio
   original em `X-Forwarded-Host`. Exemplo em nginx:

```nginx
location /cotacao {
    proxy_pass https://app.cotacaopv.com.br;
    proxy_set_header Host app.cotacaopv.com.br;
    proxy_set_header X-Forwarded-Host $host;
    proxy_ssl_server_name on;
}
```

Com Cloudflare, o mesmo se faz com uma regra de Worker ou Origin Rule no caminho `/cotacao*`.

**O que o sistema faz em cada caso**

| Endereço | Vai para |
| --- | --- |
| `cotacao.cliente.com.br/` | checkout do cliente |
| `cliente.com.br/cotacao` | checkout do cliente |
| `.../api/...` ou `.../cotacao/api/...` | API do próprio cliente (nunca a de outro) |
| `.../painel` ou `.../cotacao/painel` | painel do cliente |
| `/<outro-cliente>/...` no domínio de um cliente | 404 |

Para testar localmente sem DNS: `curl -H "Host: cotacao.protegedemo.com.br" http://localhost:3000/`.

## Próximos passos

- Confirmar a Power API e ligar o conector real.
- Importar as tabelas de preço do Power.
- Trocar o armazenamento em memória por Postgres (Supabase) e criar o painel com login.
- Contratar um serviço de consulta de placa.
- Fase 2: pagamento (PIX/cartão), vistoria pelo celular, documentos e contrato.

## Demonstração sem servidor

`npm run demo` gera `dist-demo/index.html`, um único arquivo com o checkout inteiro rodando no navegador
(as rotas `/api` são atendidas na própria página, com as mesmas regras e o Power simulado). Serve para mostrar
o fluxo para clientes sem precisar de hospedagem.
