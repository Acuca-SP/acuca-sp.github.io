---
name: exemplo-antes-depois
description: Publica o par de fotos de antes e depois de um prompt testado e marca o prompt como aprovado. Use quando alguém enviar a foto original e o resultado gerado com um prompt do guia.
---

# Exemplo de antes e depois

Um prompt só passa para `"aprovado"` com um teste real feito por uma pessoa. **Nunca gere, edite ou invente a foto
"depois"**: ela tem que ser exatamente o que a IA devolveu para a pessoa que testou.

## O que é preciso receber
- A foto original (antes) e o resultado (depois), do mesmo produto.
- Qual IA foi usada (ex.: "ChatGPT", "Gemini") e, se possível, a data.
- Autorização da pessoa para publicar as fotos e o nome ou @ para o crédito.

Se faltar algo, pergunte. Não publique foto de alguém sem autorização.

## Passos
1. Confira o resultado: o produto continua igual ao original (cores, formas, textos, detalhes)? Se a IA mudou a peça,
   o prompt **não** é aprovado; registre o problema e ajuste o prompt (skill `novo-prompt`).
2. Prepare as imagens em `assets/img/exemplos/`, como `<id>-antes.jpg` e `<id>-depois.jpg`: JPG, lado maior de 1200px,
   qualidade ~80 e sem metadados de localização. No macOS:
   `sips -s format jpeg -s formatOptions 80 -Z 1200 entrada.png --out assets/img/exemplos/<id>-depois.jpg`
   A página mostra as fotos em 4:5 com corte central; se o produto ficar cortado, recorte antes em 4:5.
3. Atualize o item em `data/prompts.json`:
   ```json
   "status": "aprovado",
   "testado_com": ["ChatGPT"],
   "exemplo": {
     "antes": "assets/img/exemplos/<id>-antes.jpg",
     "depois": "assets/img/exemplos/<id>-depois.jpg",
     "descricao": "bolsa bordada à mão",
     "credito": "@perfil_da_pessoa",
     "ferramenta": "ChatGPT"
   }
   ```
4. `node tests/validar-prompts.mjs`, conferir `/prompts/#<id>` localmente, depois commit e push (skill `publicar-pages`).
