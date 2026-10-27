// Marca d'água: tudo roda no navegador. As fotos são lidas com URL.createObjectURL e
// nunca são enviadas. A prévia é desenhada em escala reduzida e o download no tamanho original,
// com as mesmas proporções (tudo é calculado em % do menor lado da foto).
(() => {
  const $ = (s) => document.querySelector(s);
  const form = $('#painel');
  const tela = $('#tela');
  const ctx = tela.getContext('2d');
  const palco = $('#palco');
  const soltar = $('#soltar');
  const entrada = $('#arquivos');
  const miniaturas = $('#miniaturas');
  const status = $('#status');
  const CHAVE = 'acuca-marca-dagua-v1';
  const PREVIA_MAX = 1600;

  const FONTES = {
    'montserrat-forte': (px) => `800 ${px}px Montserrat, Arial, sans-serif`,
    'montserrat': (px) => `400 ${px}px Montserrat, Arial, sans-serif`,
    'serifa': (px) => `italic 700 ${px}px "Noto Serif", Georgia, serif`,
    'maquina': (px) => `700 ${px}px "Courier New", Courier, monospace`,
    'classica': (px) => `400 ${px}px Georgia, "Times New Roman", serif`,
  };
  const UNIDADE = { tamanho: '%', margem: '%', espaco: '%', rotacao: '°', opacidade: '%', opTarja: '%', qualidade: '%' };
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

  let fotos = [];   // { nome, img, w, h, url }
  let atual = -1;
  let logo = null;  // { img, w, h, url, nome }
  let aviso = '';   // fotos que não abriram na última leva

  // ---------- configurações (formulário <-> objeto) ----------
  const ler = () => {
    const s = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'checkbox') s[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) s[el.name] = el.value; }
      else if (el.type === 'range') s[el.name] = Number(el.value);
      else s[el.name] = el.value;
    }
    return s;
  };
  const aplicar = (s) => {
    for (const el of form.elements) {
      if (!el.name || !(el.name in s)) continue;
      if (el.type === 'checkbox') el.checked = !!s[el.name];
      else if (el.type === 'radio') el.checked = el.value === s[el.name];
      else el.value = s[el.name];
    }
  };
  const PADRAO = ler();
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(ler())); } catch {} };
  const restaurarSalvo = () => {
    try { const s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (s) aplicar(s); } catch {}
  };

  // ---------- texto ----------
  const linhas = (s) => {
    let arroba = s.arroba.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '');
    if (arroba && !arroba.startsWith('@')) arroba = '@' + arroba;
    const site = s.site.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
    const partes = [s.nome.trim(), arroba, site].filter(Boolean);
    if (s.copyright) {
      const ano = new Date().getFullYear();
      if (partes.length) partes[0] = `© ${ano} ${partes[0]}`; else partes.push(`© ${ano}`);
    }
    let ls = s.arranjo === 'empilhado' ? partes : (partes.length ? [partes.join('  ·  ')] : []);
    if (s.maiusculas) ls = ls.map((t) => t.toLocaleUpperCase('pt-BR'));
    return ls;
  };

  const contraste = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#000000' : '#ffffff';
  };

  // mede o bloco (logo + texto, com a folga da tarja) para um tamanho de fonte em px
  const medir = (c, s, px) => {
    const ls = linhas(s);
    c.font = FONTES[s.fonte](px);
    const lh = px * 1.25;
    const larguras = ls.map((t) => c.measureText(t).width);
    const textoW = larguras.length ? Math.max(...larguras) : 0;
    const textoH = ls.length * lh;
    const logoH = logo ? Math.max(textoH, px * 1.6) : 0;
    const logoW = logo ? logoH * logo.w / logo.h : 0;
    const gap = logo && ls.length ? px * 0.5 : 0;
    const pad = s.tarja ? px * 0.55 : 0;
    return { ls, larguras, lh, textoW, textoH, logoW, logoH, gap, pad,
      w: logoW + gap + textoW + pad * 2, h: Math.max(textoH, logoH) + pad * 2 };
  };

  // desenha o bloco centrado na origem atual do contexto
  const desenharBloco = (c, s, m, px, alinhamento) => {
    const x0 = -m.w / 2;
    const y0 = -m.h / 2;
    if (s.tarja) {
      c.save();
      c.globalAlpha *= s.opTarja / 100;
      c.fillStyle = s.corTarja;
      c.beginPath();
      if (c.roundRect) c.roundRect(x0, y0, m.w, m.h, m.pad * 0.6); else c.rect(x0, y0, m.w, m.h);
      c.fill();
      c.restore();
    }
    c.save();
    if (s.sombra) {
      c.shadowColor = 'rgba(0,0,0,.55)';
      c.shadowBlur = px * 0.35;
      c.shadowOffsetY = px * 0.05;
    }
    let x = x0 + m.pad;
    if (logo) { c.drawImage(logo.img, x, -m.logoH / 2, m.logoW, m.logoH); x += m.logoW + m.gap; }
    c.font = FONTES[s.fonte](px);
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = s.cor;
    const topo = -m.textoH / 2 + m.lh / 2;
    m.ls.forEach((t, i) => {
      const lw = m.larguras[i];
      const tx = alinhamento === 'left' ? x : alinhamento === 'right' ? x + m.textoW - lw : x + (m.textoW - lw) / 2;
      const ty = topo + i * m.lh;
      if (s.contorno) {
        c.save();
        c.shadowColor = 'transparent';
        c.lineWidth = Math.max(1, px * 0.09);
        c.lineJoin = 'round';
        c.strokeStyle = contraste(s.cor);
        c.strokeText(t, tx, ty);
        c.restore();
      }
      c.fillText(t, tx, ty);
    });
    c.restore();
  };

  // desenha a foto e a marca d'água num canvas W x H
  const render = (c, W, H, img, s) => {
    c.save();
    c.clearRect(0, 0, W, H);
    c.drawImage(img, 0, 0, W, H);
    const lado = Math.min(W, H);
    const px = s.tamanho / 100 * lado;
    const sFaixa = s.padrao === 'faixa' ? { ...s, tarja: false } : s;
    const m = medir(c, sFaixa, px);
    if (!m.ls.length && !logo) { c.restore(); return false; }

    c.globalAlpha = s.opacidade / 100;
    const marg = s.margem / 100 * lado;
    const rot = s.rotacao * Math.PI / 180;
    const bloco = (cx, cy, al, r) => {
      c.save(); c.translate(cx, cy); if (r) c.rotate(r); desenharBloco(c, sFaixa, m, px, al); c.restore();
    };
    const ancora = (pos, extraY = 0) => {
      const [v, h] = pos;
      const cx = h === 'l' ? marg + m.w / 2 : h === 'r' ? W - marg - m.w / 2 : W / 2;
      const cy = v === 't' ? marg + m.h / 2 + extraY : v === 'b' ? H - marg - m.h / 2 - extraY : H / 2;
      return [cx, cy, h === 'l' ? 'left' : h === 'r' ? 'right' : 'center'];
    };

    if (s.padrao === 'unico') {
      const [x, y, al] = ancora(s.posicao);
      bloco(x, y, al, rot);
    } else if (s.padrao === 'cantos') {
      for (const p of ['tl', 'tr', 'bl', 'br']) { const [x, y, al] = ancora(p); bloco(x, y, al, rot); }
    } else if (s.padrao === 'mosaico' || s.padrao === 'diagonal') {
      const gap = s.espaco / 100 * m.h;
      const passoX = m.w + gap;
      const passoY = m.h + gap;
      if (s.padrao === 'diagonal') {
        // gira a grade inteira e cobre a diagonal da foto
        const D = Math.hypot(W, H);
        c.translate(W / 2, H / 2);
        c.rotate(rot);
        let linha = 0;
        for (let y = -D / 2; y <= D / 2 + passoY; y += passoY, linha++) {
          for (let x = -D / 2 - (linha % 2 ? passoX / 2 : 0); x <= D / 2 + passoX; x += passoX) bloco(x, y, 'center', 0);
        }
      } else {
        let linha = 0;
        for (let y = passoY / 2 - passoY / 4; y <= H + passoY; y += passoY, linha++) {
          for (let x = (linha % 2 ? 0 : passoX / 2); x <= W + passoX; x += passoX) bloco(x, y, 'center', rot);
        }
      }
    } else if (s.padrao === 'faixa') {
      const alturaFaixa = m.h + px * 0.9;
      const v = s.posicao[0];
      const cy = v === 't' ? marg + alturaFaixa / 2 : v === 'b' ? H - marg - alturaFaixa / 2 : H / 2;
      c.save();
      c.globalAlpha = (s.opacidade / 100) * (s.opTarja / 100);
      c.fillStyle = s.corTarja;
      c.fillRect(0, cy - alturaFaixa / 2, W, alturaFaixa);
      c.restore();
      const h = s.posicao[1];
      const respiro = Math.max(marg, px * 0.8);
      const cx = h === 'l' ? respiro + m.w / 2 : h === 'r' ? W - respiro - m.w / 2 : W / 2;
      bloco(cx, cy, h === 'l' ? 'left' : h === 'r' ? 'right' : 'center', 0);
    }
    c.restore();
    return true;
  };

  // ---------- prévia ----------
  let pendente = false;
  const desenhar = async () => {
    pendente = false;
    const s = ler();
    try { await document.fonts.load(FONTES[s.fonte](40), 'Ab@©'); } catch {}
    const foto = fotos[atual];
    if (!foto) return;
    const escala = Math.min(1, PREVIA_MAX / Math.max(foto.w, foto.h));
    const W = Math.round(foto.w * escala);
    const H = Math.round(foto.h * escala);
    if (tela.width !== W || tela.height !== H) { tela.width = W; tela.height = H; }
    const temMarca = render(ctx, W, H, foto.img, s);
    status.textContent = `${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'} · esta: ${foto.nome}, ${foto.w} × ${foto.h} px` +
      (temMarca ? '' : ' · preencha o @, o site ou o nome para ver a marca d\'água') + (aviso ? ` · ${aviso}` : '');
  };
  // redesenha no próximo quadro; o setTimeout cobre abas em segundo plano, onde o navegador pausa os quadros
  const agendar = () => {
    if (pendente) return;
    pendente = true;
    const uma = () => { if (pendente) desenhar(); };
    requestAnimationFrame(uma);
    setTimeout(uma, 100);
  };

  const visibilidade = () => {
    const s = ler();
    for (const el of form.querySelectorAll('[data-para]')) el.hidden = !el.dataset.para.split(' ').includes(s.padrao);
    form.querySelector('[data-para-tarja]').hidden = !(s.tarja || s.padrao === 'faixa');
    form.querySelector('[data-para-qualidade]').hidden = s.formato === 'image/png';
    for (const el of form.querySelectorAll('[data-valor]')) {
      const nome = el.dataset.valor;
      el.textContent = `${form.elements[nome].value}${UNIDADE[nome] || ''}`;
    }
  };

  // ---------- fotos ----------
  const abrirImagem = (file) => new Promise((ok, erro) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    // SVG sem largura/altura declaradas chega com tamanho 0 em alguns navegadores: usa um quadrado
    img.onload = () => ok({ nome: file.name || 'foto', img, w: img.naturalWidth || 300, h: img.naturalHeight || 300, url });
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error(file.name)); };
    img.src = url;
  });

  const desenharMiniaturas = () => {
    miniaturas.textContent = '';
    fotos.forEach((f, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-current', String(i === atual));
      b.setAttribute('aria-label', `Ver ${f.nome}`);
      const im = document.createElement('img');
      im.src = f.url; im.alt = '';
      b.append(im);
      b.addEventListener('click', () => { atual = i; desenharMiniaturas(); agendar(); });
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'btn sm contorno';
      x.textContent = '×';
      x.style.cssText = 'padding:0 8px;align-self:flex-start;margin-left:-6px';
      x.setAttribute('aria-label', `Tirar ${f.nome}`);
      x.addEventListener('click', () => remover(i));
      miniaturas.append(b, x);
    });
    const tem = fotos.length > 0;
    tela.hidden = !tem;
    soltar.hidden = tem;
    $('#baixar').disabled = !tem;
    $('#baixarTodas').disabled = fotos.length < 2;
    $('#compartilhar').disabled = !tem;
    if (!tem) status.textContent = '';
  };

  const remover = (i) => {
    URL.revokeObjectURL(fotos[i].url);
    fotos.splice(i, 1);
    atual = Math.min(atual, fotos.length - 1);
    desenharMiniaturas();
    agendar();
  };

  const adicionar = async (lista) => {
    const arquivos = [...lista].filter((f) => f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|avif|gif)$/i.test(f.name));
    const falhas = [];
    const antes = fotos.length;
    for (const f of arquivos) {
      try { fotos.push(await abrirImagem(f)); } catch { falhas.push(f.name); }
    }
    if (fotos.length > antes) atual = antes; // mostra a primeira das fotos novas
    // o aviso fica até a próxima leva de fotos (a prévia reescreve o status e o repete)
    aviso = falhas.length ? `Não consegui abrir: ${falhas.join(', ')}. Se for HEIC do iPhone, exporte como JPG ` +
      '(ou, no iPhone, em Ajustes → Câmera → Formatos, escolha "Mais compatível").' : '';
    desenharMiniaturas();
    if (aviso) status.textContent = aviso;
    agendar();
  };

  entrada.addEventListener('change', () => { adicionar(entrada.files); entrada.value = ''; });
  for (const alvo of [palco, soltar]) {
    alvo.addEventListener('dragover', (e) => { e.preventDefault(); palco.classList.add('ativo'); });
    alvo.addEventListener('dragleave', () => palco.classList.remove('ativo'));
    alvo.addEventListener('drop', (e) => { e.preventDefault(); palco.classList.remove('ativo'); adicionar(e.dataTransfer.files); });
  }
  document.addEventListener('paste', (e) => {
    const arquivos = [...(e.clipboardData?.files || [])];
    if (arquivos.length) adicionar(arquivos);
  });

  // ---------- logo ----------
  $('#logo').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const l = await abrirImagem(f);
      if (logo) URL.revokeObjectURL(logo.url);
      logo = l;
      $('#nomeLogo').textContent = f.name;
      $('#tirarLogo').hidden = false;
      agendar();
    } catch { $('#nomeLogo').textContent = 'Não consegui abrir esse arquivo.'; }
  });
  $('#tirarLogo').addEventListener('click', () => {
    if (logo) URL.revokeObjectURL(logo.url);
    logo = null;
    $('#nomeLogo').textContent = '';
    $('#tirarLogo').hidden = true;
    agendar();
  });

  // ---------- exportar ----------
  const gerar = async (foto) => {
    const s = ler();
    try { await document.fonts.load(FONTES[s.fonte](40), 'Ab@©'); } catch {}
    const c = document.createElement('canvas');
    c.width = foto.w;
    c.height = foto.h;
    const cx = c.getContext('2d');
    if (s.formato === 'image/jpeg') { cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, c.width, c.height); }
    render(cx, c.width, c.height, foto.img, s);
    const blob = await new Promise((ok) => c.toBlob(ok, s.formato, s.qualidade / 100));
    const base = foto.nome.replace(/\.[^.]+$/, '');
    return { nome: `${base}-marca-dagua.${EXT[s.formato]}`, blob };
  };
  const baixar = ({ nome, blob }) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const ocupado = async (botao, texto, fn) => {
    const antes = botao.textContent;
    botao.disabled = true;
    botao.textContent = texto;
    try { await fn(); } finally { botao.textContent = antes; botao.disabled = false; }
  };

  $('#baixar').addEventListener('click', (e) => ocupado(e.currentTarget, 'Gerando…', async () => baixar(await gerar(fotos[atual]))));
  $('#baixarTodas').addEventListener('click', (e) => ocupado(e.currentTarget, 'Gerando…', async () => {
    const itens = [];
    const usados = new Set();
    for (const f of fotos) {
      const item = await gerar(f);
      let nome = item.nome;
      for (let n = 2; usados.has(nome); n++) nome = item.nome.replace(/(\.[^.]+)$/, `-${n}$1`);
      usados.add(nome);
      itens.push({ ...item, nome });
    }
    baixar({ nome: 'fotos-marca-dagua.zip', blob: await window.zipar(itens) });
  }));

  const podeCompartilhar = (() => {
    try { return !!navigator.canShare && navigator.canShare({ files: [new File([''], 'a.jpg', { type: 'image/jpeg' })] }); } catch { return false; }
  })();
  if (podeCompartilhar) {
    $('#compartilhar').hidden = false;
    $('#compartilhar').addEventListener('click', (e) => ocupado(e.currentTarget, 'Preparando…', async () => {
      const { nome, blob } = await gerar(fotos[atual]);
      try { await navigator.share({ files: [new File([blob], nome, { type: blob.type })] }); } catch {}
    }));
  }

  // ---------- controles ----------
  for (const b of form.querySelectorAll('[data-cor]')) {
    b.addEventListener('click', () => { form.elements.cor.value = b.dataset.cor; form.dispatchEvent(new Event('input')); });
  }
  form.addEventListener('change', (e) => {
    // diagonal sem inclinação não parece diagonal: sugere -30°
    if (e.target.name === 'padrao' && e.target.value === 'diagonal' && Number(form.elements.rotacao.value) === 0) form.elements.rotacao.value = -30;
    form.dispatchEvent(new Event('input'));
  });
  form.addEventListener('input', () => { visibilidade(); salvar(); agendar(); });
  form.addEventListener('submit', (e) => e.preventDefault());
  $('#restaurar').addEventListener('click', () => {
    aplicar(PADRAO);
    try { localStorage.removeItem(CHAVE); } catch {}
    visibilidade();
    agendar();
  });

  restaurarSalvo();
  visibilidade();
})();
