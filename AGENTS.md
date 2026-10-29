# acuca-sp.github.io: instruções para agentes

Site público da ACuCa-SP e da ACUCARTE no GitHub Pages: apresentação da associação e do coletivo, e ferramentas
gratuitas para artistas. Publicado em https://acuca-sp.github.io a partir da branch `main` (sem etapa de build).

## Regras
- **Idioma:** textos do site, commits e documentação em português do Brasil. **Os prompts (`data/prompts.json` → `prompt`) são em inglês.**
- **Toda alteração vira commit e vai para o GitHub (`git push`) logo em seguida.** Commits pequenos, mensagem em português
  dizendo o que mudou (ex.: `Prompts: nova direção "vitrine de feira"`). O push na `main` publica o site em ~1 minuto.
- **Site estático puro:** HTML, CSS e JavaScript sem framework, sem build e sem dependências de npm. Não adicione bundler.
  Bibliotecas externas, só se não houver alternativa simples (o ZIP da marca d'água é próprio, em `assets/js/zip.js`).
- **Privacidade:** a ferramenta de marca d'água nunca envia fotos para servidor. Nada de analytics, rastreadores ou
  chamadas de rede com dados de quem usa. `localStorage` só guarda as preferências do formulário.
- **Honestidade nos prompts:** um prompt só fica `"aprovado"` depois de testado por uma pessoa, com o par real de
  antes/depois em `assets/img/exemplos/` e a IA usada em `testado_com`. Nunca invente resultado nem gere "depois" falso.
- **Identidade visual:** preto `#121212`, vermelho `#ee3a4c`, branco e gelo `#f4f1ec`; títulos em Noto Serif itálica,
  texto em Montserrat (tokens em `assets/css/style.css`). Siga o que já existe.
- Acessibilidade: rótulos em todos os campos, foco visível, contraste AA, `alt` em imagens, funciona no celular (375px).
- **Links abrem em outra aba:** todo `<a>` leva `target="_blank" rel="noopener"`, menos as âncoras da mesma página (`href="#..."`).
- **Imagens sem metadados:** antes de commitar imagem nova, rode `exiftool -all= -overwrite_original <arquivo>`.
  Não grave dados inventados (câmera, data, autor) nos arquivos: os "depois" dos exemplos são gerados por IA e o site diz isso.
- **Cache:** o GitHub Pages guarda CSS e JS por 10 minutos. Mudou `assets/css` ou `assets/js`? Troque o `?v=AAAAMMDDhhmm`
  nos `<link>`/`<script>` de todas as páginas, senão quem já visitou vê a página nova com o CSS velho (layout quebrado).

## Estrutura
| Caminho | O que é |
| --- | --- |
| `index.html` | Apresentação da ACuCa e da ACUCARTE e cartões das ferramentas |
| `prompts/` + `assets/js/prompts.js` | Guia de prompts; os dados vêm de `data/prompts.json` |
| `data/prompts.json` | Prompts, direções de arte, variáveis `[EM COLCHETES]`, status e exemplos. `{PRESERVACAO}` é trocado por `regra_de_preservacao` |
| `marca-dagua/` + `assets/js/marca-dagua.js` | Ferramenta de marca d'água (canvas; prévia reduzida, exportação no tamanho original) |
| `assets/js/zip.js` | ZIP sem compressão usado no "Baixar todas" |
| `assets/img/exemplos/` | Pares de antes e depois dos prompts (`<id>-antes.jpg`, `<id>-depois-<ia>.jpg`), com exemplos de Gemini e ChatGPT |
| `tests/validar-prompts.mjs` | Validação do `prompts.json` (roda também no GitHub Actions) |
| `tests/marca-dagua.html` | Teste da marca d'água no navegador: mexe em todas as opções e confere os pixels das fotos baixadas (70 verificações) |
| `assets/img/marca-dagua/` | Exemplos da página inicial, gerados na própria ferramenta |
| `expocannabis/` + `assets/js/expocannabis.js` | Mapa da ExpoCannabis 2026: setores da feira (esquema) e busca de expositores |
| `letramento/` | Seção Autogestão e letramento digital: índice dos artigos e um artigo por pasta (`letramento/<slug>/index.html`) |
| `data/expocannabis.json` | Setores, expositores e estandes copiados da lista oficial (`fonte_expositores`, `atualizado_em`). `planta_oficial` e `estande_acucarte` ficam `null` até a organização publicar |

## Verificar antes de publicar
1. `node tests/validar-prompts.mjs` precisa terminar com ✓.
2. Servir localmente: `python3 -m http.server 8790` na raiz do repositório e abrir http://localhost:8790.
3. Conferir no navegador a página alterada, no desktop e em 375px de largura, e o console sem erros.
4. Mexeu na marca d'água? Abrir http://localhost:8790/tests/marca-dagua.html com a aba visível e esperar o
   resumo "Tudo OK". O resultado também fica em `window.__resultado` (`{ total, falhas }`) para agentes lerem.
   Acrescente verificações lá ao criar opção nova.

## Skills e agents
- `.claude/skills/novo-prompt`: adicionar ou editar uma direção de arte no guia.
- `.claude/skills/exemplo-antes-depois`: publicar o par de fotos testado e aprovar o prompt.
- `.claude/skills/publicar-pages`: verificar, commitar, enviar e conferir o site no ar.
- `.claude/agents/revisor-conteudo.md`: revisa textos, prompts, identidade visual e acessibilidade.
- `.claude/agents/testador-ferramentas.md`: testa as páginas e as ferramentas no navegador e relata o que quebrou.

## Contexto
- ACuCa-SP: Associação Cultural Cannábica de São Paulo, desde 2012, formalizada em 2017; organiza a Marcha da Maconha SP.
- ACUCARTE: rama artística da ACuCa; 28 artistas e 4 marcas/projetos; direção artística de Rafael Roque, curadoria de Gabi Mazzariello.
- **Letramento digital:** todo dado com fonte e link na seção Fontes, data em que foi conferido no topo, os dois lados quando há disputa e nada afirmado sem documento (ex.: não acusar empresa de lobby sem registro). Artigo novo entra no índice `letramento/index.html` e no menu só se for seção nova.
- **Mapa da Expo:** o desenho é esquemático. Não invente posição de estande nem planta; atualize a lista pela página oficial de expositores e troque `atualizado_em`.
- Site institucional e loja: repositório privado `Acuca-SP/acuca-site` (Astro + Cloudflare), em https://www.acucasp.org.br.
