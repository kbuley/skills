# @kbuley/skills

AI agent skills for Claude Code, Cursor, Gemini CLI, Codex, Kiro, and Copilot.

Skills use a `kbuley-` name prefix so they stay organized alongside skills from other sources.

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
| Claude Code | `~/.claude/skills/` |
| Cursor | `~/.cursor/skills/` |
| Gemini CLI | `~/.gemini/skills/` |
| Codex CLI | `~/.codex/skills/` |
| Kiro | `~/.kiro/skills/` |
| Copilot (macOS/Linux) | `~/.copilot/skills/` |
| Copilot (Windows) | `%USERPROFILE%\.copilot\skills\` |

Skills use a `kbuley-` name prefix to avoid collisions with skills from other sources. Re-running the installer updates existing skills and removes any that have been deleted.

## Skills

### `kbuley-taskfile`

Create, modify, and review Taskfiles following [Task](https://taskfile.dev) best practices.

Covers schema, patterns, style conventions, templating, CLI flags, Makefile-to-Taskfile migration, and common workflow patterns.

**Triggers:** `taskfile`, `Taskfile.yaml`, `task:`, `create task`, `task --list`, `Makefile to Taskfile`

## License

MIT
