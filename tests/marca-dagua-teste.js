// Teste da ferramenta de marca d'água (abrir tests/marca-dagua.html com o site servido localmente).
// Ele carrega /marca-dagua/ num iframe, mexe nos controles como uma pessoa faria e analisa os pixels das fotos
// baixadas: onde a marca apareceu, cor, opacidade, tamanho, formato do arquivo, o .zip etc.
// O resultado fica em window.__resultado = { total, falhas: [...] } para agentes lerem.
(async () => {
  const frame = document.getElementById('app');
  const lista = document.getElementById('lista');
  const resumo = document.getElementById('resumo');
  const falhas = [];
  let total = 0;
  const ok = (cond, msg, extra = '') => {
    total++;
    const li = document.createElement('li');
    li.className = cond ? 'ok' : 'falha';
    li.textContent = (cond ? '✓ ' : '✗ ') + msg + (cond || !extra ? '' : ` (${extra})`);
    lista.append(li);
    if (!cond) falhas.push(msg + (extra ? ` (${extra})` : ''));
  };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const ate = async (cond, ms = 8000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const v = cond(); if (v) return v; await espera(40); } return null; };

  // ---------- controle do app ----------
  let win, doc, form, baixados = [];
  const abrirApp = async () => {
    frame.src = '../marca-dagua/?t=' + Date.now();
    await new Promise((r) => frame.addEventListener('load', r, { once: true }));
    win = frame.contentWindow; doc = win.document; form = doc.getElementById('painel');
    // captura os downloads em vez de salvar arquivos
    baixados = [];
    win.HTMLAnchorElement.prototype.click = function () {
      if (!this.download) return;
      const item = { nome: this.download, blob: null };
      baixados.push(item);
      fetch(this.href).then((r) => r.blob()).then((b) => { item.blob = b; });
    };
    await win.document.fonts.ready;
  };
  const $ = (s) => doc.querySelector(s);
  const definir = (nome, valor) => {
    const el = form.elements[nome];
    if (el instanceof win.RadioNodeList) {
      const r = [...el].find((x) => x.value === valor);
      r.checked = true;
      r.dispatchEvent(new win.Event('change', { bubbles: true }));
      return;
    }
    if (el.type === 'checkbox') el.checked = valor; else el.value = valor;
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
    el.dispatchEvent(new win.Event('change', { bubbles: true }));
  };
  const config = (obj) => { for (const [k, v] of Object.entries(obj)) definir(k, v); };
  const miniaturas = () => doc.querySelectorAll('#miniaturas button[aria-current]').length;
  const transferir = (arquivos) => { const dt = new win.DataTransfer(); for (const f of arquivos) dt.items.add(f); return dt; };
  const enviar = async (arquivos) => {
    const antes = miniaturas();
    const input = $('#arquivos');
    input.files = transferir(arquivos).files;
    input.dispatchEvent(new win.Event('change'));
    await ate(() => miniaturas() !== antes || /Não consegui/.test($('#status').textContent));
    await espera(100);
  };
  const tirarTodas = async () => {
    while (miniaturas()) { doc.querySelector('#miniaturas button:not([aria-current])').click(); await espera(30); }
  };
  const limpar = async () => {
    $('#restaurar').click();
    if (!$('#tirarLogo').hidden) $('#tirarLogo').click();
    await tirarTodas();
  };
  const baixarAtual = async () => {
    baixados = [];
    $('#baixar').click();
    const item = await ate(() => baixados[0]?.blob && baixados[0]);
    if (!item) throw new Error('nenhum download');
    return item;
  };

  // ---------- imagens de teste ----------
  const CINZA = 0x77;
  const imagem = async (w, h, { cor = '#777777', tipo = 'image/png', nome = `foto-${w}x${h}.png`, desenho } = {}) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = cor; x.fillRect(0, 0, w, h); if (desenho) desenho(x, w, h);
    const blob = await new Promise((r) => c.toBlob(r, tipo));
    return new win.File([blob], nome, { type: tipo });
  };
  const svg = (conteudo, nome = 'logo.svg') => new win.File([conteudo], nome, { type: 'image/svg+xml' });

  // ---------- análise de pixels ----------
  const analisar = async (blob) => {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const x = c.getContext('2d'); x.drawImage(bmp, 0, 0);
    const { data } = x.getImageData(0, 0, bmp.width, bmp.height);
    const w = bmp.width, h = bmp.height;
    const celulas = Array(9).fill(0), totais = Array(9).fill(0);
    let mudados = 0, somaDif = 0, escuros = 0, pretos = 0, azuis = 0, vermelhos = 0, minX = w, minY = h, maxX = -1, maxY = -1, cx = 0, cy = 0;
    let hash = 2166136261;
    for (let y = 0; y < h; y++) {
      for (let xx = 0; xx < w; xx++) {
        const i = (y * w + xx) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
        const d = Math.max(Math.abs(r - CINZA), Math.abs(g - CINZA), Math.abs(b - CINZA));
        const cel = Math.min(2, Math.floor(3 * y / h)) * 3 + Math.min(2, Math.floor(3 * xx / w));
        totais[cel]++;
        if (i % 28 === 0) hash = Math.imul(hash ^ (r >> 3) ^ (g << 5), 16777619);
        if (d > 30) {
          mudados++; celulas[cel]++; somaDif += d; cx += xx; cy += y;
          if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
        if (r < 70 && g < 70 && b < 70) escuros++;
        if (r < 25 && g < 25 && b < 25) pretos++;
        if (b > r + 80 && b > g + 80) azuis++;
        if (r > g + 80 && r > b + 60) vermelhos++;
      }
    }
    return { w, h, mudados, somaDif, escuros, pretos, azuis, vermelhos, hash: hash >>> 0,
      celulas: celulas.map((n, i) => n / totais[i]), largura: maxX - minX, altura: maxY - minY,
      centro: mudados ? [cx / mudados, cy / mudados] : null };
  };
  const exportar = async (cfg) => { config(cfg); return analisar((await baixarAtual()).blob); };
  const maiorCelula = (a) => a.celulas.indexOf(Math.max(...a.celulas));
  const POS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];

  // ---------- leitura de ZIP ----------
  const nomesNoZip = async (blob) => {
    const b = new DataView(await blob.arrayBuffer());
    const fim = b.byteLength - 22;
    if (b.getUint32(fim, true) !== 0x06054b50) return null;
    const n = b.getUint16(fim + 10, true);
    let p = b.getUint32(fim + 16, true);
    const nomes = [];
    for (let i = 0; i < n; i++) {
      const len = b.getUint16(p + 28, true), extra = b.getUint16(p + 30, true), coment = b.getUint16(p + 32, true);
      nomes.push(new TextDecoder().decode(new Uint8Array(b.buffer, p + 46, len)));
      p += 46 + len + extra + coment;
    }
    return nomes;
  };

  try {
    await abrirApp();
    try { win.localStorage.clear(); } catch {}
    await abrirApp();

    // 1. estado inicial
    ok(!$('#soltar').hidden && $('#tela').hidden, 'sem fotos: mostra a área de soltar e esconde a prévia');
    ok($('#baixar').disabled && $('#baixarTodas').disabled, 'sem fotos: botões de baixar desabilitados');

    // 2. carregar fotos
    await enviar([await imagem(1200, 800), await imagem(600, 900)]);
    ok(miniaturas() === 2, 'carrega duas fotos de uma vez (duas miniaturas)', `miniaturas=${miniaturas()}`);
    ok(/2 fotos/.test($('#status').textContent), 'status mostra a quantidade de fotos', $('#status').textContent);
    ok(!$('#baixar').disabled && !$('#baixarTodas').disabled, 'com 2 fotos: baixar esta e baixar todas habilitados');
    ok(/preencha/i.test($('#status').textContent), 'sem texto: avisa para preencher @, site ou nome');
    await tirarTodas();
    await enviar([await imagem(1200, 800)]);
    const vazio = await analisar((await baixarAtual()).blob);
    ok(vazio.mudados === 0, 'sem texto e sem logo, a foto sai sem marca', `mudados=${vazio.mudados}`);
    ok(vazio.w === 1200 && vazio.h === 800, 'a foto baixada tem o tamanho original (1200×800)', `${vazio.w}×${vazio.h}`);

    // 3. texto: normalização do @ e do site
    config({ sombra: false });
    const h1 = (await exportar({ arroba: 'teste' })).hash;
    const h2 = (await exportar({ arroba: '@teste' })).hash;
    const h3 = (await exportar({ arroba: 'https://www.instagram.com/teste/?hl=pt' })).hash;
    ok(h1 === h2 && h2 === h3, '"teste", "@teste" e o link do Instagram viram o mesmo @teste');
    config({ arroba: '' });
    const s1 = (await exportar({ site: 'https://www.acucasp.org.br/' })).hash;
    const s2 = (await exportar({ site: 'www.acucasp.org.br' })).hash;
    ok(s1 === s2, 'o site perde o https:// e a barra do fim');
    config({ site: '', arroba: '@teste' });

    // 4. padrão único: as 9 posições
    for (const pos of POS) {
      const a = await exportar({ padrao: 'unico', posicao: pos });
      ok(maiorCelula(a) === POS.indexOf(pos), `único na posição ${pos}: a marca fica no terço certo da foto`, `célula=${POS[maiorCelula(a)]}`);
    }

    // 5. quatro cantos
    const cantos = await exportar({ padrao: 'cantos' });
    ok([0, 2, 6, 8].every((i) => cantos.celulas[i] > 0.002) && cantos.celulas[4] === 0, 'quatro cantos: marca nos 4 cantos e nada no centro',
      cantos.celulas.map((v) => v.toFixed(3)).join(' '));

    // 6. mosaico e espaçamento
    const mos = await exportar({ padrao: 'mosaico', espaco: 120 });
    ok(mos.celulas.filter((v) => v > 0.002).length >= 8, 'mosaico: marca espalhada pela foto toda', mos.celulas.map((v) => v.toFixed(3)).join(' '));
    const mosJunto = await exportar({ espaco: 20 });
    const mosLonge = await exportar({ espaco: 400 });
    ok(mosJunto.mudados > mosLonge.mudados * 1.5, 'espaçamento menor = mais repetições', `${mosJunto.mudados} vs ${mosLonge.mudados}`);
    config({ espaco: 120 });

    // 7. diagonal: escolher o padrão sugere -30°
    definir('rotacao', 0);
    definir('padrao', 'diagonal');
    ok(Number(form.elements.rotacao.value) === -30, 'ao escolher diagonal com inclinação 0, a inclinação vai para -30°', form.elements.rotacao.value);
    const diag = analisar((await baixarAtual()).blob);
    const dg = await diag;
    ok(dg.celulas.filter((v) => v > 0.002).length >= 8, 'diagonal: marca espalhada pela foto toda');
    ok(dg.hash !== mos.hash, 'diagonal é diferente do mosaico');

    // 8. faixa embaixo e em cima
    config({ rotacao: 0 });
    const faixaB = await exportar({ padrao: 'faixa', posicao: 'bc' });
    ok([6, 7, 8].every((i) => faixaB.celulas[i] > 0.1) && [0, 1, 2].every((i) => faixaB.celulas[i] === 0), 'faixa embaixo: atravessa a largura toda na parte de baixo',
      faixaB.celulas.map((v) => v.toFixed(2)).join(' '));
    const faixaT = await exportar({ posicao: 'tc' });
    ok([0, 1, 2].every((i) => faixaT.celulas[i] > 0.1) && [6, 7, 8].every((i) => faixaT.celulas[i] === 0), 'faixa em cima: atravessa a largura toda na parte de cima');
    const faixaTexto = await exportar({ posicao: 'tr' });
    ok(faixaTexto.hash !== faixaT.hash, 'faixa: a posição esquerda/centro/direita muda onde fica o texto');

    // 9. tamanho, margem, inclinação, opacidade
    config({ padrao: 'unico', posicao: 'br' });
    const peq = await exportar({ tamanho: 2 });
    const gde = await exportar({ tamanho: 10 });
    ok(gde.largura > peq.largura * 3, 'tamanho maior = texto maior', `${peq.largura}px → ${gde.largura}px`);
    config({ tamanho: 4 });
    const m0 = await exportar({ margem: 0 });
    const m15 = await exportar({ margem: 15 });
    const dist = (a) => Math.hypot(1200 - a.centro[0], 800 - a.centro[1]);
    ok(dist(m15) > dist(m0) + 80, 'distância da borda maior afasta a marca do canto', `${dist(m0).toFixed(0)} → ${dist(m15).toFixed(0)}`);
    config({ margem: 3 });
    const rot0 = await exportar({ rotacao: 0 });
    const rot45 = await exportar({ rotacao: 45, padrao: 'unico', posicao: 'mc' });
    ok(rot45.altura > rot0.altura * 2, 'inclinação gira o texto', `altura ${rot0.altura} → ${rot45.altura}`);
    config({ rotacao: 0, posicao: 'br' });
    const op100 = await exportar({ opacidade: 100 });
    const op30 = await exportar({ opacidade: 30 });
    ok(op100.somaDif > op30.somaDif * 2, 'opacidade menor = marca mais transparente');
    config({ opacidade: 70 });

    // 10. cor, presets, sombra, contorno, tarja
    const branco = await exportar({ cor: '#ffffff' });
    const verm = await exportar({ cor: '#ee3a4c' });
    ok(verm.vermelhos > 50 && branco.vermelhos === 0, 'cor vermelha pinta o texto de vermelho', `vermelhos=${verm.vermelhos}`);
    doc.querySelector('[data-cor="#121212"]').click();
    ok(form.elements.cor.value === '#121212', 'botão de cor pronta muda a cor escolhida', form.elements.cor.value);
    config({ cor: '#ffffff', sombra: false, contorno: false, opacidade: 100 });
    const semEfeito = await exportar({});
    const comContorno = await exportar({ contorno: true });
    ok(comContorno.escuros > semEfeito.escuros + 50, 'contorno: aparece borda escura em volta do texto branco', `${semEfeito.escuros} → ${comContorno.escuros}`);
    const comSombra = await exportar({ contorno: false, sombra: true });
    ok(comSombra.hash !== semEfeito.hash && comSombra.mudados > semEfeito.mudados, 'sombra: espalha um escurecido em volta do texto');
    const tarja = await exportar({ sombra: false, tarja: true, corTarja: '#000000', opTarja: 100 });
    ok(tarja.pretos > 2000 && semEfeito.pretos === 0, 'tarja: caixa preta atrás do texto', `pretos=${tarja.pretos}`);
    const tarjaClara = await exportar({ opTarja: 20 });
    ok(tarjaClara.pretos < tarja.pretos / 10, 'opacidade da tarja deixa a caixa transparente');
    config({ tarja: false, opacidade: 70, sombra: true });

    // 11. fontes, maiúsculas, ©, arranjo
    config({ nome: 'Ana Souza', site: 'ana.art.br' });
    const hashes = new Set();
    for (const f of ['montserrat-forte', 'montserrat', 'serifa', 'maquina', 'classica']) hashes.add((await exportar({ fonte: f })).hash);
    ok(hashes.size === 5, 'as 5 fontes geram resultados diferentes', `${hashes.size} diferentes`);
    config({ fonte: 'montserrat-forte' });
    const normal = await exportar({});
    ok((await exportar({ maiusculas: true })).hash !== normal.hash, 'tudo em maiúsculas muda o texto');
    config({ maiusculas: false });
    const comC = await exportar({ copyright: true });
    ok(comC.largura > normal.largura, '© e o ano deixam o texto mais comprido', `${normal.largura} → ${comC.largura}`);
    config({ copyright: false });
    const emp = await exportar({ arranjo: 'empilhado' });
    ok(emp.altura > normal.altura * 2 && emp.largura < normal.largura, 'empilhado: mais alto e mais estreito que em uma linha',
      `${normal.largura}×${normal.altura} → ${emp.largura}×${emp.altura}`);
    config({ arranjo: 'linha', nome: '', site: '' });

    // 12. logo PNG, logo SVG, remover logo
    const logoInput = $('#logo');
    logoInput.files = transferir([await imagem(200, 100, { cor: '#0000ff', nome: 'logo.png' })]).files;
    logoInput.dispatchEvent(new win.Event('change'));
    await ate(() => !$('#tirarLogo').hidden);
    config({ opacidade: 100 });
    const comLogo = await exportar({});
    ok(comLogo.azuis > 300, 'logo PNG aparece ao lado do texto', `azuis=${comLogo.azuis}`);
    ok($('#nomeLogo').textContent === 'logo.png', 'mostra o nome do arquivo do logo');
    const soLogo = await exportar({ arroba: '' });
    ok(soLogo.azuis > 300, 'só o logo, sem texto, também funciona');
    config({ arroba: '@teste' });
    logoInput.files = transferir([svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#ff0000"/></svg>')]).files;
    logoInput.dispatchEvent(new win.Event('change'));
    await ate(() => $('#nomeLogo').textContent === 'logo.svg');
    await espera(200);
    const comSvg = await exportar({});
    ok(comSvg.vermelhos > 300 && comSvg.mudados > comSvg.vermelhos, 'logo SVG (só com viewBox) aparece junto com o texto', `vermelhos=${comSvg.vermelhos}`);
    $('#tirarLogo').click();
    const semLogo = await exportar({});
    ok(semLogo.azuis === 0 && semLogo.vermelhos === 0 && $('#tirarLogo').hidden, 'remover logo tira o logo da foto');
    config({ opacidade: 70 });

    // 13. formatos e qualidade
    const fmt = async (formato, qualidade = 92) => { config({ formato, qualidade }); return baixarAtual(); };
    const jpg = await fmt('image/jpeg');
    ok(/-marca-dagua\.jpg$/.test(jpg.nome) && jpg.blob.type === 'image/jpeg', 'JPG: nome termina em -marca-dagua.jpg e o arquivo é JPEG', `${jpg.nome} ${jpg.blob.type}`);
    const png = await fmt('image/png');
    ok(/\.png$/.test(png.nome) && png.blob.type === 'image/png', 'PNG: arquivo PNG', `${png.nome} ${png.blob.type}`);
    ok(form.querySelector('[data-para-qualidade]').hidden, 'PNG esconde o controle de qualidade');
    const webp = await fmt('image/webp');
    ok(/\.webp$/.test(webp.nome) && webp.blob.type === 'image/webp', 'WEBP: arquivo WEBP', `${webp.nome} ${webp.blob.type}`);
    const q50 = await fmt('image/jpeg', 50);
    const q100 = await fmt('image/jpeg', 100);
    ok(q50.blob.size < q100.blob.size, 'qualidade menor = arquivo menor', `${q50.blob.size} < ${q100.blob.size}`);
    config({ qualidade: 92 });

    // 14. foto grande: prévia reduzida, download no tamanho original
    await tirarTodas();
    await enviar([await imagem(3000, 2000)]);
    await ate(() => $('#tela').width === 1600);
    ok($('#tela').width === 1600 && $('#tela').height === 1067, 'foto grande: prévia reduzida para 1600px', `${$('#tela').width}×${$('#tela').height}`);
    const grande = await analisar((await baixarAtual()).blob);
    ok(grande.w === 3000 && grande.h === 2000, 'foto grande: download no tamanho original (3000×2000)', `${grande.w}×${grande.h}`);
    ok(maiorCelula(grande) === 8, 'foto grande: a marca fica na mesma posição da prévia');

    // 15. baixar todas (.zip), com nomes repetidos
    await tirarTodas();
    await enviar([await imagem(800, 600, { nome: 'foto.png' }), await imagem(600, 800, { nome: 'foto.png' })]);
    baixados = [];
    $('#baixarTodas').click();
    const zip = await ate(() => baixados[0]?.blob && baixados[0], 15000);
    ok(zip && zip.nome === 'fotos-marca-dagua.zip', 'baixar todas gera fotos-marca-dagua.zip');
    const nomes = zip && await nomesNoZip(zip.blob);
    ok(nomes && nomes.length === 2 && new Set(nomes).size === 2, 'o .zip tem as 2 fotos, sem nome repetido', nomes?.join(', '));

    // 16. remover fotos
    doc.querySelector('#miniaturas button:not([aria-current])').click();
    await espera(50);
    ok(miniaturas() === 1 && $('#baixarTodas').disabled, 'remover uma foto: sobra 1 e "baixar todas" desabilita');
    await tirarTodas();
    ok(!$('#soltar').hidden && $('#tela').hidden && $('#baixar').disabled, 'remover todas: volta para a área de soltar');

    // 17. arrastar e soltar, colar
    const dtDrop = transferir([await imagem(400, 300, { nome: 'arrastada.png' })]);
    $('#palco').dispatchEvent(new win.DragEvent('drop', { dataTransfer: dtDrop, bubbles: true, cancelable: true }));
    await ate(() => miniaturas() === 1);
    ok(miniaturas() === 1, 'arrastar e soltar uma foto funciona');
    const dtCola = transferir([await imagem(400, 300, { nome: 'colada.png' })]);
    doc.dispatchEvent(new win.ClipboardEvent('paste', { clipboardData: dtCola, bubbles: true }));
    await ate(() => miniaturas() === 2);
    ok(miniaturas() === 2, 'colar uma foto (Ctrl+V) funciona');

    // 18. arquivo que não abre (HEIC de mentira)
    await enviar([new win.File(['isto não é uma foto'], 'IMG_0001.heic', { type: 'image/heic' })]);
    ok(/IMG_0001\.heic/.test($('#status').textContent) && /HEIC/.test($('#status').textContent), 'arquivo que não abre: avisa com o nome e a dica do HEIC');
    ok(miniaturas() === 2, 'arquivo que não abre não entra na lista');

    // 19. preferências guardadas e restaurar padrão
    config({ arroba: '@guardado', padrao: 'cantos', opacidade: 40, cor: '#ee3a4c', tarja: true });
    await abrirApp();
    ok(form.elements.arroba.value === '@guardado' && form.elements.padrao.value === 'cantos' && form.elements.opacidade.value === '40' &&
      form.elements.cor.value === '#ee3a4c' && form.elements.tarja.checked, 'as opções voltam iguais ao recarregar a página');
    ok($('[data-valor="opacidade"]').textContent === '40%', 'os rótulos dos controles mostram os valores guardados', $('[data-valor="opacidade"]').textContent);
    $('#restaurar').click();
    ok(form.elements.arroba.value === '' && form.elements.padrao.value === 'unico' && form.elements.opacidade.value === '70' && !form.elements.tarja.checked,
      'restaurar padrão volta às opções iniciais');
    let guardado = 'x'; try { guardado = win.localStorage.getItem('acuca-marca-dagua-v1'); } catch {}
    ok(guardado === null, 'restaurar padrão apaga as opções guardadas');

    // 20. controles que aparecem conforme o padrão
    definir('padrao', 'mosaico');
    ok(!form.querySelector('#espaco').closest('[data-para]').hidden && form.querySelector('.posicoes').closest('[data-para]').hidden,
      'mosaico mostra espaçamento e esconde posição');
    definir('padrao', 'faixa');
    ok(!form.querySelector('[data-para-tarja]').hidden, 'faixa mostra a cor e a opacidade da tarja');
    definir('padrao', 'unico');
    ok(form.querySelector('[data-para-tarja]').hidden && !form.querySelector('.posicoes').closest('[data-para]').hidden, 'único mostra posição e esconde a tarja (desligada)');
  } catch (e) {
    ok(false, 'o teste quebrou no meio', String(e && e.stack || e));
  }

  resumo.textContent = falhas.length ? `${falhas.length} falha(s) em ${total} verificações` : `Tudo OK: ${total} verificações`;
  resumo.className = falhas.length ? 'falha' : 'ok';
  window.__resultado = { total, falhas };
})();
