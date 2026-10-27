// Mapa da ExpoCannabis: lê data/expocannabis.json, liga os setores do desenho à lista de expositores e à busca.
(() => {
  const lista = document.getElementById('lista');
  const busca = document.getElementById('busca');
  const filtros = document.getElementById('filtros');
  const resumo = document.getElementById('resumo');
  const info = document.getElementById('setor-info');
  const setores = [...document.querySelectorAll('.planta .setor')];
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
  const naoSetorDeExpositor = (id) => id === 'cbh';
  const doSetor = (e, id) => e.setor === id || e.tambem === id;
  // "001, 024 e Lote L.O 06" → [1, 24, 6]: digitar 1 ou 001 encontra o estande 001
  const numeros = (e) => (e.estande.match(/\d+/g) || []).map(Number);

  const confere = (e, termo) => {
    if (!termo) return true;
    if (/^\d+$/.test(termo)) return numeros(e).includes(Number(termo));
    const t = semAcento(termo.replace(/^@/, ''));
    return semAcento(e.nome).includes(t) || semAcento(e.instagram || '').includes(t);
  };

  const mostrarInfo = () => {
    const s = setorAtivo && dados.setores[setorAtivo];
    info.textContent = '';
    if (!s) {
      info.append(el('h3', { text: 'Setores da feira' }),
        el('p', { text: `${dados.expositores.length} expositores confirmados na lista oficial. Toque num setor do mapa ou use os filtros da lista.` }),
        el('dl', { class: 'ficha' }, ...Object.entries(dados.setores).flatMap(([id, x]) => [
          el('dt', { text: x.nome }),
          el('dd', { text: naoSetorDeExpositor(id) ? x.onde : `${dados.expositores.filter((e) => doSetor(e, id)).length} expositores` })
        ])));
      return;
    }
    const daqui = dados.expositores.filter((e) => doSetor(e, setorAtivo));
    const nums = daqui.flatMap((e) => e.setor === setorAtivo ? numeros(e) : []).filter((n) => n < 400);
    info.append(el('p', { class: 'rotulo', text: s.onde }), el('h3', { text: s.nome }), el('p', { text: s.descricao }));
    if (nums.length) info.append(el('p', { class: 'mudo', text: `Estandes de ${String(Math.min(...nums)).padStart(3, '0')} a ${String(Math.max(...nums)).padStart(3, '0')}.` }));
    if (!naoSetorDeExpositor(setorAtivo)) info.append(el('p', {}, el('strong', { text: `${daqui.length} expositores` }), ' na lista abaixo.'));
    info.append(el('button', { type: 'button', class: 'btn sm contorno', text: 'Ver todos os setores' }));
    info.querySelector('button').addEventListener('click', () => escolher(null));
  };

  const desenharLista = () => {
    const termo = busca.value.trim();
    const filtro = setorAtivo && !naoSetorDeExpositor(setorAtivo) ? setorAtivo : null;
    const achados = dados.expositores.filter((e) => (!filtro || doSetor(e, filtro)) && confere(e, termo));
    lista.textContent = '';
    for (const e of achados) {
      const s = dados.setores[e.setor];
      lista.append(el('li', {},
        el('strong', { text: e.nome }),
        el('span', { class: `setor-tag ${e.setor}`, text: s.nome }),
        el('span', { class: 'estande', text: /^\d/.test(e.estande) ? `Estande ${e.estande}` : e.estande }),
        e.instagram && el('a', { href: `https://instagram.com/${e.instagram.replace(/^@/, '')}`, target: '_blank', rel: 'noopener', text: e.instagram })));
    }
    const onde = filtro ? ` em ${dados.setores[filtro].nome}` : '';
    resumo.textContent = achados.length
      ? `${achados.length} expositor${achados.length > 1 ? 'es' : ''}${onde}.`
      : `Nenhum expositor encontrado${onde}. Confira a grafia ou procure só pelo número do estande.`;
  };

  const escolher = (id) => {
    setorAtivo = setorAtivo === id ? null : id;
    for (const g of setores) g.setAttribute('aria-pressed', String(g.dataset.setor === setorAtivo));
    for (const b of filtros.children) b.setAttribute('aria-pressed', String((b.dataset.setor || null) === setorAtivo));
    mostrarInfo();
    desenharLista();
  };

  const montar = () => {
    for (const b of setores) {
      const id = b.dataset.setor;
      const qtd = dados.expositores.filter((e) => doSetor(e, id)).length;
      if (!naoSetorDeExpositor(id)) b.querySelector('.conta').textContent = `${qtd} expositores`;
      b.addEventListener('click', () => escolher(id));
    }
    filtros.append(el('button', { type: 'button', text: 'Todos' }),
      ...Object.entries(dados.setores).filter(([id]) => !naoSetorDeExpositor(id))
        .map(([id, s]) => el('button', { type: 'button', 'data-setor': id, text: s.nome })));
    for (const b of filtros.children) b.addEventListener('click', () => { setorAtivo = null; escolher(b.dataset.setor || null); });
    busca.addEventListener('input', desenharLista);

    const aviso = document.getElementById('estande-acucarte');
    if (dados.estande_acucarte) {
      aviso.append(el('strong', { text: 'ACUCARTE: ' }), dados.estande_acucarte);
    } else {
      aviso.append(el('strong', { text: 'Estande da ACUCARTE: ' }), 'ainda não confirmado na lista oficial. Quando sair, ele aparece aqui e no ',
        el('a', { href: 'https://instagram.com/acucarte_acuca', target: '_blank', rel: 'noopener', text: '@acucarte_acuca' }), '.');
    }
    if (dados.planta_oficial) {
      document.getElementById('aviso-planta').replaceChildren(el('strong', { text: 'Planta oficial publicada: ' }),
        el('a', { href: dados.planta_oficial, target: '_blank', rel: 'noopener', text: 'abrir a planta da organização' }),
        '. O desenho abaixo continua sendo um esquema dos setores.');
    }
    const data = new Date(`${dados.atualizado_em}T12:00:00`).toLocaleDateString('pt-BR');
    document.getElementById('fonte').append('Fonte: ',
      el('a', { href: dados.fonte_expositores, target: '_blank', rel: 'noopener', text: 'lista oficial de expositores da ExpoCannabis Brasil' }),
      `, consultada em ${data}. A organização pode mudar estandes até a feira.`);
    escolher(null);
  };

  fetch('../data/expocannabis.json')
    .then((r) => r.json())
    .then((d) => { dados = d; montar(); })
    .catch(() => { resumo.textContent = 'Não foi possível carregar a lista de expositores. Recarregue a página.'; });
})();
