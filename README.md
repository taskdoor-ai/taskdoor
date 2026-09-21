# TaskDoor

TaskDoor 将任务创建、团队协作和任务完成连接成一个闭环：根据历史任务辅助拆解、明确责任与分配，连接本地 Agent 工作，再将产出与协作内容回填到任务中，供团队继续推进和确认完成。

## 两个入口

| 内容 | 入口 | 用途 |
| --- | --- | --- |
| 项目代码 | [`src/`](src/) | Web 产品界面与交互 |
| PRD 文档 | [`docs/prd/index.md`](docs/prd/index.md) | 产品需求、流程与验收说明 |
| PRD 图文预览 | [`public/prd/index.html`](public/prd/index.html) | 本地打开查看分类截图与完整文档 |

## 项目代码

| 目录 | 内容 |
| --- | --- |
| `src/` | React / TypeScript 前端、组件、示例数据及测试工作台 |
| `styles/` | 共享样式 |
| `server/` | 本地开发服务、存储与相关测试 |
| `mcp/` | MCP 服务与集成说明，见 [MCP README](mcp/README.md) |
| `scripts/` | 构建、校验及开发工具 |
| `public/` | 静态资源；其中 `prd/` 为生成的文档站点 |

使用支持当前 Vite 版本的 Node.js（建议 Node.js 22.12+）：

```sh
npm ci --legacy-peer-deps
npm run dev -- --host 127.0.0.1
```

开发入口为 `http://127.0.0.1:5173/`。当前项目包含原型和 mock 数据；具体实现范围以代码及 [实现状态表](docs/prd/current-implementation-matrix.md) 为准。

常用命令：

```sh
npm run build        # 类型检查及前端构建
npm run build:mcp    # MCP 构建
npm test            # 服务端测试（按需运行）
```

本地配置、运行时数据、依赖及构建缓存不入库。

## PRD 文档

PRD 的内容源位于 **`docs/prd/`**，与项目代码分开维护：

- [`index.md`](docs/prd/index.md)：阅读目录。
- [`modules/`](docs/prd/modules/)：各模块需求与验收说明。
- [`assets/`](docs/prd/assets/)：截图及示意图。
- [`CHANGELOG.md`](docs/prd/CHANGELOG.md)：需求变更记录。
- [`README.md`](docs/prd/README.md)：维护规则。

生成可浏览的 HTML：

```sh
node scripts/build-agentdoor-prd.mjs
```

生成结果为 `public/prd/index.html`，可直接在浏览器打开；启动开发服务后也可访问 `http://127.0.0.1:5173/prd/`。修改 PRD 时先更新 Markdown 内容源，再重新生成页面。

## 配套资料与历史内容

`brand/` 保存品牌素材，`diagram/` 保存图示，`skills/` 保存项目技能与规范，`docs/` 和 `RESEARCH/` 保存设计、研究及开发资料。`output/`、`outputs/` 包含历史导出与验证产物，其中旧版 PDF 不代表当前 PRD；当前需求请以上述 PRD 入口为准。

部分历史文件名与内部标识仍使用 `agentdoor`，产品名称为 **TaskDoor**。
