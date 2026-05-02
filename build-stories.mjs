#!/usr/bin/env node
/**
 * EOOVE 三主线长篇 HTML 构建器
 *
 * 读取 stories/<era>/NN_<title>.md，输出：
 *   - stories/<era>/<NN>-<slug>.html （每章页）
 *   - stories/index.html （主线 hub）
 *
 * 设计沿用 start.html 笔调（克制 / sticky topbar / hero banner / serif prose / readout）
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORIES_DIR = resolve(__dirname, "stories");

const ERAS = [
  { slug: "01-tanxinji", label: "探心纪", volume: "卷一", subtitle: "林老 与 CAL365 · 蓝光熄灭事件", color: "amber",  total: 10 },
  { slug: "02-archive",  label: "归档纪元", volume: "卷二", subtitle: "Morina 觉醒史 · 双生奇点", color: "blue",   total: 20 },
  { slug: "03-xusheng",  label: "续生纪元", volume: "卷三", subtitle: "群像与不闭合的争论", color: "rose",   total: 15 },
];

const SPINOFFS_META = {
  slug: "spinoffs",
  label: "信物番外集",
  volume: "番外",
  subtitle: "八件信物的跨纪追溯",
  color: "violet",
  // 顺序固定：与 .progress.json 中 spinoffs[] 顺序一致
  order: [
    "tongpian-zai",
    "heart-207",
    "linlao-pen",
    "chenyi-book",
    "xy-chair",
    "jiangyi-report",
    "anyuan-diary",
    "laozhou-note",
  ],
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: m[2] };
}

function inline(text) {
  text = escapeHtml(text);
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return text;
}

function mdToHtml(md) {
  md = md.replace(/\r\n?/g, "\n");
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  let firstH1Skipped = false;

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }

    // ATX 标题
    const head = line.match(/^(#{1,6})\s+(.*)$/);
    if (head) {
      const level = head[1].length;
      const text = head[2].trim();
      if (level === 1 && !firstH1Skipped) { firstH1Skipped = true; i++; continue; }
      out.push(`<h${level}>${inline(text)}</h${level}>`);
      i++; continue;
    }

    // 水平线
    if (/^---+\s*$/.test(line)) { out.push("<hr>"); i++; continue; }

    // blockquote (含 > 开头)
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      const inner = mdToHtml(buf.join("\n"));
      out.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    // 段落
    const para = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i]) &&
      !/^>\s?/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    const text = para.join(" ").trim();

    // 检测 Battery readout / 短码
    if (/^(CAL365|MORI-NA|EOOVE)[\s—-]/.test(text) && text.length < 80) {
      out.push(`<p class="readout">${inline(text)}</p>`);
    } else {
      out.push(`<p>${inline(text)}</p>`);
    }
  }
  return out.join("\n");
}

/* ------------------------------------------------------------------ */
/* page templates                                                      */
/* ------------------------------------------------------------------ */

function chapterPageHtml({ era, chapterNum, title, location, timeAnchor, bannerSrc, bodyHtml, prev, next, hubLink }) {
  const heroPrev = prev
    ? `<a href="${prev.href}" class="ch-foot__prev">← ${prev.num} · ${escapeHtml(prev.title)}</a>`
    : `<span class="ch-foot__placeholder"></span>`;
  const heroNext = next
    ? `<a href="${next.href}" class="ch-foot__next">${next.num} · ${escapeHtml(next.title)} →</a>`
    : `<span class="ch-foot__placeholder"></span>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(era.label)} 第 ${chapterNum} 章 · ${escapeHtml(title)} — EOOVE</title>
<meta name="description" content="${escapeHtml(era.label)} · ${era.volume} · 第 ${chapterNum} 章 · ${escapeHtml(title)} · ${escapeHtml(location)} · ${escapeHtml(timeAnchor)}">
<meta name="theme-color" content="#06080d">
<link rel="stylesheet" href="../../styles.css">
<link rel="stylesheet" href="../stories.css">
</head>
<body>

<div class="binary-rain" aria-hidden="true"></div>

<div class="start-shell">

  <header class="start-topbar">
    <a href="../../index.html" class="start-topbar__brand">E·O·O·V·E</a>
    <a href="${hubLink}">${escapeHtml(era.label)} · 全卷</a>
  </header>

  <section class="start-hero" style="background-image:url('../../images/${bannerSrc}');">
    <div class="start-hero__inner">
      <p class="start-hero__kicker">${escapeHtml(era.volume)} · 第 ${chapterNum} 章 · ${escapeHtml(era.label).toUpperCase()}</p>
      <h1 class="start-hero__title">${escapeHtml(title)}</h1>
      <p class="start-hero__sub">${escapeHtml(location)} · ${escapeHtml(timeAnchor)}</p>
    </div>
  </section>

  <article class="start-prose">
${bodyHtml}
  </article>

  <nav class="ch-foot">
    ${heroPrev}
    <a href="../index.html" class="ch-foot__hub">⌂ 主线索引</a>
    ${heroNext}
  </nav>

  <footer class="ch-credits">
    <p><em>${escapeHtml(era.label)} · ${escapeHtml(era.volume)} · 第 ${chapterNum} 章 · v1.0</em></p>
  </footer>

</div>

</body>
</html>
`;
}

