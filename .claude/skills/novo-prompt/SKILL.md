---
name: novo-prompt
description: Adiciona ou edita uma direção de arte no guia de prompts de foto de produto (data/prompts.json). Use quando pedirem um prompt novo, uma variação de estilo, ou para melhorar o texto de um prompt existente.
---

# Novo prompt no guia

Os prompts ficam em `data/prompts.json` → `prompts[]`. A página `prompts/` lê esse arquivo; não há HTML para editar.

## Formato de cada item
```json
{
  "id": "vitrine-feira",                 // minúsculas e hífen; vira a âncora /prompts/#vitrine-feira
  "titulo": "Feira · banca de rua",      // em português, "Estilo · detalhe"
  "direcao": "Uma ou duas frases em português explicando o resultado e para que serve.",
  "categorias": ["produto", "pequeno"],  // produto | obra | textil | pequeno
  "formato": "4:5 (vertical)",
  "prompt": "Transform this photo of [PRODUCT] into ... {PRESERVACAO} ... 4:5 vertical format.",
  "variaveis": [{ "nome": "PRODUCT", "exemplo": "a hand-painted ceramic mug" }],
  "dicas": ["Dica prática em português."],
  "status": "em-teste",                  // só vira "aprovado" pela skill exemplo-antes-depois
  "testado_com": [],
  "exemplo": null
}
```

## Como escrever um bom prompt
- **Em inglês**, no imperativo, descrevendo como um fotógrafo de produto descreveria o set.
- Comece com `Transform this photo of [PRODUCT] into a ...` e coloque `{PRESERVACAO}` logo depois. Esse marcador é
  trocado pela regra que proíbe a IA de mudar o produto. Para obra de arte, use a frase própria de reprodução fiel (veja `galeria`).
- Ordem: cenário/fundo → luz (direção, tipo, dureza) → câmera (lente, abertura, foco) → cor/clima → o que evitar → formato.
- Seja concreto: "large softbox from the front-left at 45 degrees" em vez de "good lighting".
- Variáveis em `[MAIÚSCULAS]` para o que muda por pessoa (produto, cor, superfície, tamanho). Cada uma precisa de
  `exemplo` em inglês. Não use colchetes para outra coisa.
- Nada que mude o produto: não peça para "melhorar", "redesenhar" ou "estilizar" a peça. Só fundo, luz e enquadramento.
- Se a direção exige outro ângulo (ex.: flat lay de cima), diga nas `dicas` que a foto original precisa ter esse ângulo.

## Depois de editar
1. `node tests/validar-prompts.mjs` (confere variáveis, ids, idioma e status).
2. Abrir `/prompts/` localmente, preencher os campos do novo cartão e testar "Copiar prompt".
3. Commit e push (skill `publicar-pages`). O prompt entra como `em-teste`.
