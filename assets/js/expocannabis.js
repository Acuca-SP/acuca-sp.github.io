// Mapa da ExpoCannabis: lê data/expocannabis.json, monta os cartões dos setores e a lista de expositores com busca.
(() => {
  const lista = document.getElementById('lista');
  const busca = document.getElementById('busca');
  const filtros = document.getElementById('filtros');
  const resumo = document.getElementById('resumo');
  const caixaSetores = document.getElementById('setores');
  let dados, setorAtivo = null;

  const el = (tag, attrs = {}, ...filhos) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v);
    }
    for (const f of filhos.flat()) if (f != null) n.append(f);
    return n;
  };

  const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const doSetor = (e, id) => e.setor === id || e.tambem === id;
  // "001, 024, Lote L.O 06" → [1, 24, 6]: digitar 1 ou 001 encontra o estande 001
  const numeros = (e) => (e.estande.match(/\d+/g) || []).map(Number);

  const confere = (e, termo) => {
    if (!termo) return true;
    if (/^\d+$/.test(termo)) return numeros(e).includes(Number(termo));
    const t = semAcento(termo.replace(/^@/, ''));
    return semAcento(e.nome).includes(t) || semAcento(e.instagram || '').includes(t);
  };

  const desenharLista = () => {
    const termo = busca.value.trim();
    const achados = dados.expositores.filter((e) => (!setorAtivo || doSetor(e, setorAtivo)) && confere(e, termo));
    lista.textContent = '';
    for (const e of achados) {
      lista.append(el('li', {},
        el('strong', { text: e.nome }),
        el('span', { class: `setor-tag ${e.setor}`, text: dados.setores[e.setor].nome }),
        el('span', { class: 'estande', text: /^\d/.test(e.estande) ? `Estande ${e.estande}` : e.estande }),
        e.instagram && el('a', { href: `https://instagram.com/${e.instagram.replace(/^@/, '')}`, target: '_blank', rel: 'noopener', text: e.instagram })));
    }
    const onde = setorAtivo ? ` em ${dados.setores[setorAtivo].nome}` : '';
    resumo.textContent = achados.length
      ? `${achados.length} expositor${achados.length > 1 ? 'es' : ''}${onde}.`
      : `Nenhum expositor encontrado${onde}. Confira a grafia ou procure só pelo número do estande.`;
  };

  const escolher = (id) => {
    setorAtivo = id;
    for (const b of filtros.children) b.setAttribute('aria-pressed', String((b.dataset.setor || null) === setorAtivo));
    desenharLista();
  };

  const montarSetores = () => {
    for (const [id, s] of Object.entries(dados.setores)) {
      const daqui = dados.expositores.filter((e) => doSetor(e, id));
      const botao = el('button', { type: 'button', class: 'btn sm', text: `Ver os ${daqui.length} expositores` });
      botao.addEventListener('click', () => {
        busca.value = '';
        escolher(id);
        document.getElementById('expositores').scrollIntoView();
      });
      caixaSetores.append(el('article', { class: `setor-cartao ${id}` },
        el('p', { class: 'setor-onde', text: s.onde }),
        el('h3', { text: s.nome }),
        el('p', { class: 'setor-numeros' }, el('strong', { text: `${daqui.length}` }), ' expositores'),
        el('p', { text: s.descricao }),
        botao));
    }
  };

  const montar = () => {
    montarSetores();
    filtros.append(el('button', { type: 'button', text: 'Todos' }),
      ...Object.entries(dados.setores).map(([id, s]) => el('button', { type: 'button', 'data-setor': id, text: s.nome })));
    for (const b of filtros.children) b.addEventListener('click', () => escolher(b.dataset.setor || null));
    busca.addEventListener('input', desenharLista);

    const aviso = document.getElementById('estande-acucarte');
    if (dados.estande_acucarte) {
      aviso.append(el('strong', { text: 'ACUCARTE: ' }), dados.estande_acucarte);
    } else {
      aviso.append(el('strong', { text: 'Estande da ACUCARTE: ' }), 'ainda não está na lista oficial. Quando sair, ele aparece aqui e no ',
        el('a', { href: 'https://instagram.com/acucarte_acuca', target: '_blank', rel: 'noopener', text: '@acucarte_acuca' }), '.');
    }
    const data = new Date(`${dados.atualizado_em}T12:00:00`).toLocaleDateString('pt-BR');
    document.getElementById('fonte').append('Fonte: ',
      el('a', { href: dados.fonte_expositores, target: '_blank', rel: 'noopener', text: 'lista oficial de expositores da ExpoCannabis Brasil' }),
      `, consultada em ${data}.`);
    escolher(null);
  };

  fetch('../data/expocannabis.json')
    .then((r) => r.json())
    .then((d) => { dados = d; montar(); })
    .catch(() => { resumo.textContent = 'Não foi possível carregar a lista de expositores. Recarregue a página.'; });
})();
