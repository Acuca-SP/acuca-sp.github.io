// Valida data/prompts.json: campos obrigatórios, ids únicos, variáveis do texto = variáveis declaradas,
// status coerente com o exemplo (só é "aprovado" quem tem antes e depois) e arquivos de exemplo existentes.
// Uso: node tests/validar-prompts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dados = JSON.parse(fs.readFileSync(path.join(raiz, 'data/prompts.json'), 'utf8'));
const erros = [];
const erro = (id, msg) => erros.push(`${id}: ${msg}`);

// [largura, altura] de um JPG ou PNG, lido do cabeçalho
const tamanho = (arq) => {
  const b = fs.readFileSync(arq);
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
};

const CATEGORIAS = new Set(['produto', 'obra', 'textil', 'pequeno']);
const STATUS = new Set(['em-teste', 'aprovado']);
const ids = new Set();

if (!dados.regra_de_preservacao) erro('geral', 'falta regra_de_preservacao');

for (const p of dados.prompts) {
  const id = p.id || '(sem id)';
  for (const campo of ['id', 'titulo', 'direcao', 'formato', 'prompt', 'status']) if (!p[campo]) erro(id, `falta ${campo}`);
  if (!/^[a-z0-9-]+$/.test(p.id || '')) erro(id, 'id deve ter só letras minúsculas, números e hífen');
  if (ids.has(p.id)) erro(id, 'id repetido');
  ids.add(p.id);
  if (!STATUS.has(p.status)) erro(id, `status inválido: ${p.status}`);
  if (!Array.isArray(p.categorias) || !p.categorias.length) erro(id, 'categorias vazias');
  for (const c of p.categorias || []) if (!CATEGORIAS.has(c)) erro(id, `categoria desconhecida: ${c}`);
  if (!Array.isArray(p.dicas)) erro(id, 'dicas deve ser uma lista');
  if (!Array.isArray(p.testado_com)) erro(id, 'testado_com deve ser uma lista');

  const noTexto = new Set([...(p.prompt || '').matchAll(/\[([A-Z][A-Z ]*)\]/g)].map((m) => m[1]));
  const declaradas = new Set((p.variaveis || []).map((v) => v.nome));
  for (const v of noTexto) if (!declaradas.has(v)) erro(id, `[${v}] aparece no prompt mas não está em variaveis`);
  for (const v of declaradas) if (!noTexto.has(v)) erro(id, `variável ${v} declarada mas não usada no prompt`);
  for (const v of p.variaveis || []) if (!v.exemplo) erro(id, `variável ${v.nome} sem exemplo`);
  if (/[À-ÿ]/.test((p.prompt || '').replace('{PRESERVACAO}', ''))) erro(id, 'o prompt deve estar em inglês (achei acentos)');

  if (!Array.isArray(p.exemplos)) erro(id, 'exemplos deve ser uma lista (pode ser vazia)');
  for (const ex of p.exemplos || []) {
    if (!ex.ferramenta) erro(id, 'exemplo sem ferramenta (qual IA gerou)');
    if (!ex.antes || !ex.depois) erro(id, `exemplo de ${ex.ferramenta} sem antes ou depois`);
    if (ex.ferramenta && !(p.testado_com || []).includes(ex.ferramenta)) erro(id, `${ex.ferramenta} tem exemplo mas não está em testado_com`);
    for (const lado of ['antes', 'depois']) {
      const arq = ex[lado];
      if (!arq) continue;
      if (!fs.existsSync(path.join(raiz, arq))) { erro(id, `arquivo de exemplo não existe: ${arq}`); continue; }
      // a página usa o tamanho para alinhar as duas fotos na mesma altura
      const real = tamanho(path.join(raiz, arq));
      const salvo = ex[`${lado}_px`];
      if (!real) erro(id, `não consegui ler o tamanho de ${arq} (use JPG ou PNG)`);
      else if (!salvo || salvo[0] !== real[0] || salvo[1] !== real[1]) erro(id, `${lado}_px de ${ex.ferramenta} deve ser [${real}]`);
    }
  }
  if (p.status === 'aprovado' && !(p.exemplos || []).length) erro(id, 'aprovado precisa de pelo menos um exemplo de antes e depois');
}

if (erros.length) {
  console.error(`✗ ${erros.length} problema(s) em data/prompts.json:\n- ${erros.join('\n- ')}`);
  process.exit(1);
}
console.log(`✓ ${dados.prompts.length} prompts válidos (${dados.prompts.filter((p) => p.status === 'aprovado').length} aprovados)`);
