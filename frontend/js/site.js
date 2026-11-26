const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^https:\/\//.test(u || '') ? u : '#';
let lang = 'pt', data = null, pi = 0;
// texto bilíngue {pt, en} ou texto simples
const tr = v => v && typeof v === 'object' ? (v[lang] || v.pt || '') : (v ?? '');
const get = path => path.split('.').reduce((o, k) => o?.[k], data);

// conteúdo vem do conteudo.json (backend/dados, copiado para a raiz do site na publicação)
try {
  const r = await fetch('conteudo.json', { cache: 'no-store' });
  if (!r.ok) throw new Error(r.status);
  data = await r.json();
} catch (e) {
  document.body.insertAdjacentHTML('afterbegin', '<p id="erro">Não consegui carregar conteudo.json. Abra o site por um servidor (GitHub Pages ou um servidor local), não direto pelo arquivo.</p>');
  document.getElementById('loader').remove();
  throw e;
}

let si = {};
try { si = await import('https://cdn.jsdelivr.net/npm/simple-icons@13.0.0/+esm'); } catch {}
const iconKey = slug => 'si' + slug.charAt(0).toUpperCase() + slug.slice(1);

document.querySelectorAll('[data-en]').forEach(el => el.dataset.pt = el.innerHTML);
document.getElementById('ano').textContent = new Date().getFullYear();

const splitAbout = (text, lit) => {
  document.getElementById('about').innerHTML = esc(text).split(' ')
    .map(w => `<span class="w"${lit ? ' style="opacity:1"' : ''}>${w}</span>`).join(' ');
};

// escolhe colunas que dividem o total; se nenhuma dividir, completa a última linha com quadrados vazios
const stackCols = (n, max) => { for (let c = max; c >= Math.max(2, max - 3); c--) if (n % c === 0) return c; return max; };
const mqNarrow = matchMedia('(max-width: 900px)');
function renderStack() {
  const items = data.stack || [];
  const cols = stackCols(items.length, mqNarrow.matches ? 4 : 8);
  const grid = document.getElementById('stackGrid');
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  const cells = items.map(({ nome, icone, sigla }) => {
    const ic = icone && si[iconKey(icone)];
    const art = ic ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${esc(ic.path)}"/></svg>`
                   : `<div class="mono" aria-hidden="true">${esc(sigla || String(nome).slice(0, 2))}</div>`;
    return `<div class="tech">${art}<span>${esc(nome)}</span></div>`;
  });
  while (cells.length % cols) cells.push('<div class="tech empty" aria-hidden="true"></div>');
  grid.innerHTML = cells.join('');
}
mqNarrow.addEventListener('change', renderStack);

function render() {
  document.querySelectorAll('[data-c]').forEach(el => el.textContent = tr(get(el.dataset.c)));
  document.querySelectorAll('[data-en]').forEach(el => el.innerHTML = el.dataset[lang]);
  document.getElementById('heroLines').innerHTML = (data.topo?.linhas || [])
    .map(l => `<span class="line"><span>${esc(tr(l))}</span></span>`).join('');
  const frases = data.sobre?.frases || [];
  if (frases.length) splitAbout(tr(frases[pi % frases.length]), lang !== 'pt' || pi > 0);
  document.getElementById('facts').innerHTML = (data.sobre?.blocos || []).map(b =>
    `<div><span class="label">${esc(tr(b.titulo))}</span><p>${esc(tr(b.texto)).replace(/\n/g, '<br>')}</p></div>`).join('');
  document.getElementById('projectList').innerHTML = (data.projetos || []).map(p => `
    <li class="project"><div class="in">
      <div><h3>${esc(tr(p.titulo))}</h3><div class="kind">${esc(tr(p.tipo))}</div></div>
      <div>${(p.paragrafos || []).map(x => `<p>${esc(tr(x))}</p>`).join('')}
      <div class="tags">${(p.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}</div></div>
    </div></li>`).join('');
  renderStack();
  const c = data.contato || {};
  document.getElementById('lnGithub').href = safeUrl(c.github);
  document.getElementById('lnLinkedin').href = safeUrl(c.linkedin);
  document.title = data.nome || document.title;
  document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
}

