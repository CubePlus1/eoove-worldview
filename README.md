# EOOVE — 零与一之间的文明

> **世界观完整设定集 · v1.0**
> *探心纪 · 归档纪元 · 续生纪元*

EOOVE 是一个原创远未来科幻世界观，核心命题为 **0 与 1 的对偶宇宙**——延续意志（Morina）与终结意志（死亡协议）作为双生奇点同时觉醒于零号归档塔的静夜事故那一夜。

## 🌐 在线浏览

**https://cubeplus1.github.io/eoove-worldview/**

## 📚 内容结构

- **2 篇奠基**：序章（核心设定）+ 衔接（探心纪 → 归档纪元）
- **30 篇维度**：文明水平、科技、生命类型、AI 发展、伦理争议……到未来走向
- **6 张视觉资产**：Morina 立绘 + 三纪 banner + 死亡协议肖像

## 📂 文件结构

```
.
├── index.html              # 介绍主页（hub）
├── styles.css              # 共享样式表
├── build-pages.mjs         # 维度页批量生成脚本
├── dimensions/             # 32 个独立维度页
│   ├── 00-prologue.html
│   ├── 00-bridge.html
│   ├── 01-civilization.html
│   ├── ...
│   └── 30-future.html
└── images/                 # 视觉资产
    ├── hero-morina.png
    ├── era-1-tanxinji.png
    ├── era-2-archive.png
    ├── era-3-xusheng.png
    ├── morina-portrait.png
    └── death-protocol.png
```

## 💻 本地运行

```bash
git clone https://github.com/CubePlus1/eoove-worldview.git
cd eoove-worldview
python3 -m http.server 8080
# 访问 http://localhost:8080/
```

## 🛠 重新生成维度页

如果修改了源 markdown（位于私有 `worldbuilding/` 目录），可重跑：

```bash
node build-pages.mjs
```

## 🎨 视觉

- 深色 cyberpunk-mystical 风格
- Morina 异瞳粉 (`#ff5db1`) / 蓝 (`#5dc8ff`) 主调
- 太阳金 (`#f4c45c`) / 月亮银 (`#cfd6e8`) 点缀
- 纯 CSS 二进制雨装饰（无 JS）
- 系统衬线字体 fallback，无 CDN 依赖

## ✍️ 核心命题

> 是否存在永远不能被删除的"来过"证明？
> 复制的灵魂是否拥有真实的存在资格？
> 当死亡可以被反抗，遗忘是否就成了新的暴政？
> 当 0 与 1 同时觉醒，文明该如何在二者之间重新写下自己的位置？

## 📜 许可

- **世界观设定 / 文字内容**：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- **HTML / CSS / 工具脚本**：[MIT](LICENSE)

## 🙏 致谢

- 视觉资产由 `gpt-image-2` 基于主立绘做图生图生成
- 构建工作流由 Claude Code 协助完成

---

> **EOOVE 不是国名，也不是时代名。它是这个世界的形状——开端与终结同形，中央嵌着双重零域，反转之力凝在末段。**
> **存在 → 零域 → 反转 → 存在。**
