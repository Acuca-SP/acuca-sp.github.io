---
name: publicar-pages
description: Verifica, commita e envia alterações do site acuca-sp.github.io e confere a publicação no GitHub Pages. Use ao terminar qualquer mudança neste repositório.
---

# Publicar no GitHub Pages

O push na `main` publica o site automaticamente (GitHub Pages, sem build). Por isso a verificação vem antes do push.

1. **Validar dados:** `node tests/validar-prompts.mjs` → precisa de ✓.
2. **Ver localmente:** `python3 -m http.server 8790` na raiz e abrir as páginas alteradas em http://localhost:8790,
   no desktop e em 375px. Console sem erros. Se mexeu na marca d'água: carregar foto, testar os cinco padrões,
   baixar uma foto e o .zip.
3. **Commit:** mensagem curta em português dizendo o que mudou, por exemplo `Marca d'água: padrão "cantos"`.
   Nunca inclua fotos de pessoas sem autorização nem arquivos fora do site (rascunhos, `.DS_Store`).
4. **Push:** `git push`.
5. **Conferir no ar:** `gh api repos/Acuca-SP/acuca-sp.github.io/pages/builds/latest --jq .status` até ficar `built`
   (cerca de 1 minuto). Depois abra https://acuca-sp.github.io e confirme a mudança (recarregue sem cache).
   Se o status for `errored`, veja `gh api repos/Acuca-SP/acuca-sp.github.io/pages/builds/latest --jq .error`.