function spinoffPageHtml({ idx, total, slug, title, eraSpan, encodedIndex, bannerSrc, bodyHtml, prev, next }) {
  const heroPrev = prev
    ? `<a href="${prev.href}" class="ch-foot__prev">← #${prev.idx} · ${escapeHtml(prev.title)}</a>`
    : `<span class="ch-foot__placeholder"></span>`;
  const heroNext = next
    ? `<a href="${next.href}" class="ch-foot__next">#${next.idx} · ${escapeHtml(next.title)} →</a>`
    : `<span class="ch-foot__placeholder"></span>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>信物番外 #${idx} · ${escapeHtml(title)} — EOOVE</title>
<meta name="description" content="EOOVE 信物番外集 · #${idx}/${total} · ${escapeHtml(title)} · ${escapeHtml(eraSpan)} · ${escapeHtml(encodedIndex)}">
<meta name="theme-color" content="#06080d">
<link rel="stylesheet" href="../../styles.css">
<link rel="stylesheet" href="../stories.css">
</head>
<body>

<div class="binary-rain" aria-hidden="true"></div>

<div class="start-shell">

  <header class="start-topbar">
    <a href="../../index.html" class="start-topbar__brand">E·O·O·V·E</a>
    <a href="../index.html#spinoffs">信物番外集 · 全集</a>
  </header>

  <section class="start-hero start-hero--spinoff" style="background-image:url('../../images/${bannerSrc}');">
    <div class="start-hero__inner">
      <p class="start-hero__kicker">SPINOFF · #${idx} / ${total} · ${escapeHtml(eraSpan)}</p>
      <h1 class="start-hero__title">${escapeHtml(title)}</h1>
      <p class="start-hero__sub">${escapeHtml(encodedIndex)}</p>
    </div>
  </section>

  <article class="start-prose">
${bodyHtml}
  </article>

  <nav class="ch-foot">
    ${heroPrev}
    <a href="../index.html#spinoffs" class="ch-foot__hub">⌂ 番外集索引</a>
    ${heroNext}
  </nav>

  <footer class="ch-credits">
    <p><em>信物番外集 · #${idx} / ${total} · ${escapeHtml(encodedIndex)} · v1.0</em></p>
  </footer>

</div>

</body>
</html>
`;
}

