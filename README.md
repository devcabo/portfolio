# Portfólio — Cauã Barcelos Corrêa

Site pessoal em preto e branco, em português e inglês.

**Site:** https://devcabo.github.io/portfolio/

## Arquitetura

```
portfolio/
├── frontend/                 o que roda no navegador
│   ├── index.html            estrutura da página
│   ├── css/estilo.css        visual
│   └── js/site.js            monta a página a partir do conteúdo, idioma e animações
├── backend/
│   ├── dados/conteudo.json   todo o texto do site (PT e EN)
│   └── testes/teste.mjs      valida os dados e os scripts antes de publicar
└── .github/workflows/
    └── publicar.yml          testa, monta e publica no GitHub Pages
```

Não existe servidor próprio. O conteúdo fica separado da página, e o GitHub cuida da publicação:

```
 backend/dados/conteudo.json ──push na main──▶ GitHub Actions: testa → monta → publica
                                                                   │
 visitante ◀──────────── GitHub Pages: frontend/ + conteudo.json ◀─┘
```

- **Frontend:** HTML, CSS e JavaScript puros. Animações com GSAP e ícones da Simple Icons, carregados por CDN.
- **Dados:** um único JSON. Cada texto tem as versões `pt` e `en`.
- **Publicação:** a cada alteração na `main`, o workflow roda o teste. Se passar, publica `frontend/` com o `conteudo.json`. Se falhar, o site continua na versão anterior.

## Rodar no computador

```
node backend/testes/teste.mjs
mkdir _site && cp -r frontend/. _site/ && cp backend/dados/conteudo.json _site/
python -m http.server 8000 -d _site
```

Abra http://localhost:8000. O site lê o `conteudo.json` com `fetch`, por isso precisa de um servidor.
