// Autoteste: node backend/testes/teste.mjs
// Roda também na publicação: se falhar, o site não é atualizado.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const raiz = new URL('../../', import.meta.url);
const ler = p => readFileSync(new URL(p, raiz), 'utf8');
const arquivo = p => new URL(p, raiz);

// dados: JSON válido e com as seções que o site usa
const data = JSON.parse(ler('backend/dados/conteudo.json'));
for (const k of ['nome', 'cargo', 'topo', 'sobre', 'projetos', 'stack', 'contato'])
  assert.ok(k in data, `conteudo.json sem "${k}"`);
for (const p of data.projetos) assert.ok(p.titulo?.pt, 'projeto sem título em português');
for (const k of ['github', 'linkedin']) assert.match(data.contato[k], /^https:\/\//, `link do ${k} precisa começar com https://`);

// sintaxe dos scripts do frontend
execFileSync(process.execPath, ['--check', fileURLToPath(arquivo('frontend/js/site.js'))]);

// eval só roda um trecho do próprio código deste repositório, para testar a função sem duplicá-la
const site = ler('frontend/js/site.js');

// colunas da stack fecham as linhas
const stackCols = eval(site.match(/const stackCols = ([^\n]+);\n/)[1]);
assert.equal(stackCols(16, 8), 8);
assert.equal(stackCols(16, 4), 4);
assert.equal(stackCols(15, 8), 5);
assert.equal(stackCols(9, 4), 3);
assert.equal(stackCols(13, 8), 8); // primo: completa com quadrados vazios

console.log('OK');