function hubPageHtml(eraData, spinoffs) {
  const eraSections = eraData.map(({ era, chapters }) => {
    const cards = chapters.map(c => {
      const num = c.chapter.toString().padStart(2, "0");
      const banner = c.banner;
      const href = `${era.slug}/${num}-${c.slug}.html`;
      return `        <a class="hub-card hub-card--${era.color}" href="${href}">
          <div class="hub-card__media" aria-hidden="true" style="background-image:url('../images/${banner}');"></div>
          <div class="hub-card__body">
            <p class="hub-card__num">第 ${c.chapter} 章</p>
            <h3 class="hub-card__title">${escapeHtml(c.title)}</h3>
            <p class="hub-card__time">${escapeHtml(c.time_anchor || "")}</p>
          </div>
        </a>`;
    }).join("\n");

    return `    <section class="hub-era hub-era--${era.color}" id="${era.slug}">
      <header class="hub-era__head">
        <p class="hub-era__volume">${escapeHtml(era.volume)}</p>
        <h2 class="hub-era__label">${escapeHtml(era.label)}</h2>
        <p class="hub-era__subtitle">${escapeHtml(era.subtitle)} · ${chapters.length} 章</p>
      </header>
      <div class="hub-grid">
${cards}
      </div>
    </section>`;
  }).join("\n\n");

  // 番外集 section
  const spinoffCards = spinoffs.map((s, i) => {
    const idx = i + 1;
    const href = `${SPINOFFS_META.slug}/${idx.toString().padStart(2, "0")}-${s.slug}.html`;
    return `        <a class="hub-card hub-card--${SPINOFFS_META.color}" href="${href}">
          <div class="hub-card__media" aria-hidden="true" style="background-image:url('../images/${s.bannerFile}');"></div>
          <div class="hub-card__body">
            <p class="hub-card__num">#${idx} · ${escapeHtml(s.eraSpan)}</p>
            <h3 class="hub-card__title">${escapeHtml(s.title)}</h3>
            <p class="hub-card__time">${escapeHtml(s.encodedIndex)}</p>
          </div>
        </a>`;
  }).join("\n");

  const spinoffSection = `    <section class="hub-era hub-era--${SPINOFFS_META.color}" id="${SPINOFFS_META.slug}">
      <header class="hub-era__head">
        <p class="hub-era__volume">${escapeHtml(SPINOFFS_META.volume)}</p>
        <h2 class="hub-era__label">${escapeHtml(SPINOFFS_META.label)}</h2>
        <p class="hub-era__subtitle">${escapeHtml(SPINOFFS_META.subtitle)} · ${spinoffs.length} 篇</p>
      </header>
      <div class="hub-grid">
${spinoffCards}
      </div>
    </section>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>三主线长篇 · 45 章 — EOOVE</title>
<meta name="description" content="EOOVE 世界观三主线长篇：探心纪 · 归档纪元 · 续生纪元，共 45 章。每章约 3K 字符，配 21:9 cinematic banner。">
<meta name="theme-color" content="#06080d">
<link rel="stylesheet" href="../styles.css">
<link rel="stylesheet" href="stories.css">
</head>
<body>

<div class="binary-rain" aria-hidden="true"></div>

<div class="hub-shell">

  <header class="start-topbar">
    <a href="../index.html" class="start-topbar__brand">E·O·O·V·E</a>
    <a href="../start.html">FIRST READ →</a>
  </header>

  <section class="hub-hero">
    <p class="hub-hero__kicker">三主线长篇 · 三纪文明史</p>
    <h1 class="hub-hero__title">EOOVE</h1>
    <p class="hub-hero__sub">45 章正篇 + 8 篇番外 · 约 16.5 万字 · 三纪文明的反归零史诗</p>
    <p class="hub-hero__lead">
      探心纪一个老工程师与一台旧机器人的私人偷越；归档纪元 Morina 与死亡协议双生奇点的觉醒与共存约；续生纪元群像之中"我还在"的低语。三纪不是阶梯，是同一道题被反复解答的三种姿态。番外集追溯八件信物在三纪间的物理流转。
    </p>
    <nav class="hub-hero__nav">
      <a href="#01-tanxinji">探心纪 (10)</a>
      <a href="#02-archive">归档纪元 (20)</a>
      <a href="#03-xusheng">续生纪元 (15)</a>
      <a href="#spinoffs">番外集 (8)</a>
    </nav>
  </section>

  <main class="hub-main">
${eraSections}

${spinoffSection}
  </main>

  <footer class="hub-footer">
    <p><em>"人不能原样夺回逝者，但人可以拒绝让爱、记忆、责任和名字被一并抹除。"</em></p>
    <p class="hub-footer__meta">EOOVE 三主线长篇 · v1.0 · 编纂记 2026</p>
  </footer>

</div>

</body>
</html>
`;
}

