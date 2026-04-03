# @kbuley/skills

AI agent skills for Claude Code, Cursor, Gemini CLI, Codex, Kiro, and Copilot.

Skills are installed into a `kbuley/` namespace inside your agent's skills directory so they stay organized alongside skills from other sources.

## Installation

```sh
npx @kbuley/skills             # Claude Code (default)
npx @kbuley/skills --claude    # Claude Code
npx @kbuley/skills --cursor    # Cursor
npx @kbuley/skills --gemini    # Gemini CLI
npx @kbuley/skills --codex     # Codex CLI
npx @kbuley/skills --kiro      # Kiro
npx @kbuley/skills --copilot   # Copilot
```

Multiple targets at once:

```sh
npx @kbuley/skills --claude --copilot
```

Custom directory (no namespace applied):

```sh
npx @kbuley/skills --path ./my-skills
```

### Install paths

| Agent | Path |
|---|---|
| Claude Code | `~/.claude/skills/kbuley/` |
| Cursor | `~/.cursor/skills/kbuley/` |
| Gemini CLI | `~/.gemini/skills/kbuley/` |
| Codex CLI | `~/.codex/skills/kbuley/` |
| Kiro | `~/.kiro/skills/kbuley/` |
| Copilot (macOS/Linux) | `~/.copilot/skills/kbuley/` |
| Copilot (Windows) | `%USERPROFILE%\.copilot\skills\kbuley\` |

Re-running the installer updates existing skills and removes any that have been deleted.

## Skills

### `kbuley-taskfile`

Create, modify, and review Taskfiles following [Task](https://taskfile.dev) best practices.

Covers schema, patterns, style conventions, templating, CLI flags, Makefile-to-Taskfile migration, and common workflow patterns.

**Triggers:** `taskfile`, `Taskfile.yaml`, `task:`, `create task`, `task --list`, `Makefile to Taskfile`

## License

MIT
