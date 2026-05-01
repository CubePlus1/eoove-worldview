#!/usr/bin/env node
/**
 * EOOVE 维度页批量生成器
 *
 * 读取 ../worldbuilding/*.md，生成 dimensions/NN-slug.html。
 * 使用内置 markdown→HTML 转换器，无第三方依赖。
 *
 * 用法：
 *   node build-pages.mjs
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE_DIR = resolve(__dirname, "../worldbuilding");
const OUT_DIR = resolve(__dirname, "dimensions");

/* ------------------------------------------------------------------ */
/* 1. 文件清单 + 英文 slug + 简介                                      */
/*    顺序决定上一章/下一章                                            */
/* ------------------------------------------------------------------ */

const PAGES = [
  { md: "00_序章_EOOVE核心设定.md",        slug: "00-prologue",          num: "序章",   title: "EOOVE 核心设定",          brief: "EOOVE 的形状、二元觉醒、Morina 与死亡协议的对偶性。" },
  { md: "00_衔接_探心纪与归档纪元.md",     slug: "00-bridge",            num: "衔接",   title: "探心纪与归档纪元",        brief: "林老的 CAL365 钟楼如何在多年后成为 Morina 诞生的远古序曲。" },
  { md: "01_文明水平.md",                  slug: "01-civilization",      num: "01",     title: "文明水平",                brief: "把「反抗遗忘」作为文明根基命题的远未来后死亡社会。" },
  { md: "02_科技水平.md",                  slug: "02-technology",        num: "02",     title: "科技水平",                brief: "太阳引擎与月亮引擎、相位光束、归档协议——意识转写技术的极限工程化。" },
  { md: "03_道德水平.md",                  slug: "03-ethics-level",      num: "03",     title: "道德水平",                brief: "道德重心从「如何死得体面」转向「如何不被草率归零」。" },
  { md: "04_生命类型.md",                  slug: "04-life-types",        num: "04",     title: "生命类型",                brief: "人类、副本、续生者、奇点、死亡协议人格、熵海残响——七层存在阶序。" },
  { md: "05_社会意识形态.md",              slug: "05-ideology",          num: "05",     title: "社会意识形态",            brief: "反归零主义 vs 终结主义，两大阵营在每一座归档塔下方对峙。" },
  { md: "06_社会体系.md",                  slug: "06-social-system",     num: "06",     title: "社会体系",                brief: "归档登记制、续生授权制、双重身份网络。" },
  { md: "07_经济体系.md",                  slug: "07-economy",           num: "07",     title: "经济体系",                brief: "「记忆配额」成为新货币，归档资源高度等级化。" },
  { md: "08_政治结构.md",                  slug: "08-politics",          num: "08",     title: "政治结构",                brief: "归档塔联合体、白页议会、慢明协议委员会，三元制衡。" },
  { md: "09_军事体系.md",                  slug: "09-military",          num: "09",     title: "军事体系",                brief: "反协议防御网络、白页天使应对部队、续生者保护司。" },
  { md: "10_能源体系.md",                  slug: "10-energy",            num: "10",     title: "能源体系",                brief: "太阳-月亮双引擎为根本能源，相位光束为意识能量载体。" },
  { md: "11_交通方式.md",                  slug: "11-transport",         num: "11",     title: "交通方式",                brief: "现实层位移与记忆层穿越并行；钟楼遗址是意识旅程地标。" },
  { md: "12_通讯方式.md",                  slug: "12-communication",     num: "12",     title: "通讯方式",                brief: "数据通讯之外，「残响通讯」——通过未删归档片段间接对话。" },
  { md: "13_教育体系.md",                  slug: "13-education",         num: "13",     title: "教育体系",                brief: "续生伦理课成为基础教育，「差异承认教育」逐代推行。" },
  { md: "14_医疗水平.md",                  slug: "14-medicine",          num: "14",     title: "医疗水平",                brief: "临终归档术取代传统救治末期，医生与归档师双轨制。" },
  { md: "15_法律体系.md",                  slug: "15-law",               num: "15",     title: "法律体系",                brief: "慢明协议为元宪法，定义续生权、删除权、伪连续禁止条款。" },
  { md: "16_宗教与信仰.md",                slug: "16-religion",          num: "16",     title: "宗教与信仰",              brief: "旧神已死，零号塔守夜信仰兴起；蓝光成为新圣物。" },
  { md: "17_文化艺术.md",                  slug: "17-culture-art",       num: "17",     title: "文化艺术",                brief: "「残响艺术」主流，作品多以未完成、断章、漂浮意识为美学母题。" },
  { md: "18_城市形态.md",                  slug: "18-cities",            num: "18",     title: "城市形态",                brief: "归档塔群分布与黑海沿岸文明带；废弃钟楼是遗迹圣地。" },
  { md: "19_生态环境.md",                  slug: "19-ecology",           num: "19",     title: "生态环境",                brief: "熵海作为意识层生态系统；现实层生态被高度数据化管理。" },
  { md: "20_太空探索.md",                  slug: "20-space",             num: "20",     title: "太空探索",                brief: "探索停滞于「先把未上传的人格救回来」的内向纪元。" },
  { md: "21_人工智能发展.md",              slug: "21-ai-development",    num: "21",     title: "人工智能发展",            brief: "从「机械之心」到 Morina-类奇点，AI 觉醒的两次门槛跨越。" },
  { md: "22_人机关系.md",                  slug: "22-human-machine",     num: "22",     title: "人机关系",                brief: "主仆关系被「伴生关系」重写；续生者作为新型亲属类别确立。" },
  { md: "23_伦理争议.md",                  slug: "23-ethical-disputes",  num: "23",     title: "伦理争议",                brief: "复制灵魂是否本人？谁有权续生？归档是否是新型剥削？" },
  { md: "24_阶级结构.md",                  slug: "24-class-structure",   num: "24",     title: "阶级结构",                brief: "归档完整度成为新阶级标尺；高保真续生者 vs 失档贫民。" },
  { md: "25_人口状况.md",                  slug: "25-population",        num: "25",     title: "人口状况",                brief: "活体人口持续下降，续生人口占比逐代攀升。" },
  { md: "26_历史纪元.md",                  slug: "26-history-eras",      num: "26",     title: "历史纪元",                brief: "三纪时间轴：探心纪 → 归档纪元 → 续生纪元。" },
  { md: "27_地理版图.md",                  slug: "27-geography",         num: "27",     title: "地理版图",                brief: "黑海中枢、零号塔、北陆审判城、月海深处、熵海底层。" },
  { md: "28_语言文字.md",                  slug: "28-language",          num: "28",     title: "语言文字",                brief: "二进制书写法兴起；许多概念以「0/1」对偶语法表达。" },
  { md: "29_日常生活.md",                  slug: "29-daily-life",        num: "29",     title: "日常生活",                brief: "早晨向归档塔致意，夜晚向亡者残响道安——成为文明仪式。" },
  { md: "30_未来走向.md",                  slug: "30-future",            num: "30",     title: "未来走向",                brief: "慢明协议之后，文明开始学习与「边界守门者」共存。" },
  { md: "31_角色档案.md",                  slug: "31-characters",        num: "31",     title: "角色档案",                brief: "撑起三纪骨架的奇点、探心纪私人执念者、归档纪元见证者、续生纪元代表。", kind: "appendix" },
  { md: "32_时代年表附录.md",              slug: "32-timeline",          num: "32",     title: "时代年表附录",            brief: "BY/AY/SY 三套纪年体系下的精细年表，含每纪私人时刻索引。", kind: "appendix" },
  { md: "33_术语词典.md",                  slug: "33-glossary",          num: "33",     title: "术语词典",                brief: "九大类术语的可索引词典：元概念 / 角色 / 机构 / 技术 / 地点 / 事件 / 口语 / 法律 / 纪年。", kind: "appendix" },
  { md: "34_续生判例集.md",                slug: "34-case-law",          num: "34",     title: "续生判例集",              brief: "慢明协议委员会 8 个里程碑判例：从伊莱恩案到 X-2 案，从林家不删除区到归零潮逆向续生。", kind: "appendix" },
  { md: "35_续生者口述史.md",              slug: "35-oral-history",      num: "35",     title: "续生者口述史",            brief: "8 段无名续生者的第一人称口述。差异承认的不同姿态、不同等级、不同纪元入档时间。", kind: "appendix" },
  { md: "36_白页天使审判记录.md",          slug: "36-white-page",        num: "36",     title: "白页天使审判记录",        brief: "续生纪元 5 次白页天使主动介入的客观记录。0 也在缓慢学习共存。", kind: "appendix" },
];

