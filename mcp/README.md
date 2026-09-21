# TaskDoor MCP App

提供两步式任务创建：模型调用 `agentdoor_prepare_task` 生成草案和嵌入卡片；用户点击卡片中的“确认并创建任务”后，页面调用仅对 App 可见的 `agentdoor_create_task` 完成写入。

## 运行

```bash
npm run build:mcp
npm run mcp             # stdio
npm run mcp:http        # Streamable HTTP: http://127.0.0.1:8787/mcp
```

stdio 客户端配置示例：

```json
{
  "mcpServers": {
    "agentdoor": {
      "command": "node",
      "args": ["/absolute/path/to/agentdoor2/dist-mcp/server.js", "--stdio"]
    }
  }
}
```

已确认任务默认持久化到 `data/mcp-tasks.json`，也可通过 `AGENTDOOR_TASK_STORE` 指定其他位置。当前写入层是可运行的本地存储适配器；接入正式 TaskDoor API 时，只需替换 `persist()`。
