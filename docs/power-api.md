# Power API: o que usamos

Fonte: documentação oficial em https://power-crm.readme.io (link do próprio Power em
Minha empresa > Plugins > Power API). Lida em 27/11/2026.

- Base: `https://api.powercrm.com.br`
- Autenticação: `Authorization: Bearer <token>`. O token é criado em Minha empresa > Plugins > Power API > Adicionar.
  Sem token a API responde 401.

## Fluxo de cotação

| Passo | Chamada | Observação |
| --- | --- | --- |
| Criar cotação | `POST /api/quotation/add` | Só `name` é obrigatório. Aceita `phone`, `email`, `plts` (placa), `mdl`, `mdlYr`, `city`, `coop`, `origemId`, `leadSource`, `slsmnId`, `workVehicle`, `discount`. A resposta traz `quotationResponse.quotationCode`. |
| Atualizar cotação | `POST /api/quotation/update` | `code` obrigatório. Aceita veículo (`mdl`, `mdlYr`, `plates`, `chassi`, `fuel`...), endereço (`addressZipcode`, `addressAddress`...), `fullName`, `registration` (CPF), `email` e `tppId` (plano escolhido). |
| Planos e preços | `GET /api/quotation/plansQuotation?quotationCode=` | **O Power calcula o preço** com as tabelas da associação. Retorna `acquisitionPrice` (adesão), `monthlyPrice` e `plans[]` com `planId`, `name`, `tablePricePlanId`, `price`, `coverages`, `assistances`, `benefits`. |
| FIPE da cotação | `GET /api/quotation/quotationFipeApi?quotationCode=` | |
| Consultar | `GET /api/quotation/{quotationCode}` | |
| Mover no funil | `POST /api/quotation/card/move?quotationCode=&cardColumn=` | |
| Observação | `POST /api/quotation/send-observation?quotationCode=&observation=` | |

## Catálogo (ids do Power)

| Dado | Chamada |
| --- | --- |
| Marcas | `GET /api/quotation/cb?type=` (1 carro/utilitário, 2 moto, 3 caminhão) |
| Anos da marca | `GET /api/quotation/bmy?cb=` |
| Modelos da marca no ano | `GET /api/quotation/cmby?cb=&cy=` |
| Estados | `GET /api/quotation/stt` |
| Cidades | `GET /api/quotation/ct?st=` |

Todos devolvem `[{ id, text }]`. A ordem é marca, depois **ano**, depois modelo.

## Conta de teste (VIX Benefícios)

- Cooperativa: `VIX BENEFICIOS E SOCORRO MUTUO`, id `11778`.

## Suposições a confirmar no primeiro teste com token

- `plans[].price` é a mensalidade do plano e `acquisitionPrice` é a taxa de adesão.
- `tppId` da atualização recebe o `tablePricePlanId` do plano escolhido.
- O Power devolve `plans` vazio quando o veículo ou a cidade não são aceitos.
