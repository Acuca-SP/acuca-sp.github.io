// ZIP mínimo, sem compressão (método "store"): fotos JPG/PNG/WEBP já são comprimidas,
// então não vale carregar uma biblioteca externa só para isso. Uso: await zipar([{ nome, blob }]) → Blob.
(() => {
  const TABELA = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (bytes) => {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = TABELA[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const dataDos = (d) => ({
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    dia: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  });

  window.zipar = async (arquivos) => {
    const enc = new TextEncoder();
    const partes = [];
    const central = [];
    let deslocamento = 0;
    const { hora, dia } = dataDos(new Date());

    for (const { nome, blob } of arquivos) {
      const dados = new Uint8Array(await blob.arrayBuffer());
      const nomeBytes = enc.encode(nome);
      const crc = crc32(dados);

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // nome em UTF-8
      local.setUint16(8, 0, true);
      local.setUint16(10, hora, true);
      local.setUint16(12, dia, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, dados.length, true);
      local.setUint32(22, dados.length, true);
      local.setUint16(26, nomeBytes.length, true);
      partes.push(local, nomeBytes, dados);

      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true);
      c.setUint16(12, hora, true);
      c.setUint16(14, dia, true);
      c.setUint32(16, crc, true);
      c.setUint32(20, dados.length, true);
      c.setUint32(24, dados.length, true);
      c.setUint16(28, nomeBytes.length, true);
      c.setUint32(42, deslocamento, true);
      central.push(c, nomeBytes);

      deslocamento += 30 + nomeBytes.length + dados.length;
    }

    const tamanhoCentral = central.reduce((s, p) => s + p.byteLength, 0);
    const fim = new DataView(new ArrayBuffer(22));
    fim.setUint32(0, 0x06054b50, true);
    fim.setUint16(8, arquivos.length, true);
    fim.setUint16(10, arquivos.length, true);
    fim.setUint32(12, tamanhoCentral, true);
    fim.setUint32(16, deslocamento, true);
    return new Blob([...partes, ...central, fim], { type: 'application/zip' });
  };
})();
