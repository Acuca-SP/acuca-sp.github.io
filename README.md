# acuca-sp.github.io

Site da **ACuCa-SP** (Associação Cultural Cannábica de São Paulo) e da **ACUCARTE**, sua rama artística, com ferramentas
gratuitas para artistas. No ar em **https://acuca-sp.github.io**.

## Ferramentas
- **[Guia de prompts para foto de produto](https://acuca-sp.github.io/prompts/)**: prompts em inglês, com várias direções
  de arte, para transformar uma foto de celular em foto de estúdio usando IA de imagem. Os prompts ficam em
  [`data/prompts.json`](data/prompts.json).
- **[Marca d'água](https://acuca-sp.github.io/marca-dagua/)**: coloca @, site, nome e logo nas fotos, com vários
  padrões, posições, cores e opacidades. Roda inteira no navegador; as fotos não são enviadas para lugar nenhum.

## Como contribuir
- **Testou um prompt?** Abra uma [issue](https://github.com/Acuca-SP/acuca-sp.github.io/issues/new?title=Teste+de+prompt)
  com a foto original, o resultado e a IA que usou. Pares aprovados viram o exemplo de antes e depois do guia.
- **Rodar localmente:** `python3 -m http.server 8790` na raiz e abrir http://localhost:8790. Não há build.
- **Validar os prompts:** `node tests/validar-prompts.mjs` (também roda no GitHub Actions a cada push).

Instruções para agentes de IA (skills, agents e regras do projeto) estão em [`AGENTS.md`](AGENTS.md).

## Contato
[@acucasp](https://instagram.com/acucasp) · [@acucarte_acuca](https://instagram.com/acucarte_acuca) ·
[acucasp.org.br](https://www.acucasp.org.br) · contato@acucasp.org.br
