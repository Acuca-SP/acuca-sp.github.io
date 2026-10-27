// Guia de prompts: lê data/prompts.json e monta um cartão por direção de arte.
// Os campos [EM COLCHETES] do prompt viram campos de texto; o que a pessoa digita entra no texto copiado.
(() => {
  const lista = document.getElementById('lista');
  const STATUS = { 'aprovado': ['aprovado', 'aprovado'], 'em-teste': ['teste', 'em teste'] };
  const CATEGORIAS = { produto: 'Produtos', obra: 'Obras de arte', textil: 'Têxtil e bordado', pequeno: 'Peças pequenas' };

  const el = (tag, attrs = {}, ...filhos) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v);
    }
    for (const f of filhos.flat()) if (f != null) n.append(f);
    return n;
  };

  // texto final do prompt, com os valores digitados (ou o nome do campo entre colchetes, se vazio)
  const textoFinal = (p, valores) =>
    p.texto.replace(/\[([A-Z][A-Z ]*)\]/g, (m, nome) => (valores[nome] || '').trim() || m);

  // mesmo texto, mas com os campos destacados para a tela
  const desenharPre = (pre, p, valores) => {
    pre.textContent = '';
    let ultimo = 0;
    p.texto.replace(/\[([A-Z][A-Z ]*)\]/g, (m, nome, i) => {
      pre.append(p.texto.slice(ultimo, i));
      pre.append(el('span', { class: 'var', text: (valores[nome] || '').trim() || m }));
      ultimo = i + m.length;
      return m;
    });
    pre.append(p.texto.slice(ultimo));
  };

  const copiar = async (texto, botao) => {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const t = el('textarea', { class: 'sr-only' });
      t.value = texto; document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
    }
    const antes = botao.textContent;
    botao.textContent = 'Copiado!';
    setTimeout(() => { botao.textContent = antes; }, 1600);
  };

  const exemplo = (p) => {
    const ex = p.exemplo;
    if (!ex || !ex.antes || !ex.depois) {
      return el('div', { class: 'antes-depois' },
        el('figure', {}, el('div', { class: 'vazio', text: 'Exemplo de foto original em produção' }), el('figcaption', { text: 'Antes' })),
        el('figure', {}, el('div', { class: 'vazio', text: 'Resultado aprovado em produção' }), el('figcaption', { text: 'Depois' })));
    }
    const credito = [ex.credito && `Foto: ${ex.credito}`, ex.ferramenta && `gerado com ${ex.ferramenta}`].filter(Boolean).join(' · ');
    return el('div', {},
      el('div', { class: 'antes-depois' },
        el('figure', {}, el('img', { src: `../${ex.antes}`, alt: `Foto original: ${ex.descricao || p.titulo}`, loading: 'lazy', width: 800, height: 1000 }), el('figcaption', { text: 'Antes' })),
        el('figure', {}, el('img', { src: `../${ex.depois}`, alt: `Depois, com o prompt ${p.titulo}`, loading: 'lazy', width: 800, height: 1000 }), el('figcaption', { text: 'Depois' }))),
      credito && el('p', { class: 'dica', style: 'margin-top:6px', text: credito }));
  };

  const cartao = (p) => {
    const valores = {};
    const [classe, rotulo] = STATUS[p.status] || STATUS['em-teste'];
    const pre = el('pre', { id: `prompt-${p.id}` });
    const botaoCopiar = el('button', { type: 'button', class: 'btn sm copiar', text: 'Copiar prompt' });
    botaoCopiar.addEventListener('click', () => copiar(textoFinal(p, valores), botaoCopiar));

    const campos = p.variaveis.map((v) => {
      const id = `${p.id}-${v.nome.toLowerCase().replace(/\s+/g, '-')}`;
      const input = el('input', { type: 'text', id, placeholder: `ex.: ${v.exemplo}`, autocomplete: 'off', spellcheck: 'false', lang: 'en' });
      input.addEventListener('input', () => { valores[v.nome] = input.value; desenharPre(pre, p, valores); });
      return el('div', { class: 'campo' }, el('label', { for: id, text: `[${v.nome}]` }), input);
    });
    desenharPre(pre, p, valores);

    const ficha = el('dl', { class: 'ficha' },
      el('dt', { text: 'Indicado para' }), el('dd', { text: p.categorias.map((c) => CATEGORIAS[c]).filter(Boolean).join(', ') }),
      el('dt', { text: 'Formato' }), el('dd', { text: p.formato }),
      el('dt', { text: 'Testado com' }), el('dd', { text: p.testado_com.length ? p.testado_com.join(', ') : 'ainda em teste' }));

    return el('article', { class: 'cartao prompt', id: p.id, 'data-categorias': p.categorias.join(' ') },
      el('header', {}, el('h3', { text: p.titulo }), el('span', { class: `selo ${classe}`, text: rotulo })),
      el('p', { style: 'margin:0', text: p.direcao }),
      el('div', { class: 'grade g2', style: 'gap:24px' },
        exemplo(p),
        el('div', { class: 'grade', style: 'gap:14px;align-content:start' },
          ficha,
          p.variaveis.length ? el('div', { class: 'grade', style: 'gap:10px' }, el('p', { class: 'dica', text: 'Preencha em inglês. O texto abaixo atualiza na hora.' }), campos) : null,
          el('div', { class: 'codigo' }, pre, botaoCopiar),
          p.dicas.length ? el('ul', { class: 'dica', style: 'margin:0;padding-left:18px' }, p.dicas.map((d) => el('li', { text: d }))) : null)));
  };

  const filtrar = (cat) => {
    for (const b of document.querySelectorAll('[data-filtro]')) b.setAttribute('aria-pressed', String(b.dataset.filtro === cat));
    for (const c of lista.querySelectorAll('.prompt')) c.hidden = !!cat && !c.dataset.categorias.split(' ').includes(cat);
  };

  fetch('../data/prompts.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((dados) => {
      lista.textContent = '';
      for (const p of dados.prompts) {
        p.texto = p.prompt.replace('{PRESERVACAO}', dados.regra_de_preservacao);
        lista.append(cartao(p));
      }
      for (const b of document.querySelectorAll('[data-filtro]')) b.addEventListener('click', () => filtrar(b.dataset.filtro));
      if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
    })
    .catch(() => { lista.innerHTML = '<p class="aviso">Não foi possível carregar os prompts. Recarregue a página.</p>'; });
})();