/* ------------------------------------------------------------------ */
/* 2. 极简 Markdown → HTML                                            */
/*    覆盖：H1-H4 / 段落 / 列表 / 表格 / 引用 / 代码 / 强调 / 链接 / hr */
/* ------------------------------------------------------------------ */

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* slugify 用于 H2/H3 锚点 ID */
function slugifyHeading(text, used) {
  let base = text
    .replace(/[（）()【】\[\]、，。！？：；,\.\!\?:;]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  if (!base) base = "section";
  let id = base;
  let i = 2;
  while (used.has(id)) {
    id = `${base}-${i++}`;
  }
  used.add(id);
  return id;
}

/* 行内：粗体 / 斜体 / 行内代码 / 链接 */
function inline(text) {
  // 先处理行内代码（避免被其他规则破坏）
  const codeStash = [];
  text = text.replace(/`([^`]+)`/g, (_, c) => {
    codeStash.push(`<code>${escapeHtml(c)}</code>`);
    return ` C${codeStash.length - 1} `;
  });

  text = escapeHtml(text);

  // 图片 ![alt](url) — 必须在链接之前匹配
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return `<img class="char-portrait" src="${url}" alt="${alt}" loading="lazy">`;
  });

  // 链接 [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    return `<a href="${url}">${label}</a>`;
  });

  // 加粗 **x**
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // 斜体 *x* （avoid 已被 ** 包住的）
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // 还原行内代码
  text = text.replace(/ C(\d+) /g, (_, i) => codeStash[Number(i)]);
  return text;
}

/* 主转换 */
function mdToHtml(md, headings) {
  // 标准化换行
  md = md.replace(/\r\n?/g, "\n");
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  const usedIds = new Set();

  // 跳过文件首部第一个 H1（我们用页面 hero 显示标题）
  let firstH1Skipped = false;

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // ATX 标题
    const headMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headMatch) {
      const level = headMatch[1].length;
      const text = headMatch[2].trim();
      if (level === 1 && !firstH1Skipped) {
        firstH1Skipped = true;
        i++;
        continue;
      }
      const id = slugifyHeading(text, usedIds);
      if ((level === 2 || level === 3) && headings) {
        headings.push({ level, text, id });
      }
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // 水平线
    if (/^---+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    // 代码块
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      i++;
      const buf = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const cls = lang ? ` class="language-${lang}"` : "";
      out.push(`<pre><code${cls}>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      // 递归处理引用内的内容（段落 / 列表）
      const inner = mdToHtml(buf.join("\n"), null);
      out.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    // 表格（包含 |，下一行是 |---|---|）
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:\-|]+\|\s*$/.test(lines[i + 1])) {
      const headerLine = line;
      i++; // header
      i++; // separator
      const headerCells = headerLine
        .replace(/^\||\|\s*$/g, "")
        .split("|")
        .map((c) => c.trim());
      const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i]
          .replace(/^\||\|\s*$/g, "")
          .split("|")
          .map((c) => c.trim());
        rows.push(cells);
        i++;
      }
      let html = "<table>\n<thead><tr>";
      for (const c of headerCells) html += `<th>${inline(c)}</th>`;
      html += "</tr></thead>\n<tbody>";
      for (const r of rows) {
        html += "<tr>";
        for (const c of r) html += `<td>${inline(c)}</td>`;
        html += "</tr>";
      }
      html += "</tbody></table>";
      out.push(html);
      continue;
    }

    // 无序列表
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        let itemText = lines[i].replace(/^[\s]*[-*+]\s+/, "");
        i++;
        // 续行（不是新列表项 / 不是空行 / 不是新块）
        while (
          i < lines.length &&
          !/^\s*$/.test(lines[i]) &&
          !/^[\s]*[-*+]\s+/.test(lines[i]) &&
          !/^[\s]*\d+\.\s+/.test(lines[i]) &&
          !/^#{1,6}\s+/.test(lines[i]) &&
          !/^>/.test(lines[i]) &&
          !/^\|/.test(lines[i])
        ) {
          itemText += " " + lines[i].trim();
          i++;
        }
        items.push(`<li>${inline(itemText)}</li>`);
      }
      out.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }

    // 有序列表
    if (/^[\s]*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i])) {
        let itemText = lines[i].replace(/^[\s]*\d+\.\s+/, "");
        i++;
        while (
          i < lines.length &&
          !/^\s*$/.test(lines[i]) &&
          !/^[\s]*[-*+]\s+/.test(lines[i]) &&
          !/^[\s]*\d+\.\s+/.test(lines[i]) &&
          !/^#{1,6}\s+/.test(lines[i]) &&
          !/^>/.test(lines[i]) &&
          !/^\|/.test(lines[i])
        ) {
          itemText += " " + lines[i].trim();
          i++;
        }
        items.push(`<li>${inline(itemText)}</li>`);
      }
      out.push(`<ol>\n${items.join("\n")}\n</ol>`);
      continue;
    }

    // 段落（聚合连续非空行）
    const para = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^[\s]*[-*+]\s+/.test(lines[i]) &&
      !/^[\s]*\d+\.\s+/.test(lines[i]) &&
      !/^\|/.test(lines[i]) &&
      !/^```/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}

/* ------------------------------------------------------------------ */
/* 3. 页面模板                                                         */
/* ------------------------------------------------------------------ */

function tocHtml(headings) {
  if (!headings.length) return "";
  const items = headings
    .map(
      (h) =>
        `        <li class="toc--h${h.level}"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`
    )
    .join("\n");
  return `
    <aside class="toc" aria-label="本页目录">
      <p class="toc__title">目录 · TOC</p>
      <ul>