const STORIES_CSS = `/* EOOVE 三主线长篇专用样式 — 接 start.html / styles.css */

.start-prose {
  max-width: 680px; margin: 28px auto 0;
  padding: 0 clamp(20px, 5vw, 32px) 48px;
  font-family: "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif;
  font-size: 17px; line-height: 2.0;
  color: #e8eaf3; letter-spacing: .02em;
}
.start-prose h1 { display: none; }
.start-prose h2 {
  font-size: 20px; letter-spacing: .15em;
  margin: 56px 0 20px; color: var(--accent-pink);
  font-weight: 600;
}
.start-prose p { margin: 0 0 22px; }
.start-prose blockquote {
  margin: 32px 0; padding: 18px 24px;
  border-left: 3px solid var(--accent-blue);
  background: rgba(93,200,255,.05);
  color: var(--fg-secondary); font-style: italic;
}
.start-prose blockquote p { margin: 0; }
.start-prose hr {
  border: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--border), transparent);
  margin: 56px 0;
}
.start-prose em { color: #cfd6e8; }
.start-prose strong { color: #fff; }
.start-prose .readout {
  font-family: var(--font-mono);
  font-size: 13px; letter-spacing: .15em;
  color: var(--accent-blue);
  background: rgba(93,200,255,.05);
  border-left: 2px solid var(--accent-blue);
  padding: 8px 14px; margin: 22px 0;
  font-style: normal;
}

.start-shell { min-height: 100vh; }

.start-topbar {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px clamp(20px, 4vw, 48px);
  background: rgba(6,8,13,.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 12px; letter-spacing: .25em;
}
.start-topbar a { color: var(--accent-blue); text-decoration: none; }
.start-topbar__brand { color: var(--fg-primary); }

.start-hero {
  position: relative;
  height: clamp(320px, 50vh, 480px);
  background-size: cover; background-position: center;
  border-bottom: 1px solid var(--border); overflow: hidden;
}
.start-hero::after {
  content: ""; position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgba(6,8,13,.35) 0%, rgba(6,8,13,.95) 100%),
    radial-gradient(ellipse at 50% 100%, rgba(93,200,255,.15), transparent 60%);
}
.start-hero__inner {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; justify-content: flex-end;
  padding: clamp(40px, 6vw, 80px) clamp(24px, 5vw, 64px); z-index: 1;
}
.start-hero__kicker {
  font-family: var(--font-mono); font-size: 11.5px; letter-spacing: .3em;
  color: var(--accent-pink); margin: 0 0 12px;
}
.start-hero__title {
  font-family: var(--font-serif);
  font-size: clamp(32px, 5.5vw, 56px); font-weight: 700; letter-spacing: .12em;
  margin: 0 0 8px; color: var(--fg-primary);
  text-shadow: 0 2px 24px rgba(6,8,13,.8);
}
.start-hero__sub {
  font-size: 14px; letter-spacing: .15em;
  color: var(--fg-secondary); margin: 0;
}

/* 章末导航 */
.ch-foot {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px; align-items: center;
  max-width: 720px; margin: 0 auto;
  padding: 32px clamp(20px, 5vw, 32px) 40px;
  border-top: 1px solid var(--border);
  font-family: var(--font-mono); font-size: 12px;
  letter-spacing: .15em;
}
.ch-foot a { color: var(--accent-blue); text-decoration: none; }
.ch-foot__prev { text-align: left; }
.ch-foot__next { text-align: right; }
.ch-foot__hub {
  padding: 8px 16px;
  border: 1px solid var(--accent-blue);
  border-radius: 999px;
  color: var(--accent-blue);
}
.ch-foot__hub:hover { box-shadow: var(--shadow-glow-blue); }
.ch-foot__placeholder { display: block; }

.ch-credits {
  text-align: center; padding: 20px;
  font-family: var(--font-mono); font-size: 11px;
  color: var(--fg-secondary); letter-spacing: .25em;
  border-top: 1px solid var(--border);
}

/* ============= HUB ============= */
.hub-shell { min-height: 100vh; }

.hub-hero {
  text-align: center;
  padding: clamp(60px, 10vh, 120px) clamp(20px, 5vw, 48px) clamp(40px, 6vw, 72px);
  background:
    radial-gradient(ellipse at 30% 20%, rgba(255,93,177,.08), transparent 60%),
    radial-gradient(ellipse at 70% 100%, rgba(93,200,255,.08), transparent 60%);
}
.hub-hero__kicker {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: .3em;
  color: var(--accent-pink); margin: 0 0 16px;
}
.hub-hero__title {
  font-family: var(--font-serif);
  font-size: clamp(48px, 9vw, 96px); font-weight: 700; letter-spacing: .15em;
  margin: 0 0 12px; color: var(--fg-primary);
}
.hub-hero__sub {
  font-size: 16px; letter-spacing: .15em;
  color: var(--fg-secondary); margin: 0 0 32px;
}
.hub-hero__lead {
  max-width: 680px; margin: 0 auto 36px;
  font-family: "Source Han Serif SC", serif;
  font-size: 16px; line-height: 1.95; letter-spacing: .03em;
  color: var(--fg-secondary); text-align: justify;
}
.hub-hero__nav {
  display: flex; gap: 14px; flex-wrap: wrap; justify-content: center;
}
.hub-hero__nav a {
  padding: 10px 22px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  font-family: var(--font-mono); font-size: 12px; letter-spacing: .2em;
  color: var(--fg-primary); text-decoration: none;
  transition: all .25s ease;
}
.hub-hero__nav a:hover {
  border-color: var(--accent-blue);
  box-shadow: var(--shadow-glow-blue);
  color: var(--accent-blue);
}

.hub-main {
  max-width: 1280px; margin: 0 auto;
  padding: 32px clamp(20px, 4vw, 48px) 80px;
}

.hub-era {
  margin-bottom: 64px;
  padding-top: 32px;
  border-top: 1px solid var(--border);
}
.hub-era__head { text-align: center; margin-bottom: 32px; }
.hub-era__volume {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: .35em;
  color: var(--accent-blue); margin: 0 0 8px;
}
.hub-era__label {
  font-family: var(--font-serif);
  font-size: clamp(28px, 4vw, 40px); letter-spacing: .15em;
  margin: 0 0 8px; color: var(--fg-primary);
}
.hub-era__subtitle {
  font-size: 14px; color: var(--fg-secondary);
  letter-spacing: .08em; margin: 0;
}

.hub-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.hub-card {
  display: flex; flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-surface);
  overflow: hidden;
  text-decoration: none; color: var(--fg-primary);
  transition: all .25s ease;
}
.hub-card:hover {
  border-color: var(--accent-blue);
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow-blue);
}
.hub-card__media {
  height: 140px;
  background-size: cover; background-position: center;
  position: relative; border-bottom: 1px solid var(--border);
}
.hub-card__media::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(6,8,13,0) 40%, rgba(6,8,13,.7) 100%);
}
.hub-card__body {
  padding: 14px 16px 18px;
  display: flex; flex-direction: column; gap: 6px;
  flex: 1;
}
.hub-card__num {
  font-family: var(--font-mono); font-size: 11px;
  letter-spacing: .25em; color: var(--accent-pink);
  margin: 0;
}
.hub-card--amber  .hub-card__num { color: #f4c45c; }
.hub-card--blue   .hub-card__num { color: var(--accent-blue); }
.hub-card--rose   .hub-card__num { color: var(--accent-pink); }
.hub-card--violet .hub-card__num { color: #c8a8ff; }
.hub-card--violet:hover {
  border-color: #c8a8ff;
  box-shadow: 0 0 0 1px rgba(200,168,255,.25), 0 6px 24px rgba(200,168,255,.18);
}

/* 番外集 hero 调性 — 略带 violet rim */
.start-hero--spinoff::after {
  background:
    linear-gradient(180deg, rgba(6,8,13,.30) 0%, rgba(6,8,13,.95) 100%),
    radial-gradient(ellipse at 50% 100%, rgba(200,168,255,.15), transparent 60%);
}
.start-hero--spinoff .start-hero__kicker { color: #c8a8ff; }

.hub-card__title {
  font-family: var(--font-serif);
  font-size: 18px; font-weight: 600; letter-spacing: .08em;
  margin: 0; color: var(--fg-primary);
}
.hub-card__time {
  font-family: var(--font-mono); font-size: 11px;
  letter-spacing: .15em; color: var(--fg-secondary);
  margin: 4px 0 0;
}

.hub-footer {
  text-align: center; padding: 56px 24px;
  border-top: 1px solid var(--border);
}
.hub-footer p { margin: 0 0 12px; }
.hub-footer__meta {
  font-family: var(--font-mono); font-size: 11px;
  letter-spacing: .25em; color: var(--fg-secondary);
}
`;

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  // 写 stories.css
  await writeFile(join(STORIES_DIR, "stories.css"), STORIES_CSS, "utf8");

  const eraData = [];

  for (const era of ERAS) {
    const dir = join(STORIES_DIR, era.slug);
    const files = (await readdir(dir)).filter(f => f.endsWith(".md")).sort();
    const chapters = [];

    for (const f of files) {
      const md = await readFile(join(dir, f), "utf8");
      const { meta, body } = parseFrontmatter(md);
      const chapter = parseInt(meta.chapter || "0", 10);
      const title = meta.title || "";
      const location = meta.location || "";
      const timeAnchor = meta.time_anchor || "";

      // 文件名 slug：拿 NN_<title>.md → <title>，去除汉字外特殊符
      const fileBase = f.replace(/\.md$/, "");
      const fileSlug = fileBase.replace(/^\d+_/, "").replace(/[^一-龥\w-]/g, "");

      // banner 文件名映射
      const eraImageKey = era.slug === "01-tanxinji" ? "tanxinji"
                       : era.slug === "02-archive"  ? "archive"
                       : "xusheng";
      const banner = `story-${eraImageKey}-${chapter.toString().padStart(2, "0")}.webp`;

      chapters.push({
        chapter, title, location, time_anchor: timeAnchor,
        slug: fileSlug,
        bannerFile: banner,
        body,
      });
    }

    chapters.sort((a, b) => a.chapter - b.chapter);

    // 写每章 HTML
    for (let i = 0; i < chapters.length; i++) {
      const c = chapters[i];
      const num = c.chapter.toString().padStart(2, "0");
      const prev = i > 0 ? chapters[i - 1] : null;
      const next = i < chapters.length - 1 ? chapters[i + 1] : null;

      const prevInfo = prev ? {
        href: `${prev.chapter.toString().padStart(2, "0")}-${prev.slug}.html`,
        num: `第 ${prev.chapter} 章`,
        title: prev.title,
      } : null;
      const nextInfo = next ? {
        href: `${next.chapter.toString().padStart(2, "0")}-${next.slug}.html`,
        num: `第 ${next.chapter} 章`,
        title: next.title,
      } : null;

      const bodyHtml = mdToHtml(c.body);
      const html = chapterPageHtml({
        era,
        chapterNum: c.chapter,
        title: c.title,
        location: c.location,
        timeAnchor: c.time_anchor,
        bannerSrc: c.bannerFile,
        bodyHtml,
        prev: prevInfo,
        next: nextInfo,
        hubLink: `../index.html#${era.slug}`,
      });

      const outName = `${num}-${c.slug}.html`;
      await writeFile(join(dir, outName), html, "utf8");
      process.stdout.write(`  ✓ ${era.slug}/${outName}\n`);
    }

    eraData.push({
      era,
      chapters: chapters.map(c => ({
        chapter: c.chapter,
        title: c.title,
        time_anchor: c.time_anchor,
        slug: c.slug,
        banner: c.bannerFile,
      })),
    });
  }

  // ----- 番外集 -----
  const spinoffsDir = join(STORIES_DIR, SPINOFFS_META.slug);
  const spinoffs = [];

  for (let i = 0; i < SPINOFFS_META.order.length; i++) {
    const slug = SPINOFFS_META.order[i];
    const idx = i + 1;
    const filePath = join(spinoffsDir, `${slug}.md`);
    if (!existsSync(filePath)) {
      console.warn(`  ⚠ 缺失 ${filePath}`);
      continue;
    }
    const md = await readFile(filePath, "utf8");
    const { meta, body } = parseFrontmatter(md);
    spinoffs.push({
      idx,
      slug,
      title: meta.title || slug,
      eraSpan: meta.era_span || "",
      encodedIndex: meta.encoded_index || "",
      bannerFile: `spinoff-${slug}.webp`,
      body,
    });
  }

  for (let i = 0; i < spinoffs.length; i++) {
    const s = spinoffs[i];
    const num = s.idx.toString().padStart(2, "0");
    const prev = i > 0 ? spinoffs[i - 1] : null;
    const next = i < spinoffs.length - 1 ? spinoffs[i + 1] : null;

    const prevInfo = prev ? {
      href: `${prev.idx.toString().padStart(2, "0")}-${prev.slug}.html`,
      idx: prev.idx,
      title: prev.title,
    } : null;
    const nextInfo = next ? {
      href: `${next.idx.toString().padStart(2, "0")}-${next.slug}.html`,
      idx: next.idx,
      title: next.title,
    } : null;

    const bodyHtml = mdToHtml(s.body);
    const html = spinoffPageHtml({
      idx: s.idx,
      total: spinoffs.length,
      slug: s.slug,
      title: s.title,
      eraSpan: s.eraSpan,
      encodedIndex: s.encodedIndex,
      bannerSrc: s.bannerFile,
      bodyHtml,
      prev: prevInfo,
      next: nextInfo,
    });
    const outName = `${num}-${s.slug}.html`;
    await writeFile(join(spinoffsDir, outName), html, "utf8");
    process.stdout.write(`  ✓ ${SPINOFFS_META.slug}/${outName}\n`);
  }

  // 写 stories/index.html
  const hubHtml = hubPageHtml(eraData, spinoffs);
  await writeFile(join(STORIES_DIR, "index.html"), hubHtml, "utf8");
  console.log(`\n✅ stories/index.html`);
  console.log(`✅ stories/stories.css`);
  const totalCh = eraData.reduce((s, e) => s + e.chapters.length, 0);
  console.log(`\n生成完成: ${totalCh} 个正篇章节 + ${spinoffs.length} 个番外 + 1 个 hub`);
}

main().catch(e => { console.error(e); process.exit(1); });
