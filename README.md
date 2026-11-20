# CodeGraph

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Stars](https://img.shields.io/github/stars/codegraph/codegraph?style=social)](https://github.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/)
[![Made with React](https://img.shields.io/badge/Made%20with-React-61dafb.svg)](https://react.dev/)
[![Made with TypeScript](https://img.shields.io/badge/Made%20with-TypeScript-3178c6.svg)](https://www.typescriptlang.org/)

**在浏览器里看见代码之间的隐形连线 —— 粘贴源码，立刻得到一张会动的依赖图谱。**

CodeGraph 用 TypeScript 编译器 AST 解析 TS / JS 源码中的 import / export / 动态 import / require 关系，
再用手写 SVG 力导向算法把文件与依赖画成可交互的图谱，同时自动找出循环依赖、孤儿节点和枢纽节点。
所有计算都在本地浏览器完成，代码不会离开你的电脑。

## ✨ 特性

- **真实 AST 解析**：基于 `typescript` 的 `ts.createSourceFile`，支持 `.ts / .tsx / .js / .jsx`，识别静态 import、re-export、`import()`、`require()` 与 type-only 引用；单个文件语法异常会优雅降级，不影响其余文件。
- **三种输入方式**：粘贴带 `// @file 路径` 分隔符的多文件代码、上传本地文件、或一键加载内置 11 文件示例项目。
- **手写力导向布局**：斥力 + 弹簧引力 + 向心力 + 阻尼，`requestAnimationFrame` 逐帧迭代；节点大小按度数缩放，发光效果纯 SVG 实现。
- **可交互图谱**：拖拽节点、滚轮缩放、空白处平移；点击节点高亮一跳邻居并淡出其余节点；支持按目录 / 文件类型着色。
- **依赖体检**：DFS 三色标记检测所有有向环并高亮环上边，列出孤儿节点与度数 Top 5 枢纽，统计文件数、依赖边数、环数与平均度数。
- **零后端、零重型依赖**：除 React 与 TypeScript 外没有图表库、UI 框架或状态库；图谱和动效都是内联 SVG + 原生 CSS。

## 🚀 快速开始

```bash
git clone https://github.com/codegraph/codegraph.git
cd codegraph
npm install
npm run dev
```

打开终端提示的地址（默认 `http://localhost:5173`）。生产构建：

```bash
npm run build
npm run preview
```

## 🎮 核心玩法

1. **打开即有图**：首次进入自动加载内置示例项目，包含 11 个文件、多个循环依赖和一个孤儿文件。
2. **换上自己的代码**：在左侧文本域粘贴源码，多文件之间用 `// @file src/xxx.ts` 分隔；也可以直接上传文件（按住 Shift 选多个）。
3. **解析**：点「解析代码」，右侧图谱会重新计算并重新布局。裸模块（如 `react`）默认不纳入节点，图谱聚焦项目内部依赖。
4. **体检**：左侧「依赖分析」面板点环 / 孤儿 / 枢纽条目，右侧会聚焦对应节点；环上的边以粉红色高亮。
5. **探索**：右上角可按文件名搜索、切换着色方式、重新布局；滚轮缩放，拖拽节点或空白处平移。

分隔符也支持 `===== src/xxx.ts =====` 和 `--- src/xxx.ts ---` 形式。

## 📸 截图

<!-- 截图占位：将截图放到 docs/screenshot.png 后替换下面的链接 -->
![CodeGraph 界面](docs/screenshot.png)

> 建议截图位置：左侧输入 + 分析面板，右侧力导向图谱，含一条高亮的循环依赖。

## 🧩 目录结构

```
codegraph/
├── src/
│   ├── parser.ts            # AST 解析、路径解析、多文件文本切分
│   ├── graph.ts             # 环检测、统计、配色
│   ├── sampleProject.ts     # 内置示例项目源码
│   ├── components/
│   │   └── GraphCanvas.tsx  # SVG 力导向画布与交互
│   ├── App.tsx              # 布局与业务面板
│   └── index.css            # 深色霓虹主题
├── index.html
├── package.json
└── vite.config.ts
```

## 📄 License

[MIT](./LICENSE) © CodeGraph contributors
