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
2. Prepare as imagens em `assets/img/exemplos/`, como `<id>-antes.jpg` e `<id>-depois-<ia>.jpg` (ex.:
   `estudio-branco-depois-gemini.jpg`): JPG, lado maior de 1200px, qualidade ~80 e sem metadados de localização. No macOS:
   `sips -s format jpeg -s formatOptions 80 -Z 1200 entrada.png --out assets/img/exemplos/<id>-depois-gemini.jpg`
   A página mostra as fotos inteiras num quadro 4:5 (sem cortar); fotos verticais ocupam melhor o espaço.
   O guia mostra exemplos de **Gemini** e **ChatGPT** (`ias_dos_exemplos` no JSON). Os testes ficam organizados em
   `antes/` e `depois/<IA>/` na pasta de testes de quem testou.
3. Acrescente um item em `exemplos` (um por IA; com dois, a página mostra botões para alternar) e atualize o status:
   ```json
   "status": "aprovado",
   "testado_com": ["Gemini", "ChatGPT"],
   "exemplos": [
     {
       "ferramenta": "Gemini",
       "antes": "assets/img/exemplos/<id>-antes.jpg",
       "depois": "assets/img/exemplos/<id>-depois-gemini.jpg",
       "descricao": "bule de porcelana branca",
       "credito": "@perfil_da_pessoa"
     }
   ]
   ```
4. `node tests/validar-prompts.mjs`, conferir `/prompts/#<id>` localmente, depois commit e push (skill `publicar-pages`).