// idioma
const langBtn = document.getElementById('lang');
function setLang(l) {
  lang = l;
  langBtn.textContent = l === 'en' ? 'PT' : 'EN';
  langBtn.setAttribute('aria-label', l === 'en' ? 'Mudar para português' : 'Switch to English');
  render();
  try { localStorage.setItem('lang', l); } catch {}
}
langBtn.addEventListener('click', () => setLang(lang === 'pt' ? 'en' : 'pt'));
try { if (localStorage.getItem('lang') === 'en') lang = 'en'; } catch {}
setLang(lang);

// frase do "sobre" troca a cada N segundos
setInterval(() => {
  const frases = data.sobre?.frases || [];
  if (frases.length < 2) return;
  pi = (pi + 1) % frases.length;
  const about = document.getElementById('about');
  about.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).onfinish = () => {
    splitAbout(tr(frases[pi]), true);
    about.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
  };
}, (Number(data.sobre?.segundos_por_frase) || 15) * 1000);

// copiar e-mail
document.getElementById('copyMail').addEventListener('click', e => {
  const mail = data.contato?.email || '';
  navigator.clipboard.writeText(mail).then(() => e.target.textContent = lang === 'en' ? 'copied ✓' : 'copiado ✓', () => e.target.textContent = mail);
});

// barra some ao rolar para baixo e volta ao rolar para cima
const nav = document.querySelector('nav');
let lastY = scrollY;
addEventListener('scroll', () => { nav.classList.toggle('hide', scrollY > lastY && scrollY > 80); lastY = scrollY; }, { passive: true });

// cursor: posição aplicada uma vez por quadro, via transform
const cur = document.getElementById('cursor');
let cx = -100, cy = -100, queued = false, overTarget = null;
addEventListener('pointermove', e => {
  cx = e.clientX; cy = e.clientY;
  if (!queued) { queued = true; requestAnimationFrame(() => { cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; queued = false; }); }
}, { passive: true });
addEventListener('pointerover', e => {
  const t = e.target.closest('a,button,.project,.tech:not(.empty)');
  if (t !== overTarget) { overTarget = t; cur.classList.toggle('big', !!t); }
}, { passive: true });

// animações
const loader = document.getElementById('loader');
if (reduce || !window.gsap) { loader.remove(); document.querySelectorAll('.w').forEach(w => w.style.opacity = 1); }
else {
  gsap.registerPlugin(ScrollTrigger);
  const n = { v: 0 }, count = loader.querySelector('.count');
  gsap.timeline()
    .to(n, { v: 100, duration: 1.2, ease: 'power2.inOut', onUpdate: () => count.textContent = Math.round(n.v) })
    .to(loader, { yPercent: -100, duration: .8, ease: 'power4.inOut' })
    .from('.hero h1 .line span', { yPercent: 110, duration: 1, stagger: .1, ease: 'power4.out' }, '-=.4')
    .from('.hero .label, .hero .row', { y: 20, opacity: 0, duration: .8, stagger: .1 }, '-=.6')
    .add(() => loader.remove());
  gsap.to('.about-text .w', { opacity: 1, stagger: .05, ease: 'none',
    scrollTrigger: { trigger: '#about', start: 'top 80%', end: 'bottom 45%', scrub: true } });
  gsap.utils.toArray('.head h2, .contact .big').forEach(el =>
    gsap.from(el, { yPercent: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
  gsap.from('.project', { y: 40, opacity: 0, duration: .8, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '.projects', start: 'top 85%' } });
  gsap.from('.tech', { y: 24, opacity: 0, duration: .6, stagger: .03, ease: 'power2.out', scrollTrigger: { trigger: '#stackGrid', start: 'top 85%' } });
}
