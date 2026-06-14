# Contract: MCP Configuration

## User-facing configuration shape

```json
{
  "mcpServers": {
    "filesystem": {
      "enabled": true,
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "env": {
        "EXAMPLE_TOKEN": "${EXAMPLE_TOKEN}"
      }
    },
    "remote-tools": {
      "enabled": true,
      "transport": "http",
      "url": "https://example.invalid/mcp",
      "headers": {
        "Authorization": "Bearer ${REMOTE_TOOLS_TOKEN}"
      }
    }
  }
}
```

## Validation contract

| Rule | Expected outcome |
|------|------------------|
| `mcpServers` omitted | No MCP servers configured; app still starts |
| Server name empty | Config validation error |
| Duplicate server names | Later config layer overrides earlier layer |
| `transport: "stdio"` without `command` | Config validation error |
| `transport: "http"` without `url` | Config validation error |
| Unknown transport | Config validation error |
| `enabled: false` | Server remains disabled and is not connected |

## Permission contract

Supported rule keys:

```text
mcp__*
mcp__<serverName>__*
mcp__<serverName>__<toolName>
```

Evaluation contract:

1. Deny rules are evaluated before allow rules.
2. Explicit allow permits auto-approval when no deny matches.
3. Explicit ask forces user approval when no deny matches.
4. No match for an MCP tool returns ask.