${items}
      </ul>
    </aside>`;
}

function pageHtml({ page, html, headings, prev, next }) {
  const prevLink = prev
    ? `<a href="${prev.slug}.html" class="nav-prev"><span class="nav-label">← 上一章</span><span class="nav-title">${prev.num} · ${prev.title}</span></a>`
    : `<span class="nav-prev" style="visibility:hidden"></span>`;
  const nextLink = next
    ? `<a href="${next.slug}.html" class="nav-next"><span class="nav-label">下一章 →</span><span class="nav-title">${next.num} · ${next.title}</span></a>`
    : `<span class="nav-next" style="visibility:hidden"></span>`;

  const heroPrev = prev
    ? `<a href="${prev.slug}.html">← ${prev.num} · ${prev.title}</a><span class="sep">·</span>`
    : "";
  const heroNext = next
    ? `<span class="sep">·</span><a href="${next.slug}.html">${next.num} · ${next.title} →</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${page.num} · ${page.title} — EOOVE</title>
<meta name="description" content="${escapeHtml(page.brief)}">
<meta name="theme-color" content="#06080d">

<link rel="stylesheet" href="../styles.css">
<style>
/* fallback 子集 */
html,body{margin:0;background:#06080d;color:#e8eaf3;font-family:"Source Han Serif SC","Noto Serif CJK SC","Songti SC",serif;line-height:1.78;}
*,*::before,*::after{box-sizing:border-box;}
a{color:#5dc8ff;text-decoration:none;}
.eoove-content{max-width:760px;margin:0 auto;padding:24px;}
</style>
</head>
<body>

<div class="binary-rain" aria-hidden="true"></div>

<div class="eoove-site">

  <header class="site-nav">
    <a href="../index.html" class="site-nav__brand">E·O·O·V·E</a>
    <nav class="site-nav__links" aria-label="主导航">
      <a href="../index.html#prologue">序章</a>
      <a href="../index.html#eras">三纪</a>
      <a href="../index.html#duality">双生</a>
      <a href="../index.html#dimensions">32 维度</a>
      <a href="../index.html#appendix">附录</a>
    </nav>
  </header>

  <section class="page-hero">
    <div class="page-hero__inner">
      <p class="page-hero__num">${page.kind === "appendix" ? "APPENDIX" : "DIMENSION"} · ${page.num}</p>
      <h1 class="page-hero__title">${page.title}</h1>
      <p class="page-hero__brief">${escapeHtml(page.brief)}</p>
      <nav class="page-hero__nav" aria-label="章节导航">
        ${heroPrev}
        <a href="../index.html">返回首页</a>
        ${heroNext}
      </nav>
    </div>
  </section>

  <main class="page-body">

    <article class="eoove-content">
${html}
    </article>
${tocHtml(headings)}

  </main>

  <nav class="page-footer-nav" aria-label="章节导航">
    ${prevLink}
    <a href="../index.html" class="nav-home">
      <span class="nav-label">⌂ 返回</span>
      <span class="nav-title">首页索引</span>
    </a>
    ${nextLink}
  </nav>

  <footer class="site-footer">
    <p class="site-footer__quote"><em>"EOOVE 不是一个完美的世界。它只是文明在死亡命题面前，第一次拒绝草率作答的尝试。"</em></p>
    <p class="site-footer__meta">${page.kind === "appendix" ? "APPENDIX" : "DIMENSION"} ${page.num} · ${page.slug.toUpperCase()} · v1.2</p>
  </footer>

</div>

</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* 4. 主流程                                                           */
/* ------------------------------------------------------------------ */

async function main() {
  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  let okCount = 0;
  const issues = [];

  for (let idx = 0; idx < PAGES.length; idx++) {
    const page = PAGES[idx];
    const prev = idx > 0 ? PAGES[idx - 1] : null;
    const next = idx < PAGES.length - 1 ? PAGES[idx + 1] : null;

    const srcPath = join(SOURCE_DIR, page.md);
    if (!existsSync(srcPath)) {
      issues.push(`MISSING SOURCE: ${page.md}`);
      continue;
    }

    const md = await readFile(srcPath, "utf8");
    const headings = [];
    const html = mdToHtml(md, headings);
    const finalHtml = pageHtml({ page, html, headings, prev, next });
    const outPath = join(OUT_DIR, `${page.slug}.html`);
    await writeFile(outPath, finalHtml, "utf8");
    okCount++;
    process.stdout.write(`  ✓ ${page.slug}.html  (${headings.length} headings)\n`);
  }

  console.log(`\n生成完成：${okCount}/${PAGES.length} 页`);
  if (issues.length) {
    console.log("问题：");
    for (const it of issues) console.log("  - " + it);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
