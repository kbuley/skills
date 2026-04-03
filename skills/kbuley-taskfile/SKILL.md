---
name: kbuley-taskfile
description: >
  Create, modify, review, and improve Taskfiles following Task (https://taskfile.dev) best
  practices. Covers schema, patterns, style conventions, templating, CLI flags, and
  Makefile-to-Taskfile migration.

  Use when: creating new tasks or Taskfiles, modifying existing task definitions, adding
  includes, debugging task execution, translating Makefiles, or answering questions about
  Taskfile syntax, patterns, or available tasks.

  Triggers: "taskfile", "Taskfile.yaml", "task command", "task:", "create task", "add task",
  "task --list", "Makefile to Taskfile", "task runner", "taskfile.dev", "task run", "task build"
user-invocable: false
---

# Taskfile Development

## Overview

Taskfile is a YAML-based task runner. Tasks are defined in `Taskfile.yaml` (or `.yml`, `.dist.yml`
variants). Always use version `"3"`.

---

## Style Conventions

| Convention | Correct | Avoid |
|---|---|---|
| Indentation | 2 spaces | tabs / 4 spaces |
| Variable names | `BUILD_DIR`, `VERSION` | `build_dir`, `version` |
| Task names | `build-docker`, `run-tests` | `build_docker`, `runTests` |
| Namespacing | `docker:build`, `test:unit` | flat names for large Taskfiles |
| Template variables | `{{.VAR}}` | `{{ .VAR }}` |

**Section order**: `version` → `includes` → `output/silent/method/run` → `vars` → `env`/`dotenv` → `tasks`

Separate sections with blank lines. Separate task definitions with blank lines.

---

## File Template

Always include the schema comment and version:

```yaml
# yaml-language-server: $schema=https://taskfile.dev/schema.json
version: "3"

silent: true

vars:
  BUILD_DIR: "{{.ROOT_DIR}}/build"

tasks:
  default:
    desc: Show available tasks
    cmds:
      - task --list
```

---

## Core Primitives

| Primitive | Purpose |
|---|---|
| `cmds` | Sequential commands to run |
| `deps` | Tasks to run first (parallel by default) |
| `vars` | Task-scoped or global variables |
| `env` | Environment variables |
| `dir` | Working directory for the task |
| `sources` / `generates` | Fingerprinting for skip-if-up-to-date |
| `status` | Shell commands; skip task if all exit 0 |
| `preconditions` | Conditions that must pass before running |
| `requires` | Required variables (fail with clear error if missing) |
| `internal` | Hide from `task --list` |
| `desc` | One-line description for `task --list` |
| `summary` | Detailed description for `task --summary` |
| `aliases` | Alternative task names |
| `platforms` | OS/arch restrictions |
| `prompt` | Confirmation prompt for destructive tasks |
| `label` | Custom display name (useful with wildcards) |
| `watch` | Re-run on file changes |

---

## Task Patterns

### Simple Task

```yaml
tasks:
  build:
    desc: Build the application
    cmds:
      - go build -o bin/app ./cmd/app
```

### Dependencies (parallel)

```yaml
tasks:
  ci:
    desc: Run full CI pipeline
    deps: [lint, test]
    cmds:
      - task: build
```

### Dynamic Variables

```yaml
tasks:
  build:
    vars:
      VERSION:
        sh: git describe --tags --always
    cmds:
      - go build -ldflags="-X main.Version={{.VERSION}}" -o bin/app
```

### Incremental Build (skip if up-to-date)

```yaml
tasks:
  build:
    desc: Build (skipped if sources unchanged)
    sources:
      - "**/*.go"
      - go.mod
      - go.sum
    generates:
      - bin/app
    cmds:
      - go build -o bin/app ./cmd/app
```

### Preconditions

```yaml
tasks:
  deploy:
    desc: Deploy to production
    preconditions:
      - sh: '[ -n "$AWS_PROFILE" ]'
        msg: AWS_PROFILE must be set
      - sh: git diff --quiet
        msg: Working directory must be clean
      - which aws
    cmds:
      - aws s3 sync ./dist s3://my-bucket
```

### Requires (required variables)

```yaml
tasks:
  deploy-env:
    requires:
      vars:
        - ENV
        - name: REGION
          enum: [us-east-1, us-west-2, eu-west-1]
    cmds:
      - echo "Deploying to {{.ENV}} in {{.REGION}}"
```

### Wildcard Tasks (parameterized)

```yaml
tasks:
  deploy-*:
    desc: Deploy a specific stack
    vars:
      STACK: "{{index .MATCH 0}}"
    label: deploy-{{.STACK}}
    preconditions:
      - test -d "stacks/{{.STACK}}"
    cmds:
      - terragrunt apply --working-dir stacks/{{.STACK}}

  # Multiple wildcards
  deploy-*-*:
    vars:
      ENV: "{{index .MATCH 0}}"
      APP: "{{index .MATCH 1}}"
    cmds:
      - echo "Deploying {{.APP}} to {{.ENV}}"
```

Usage: `task deploy-production` or `task deploy-prod-api`

### CLI Arguments (pass-through)

```yaml
tasks:
  new:
    desc: Create a new git worktree (task wt:new -- branch-name)
    requires:
      vars: [CLI_ARGS]
    vars:
      NAME: "{{.CLI_ARGS}}"
    cmds:
      - git worktree add -b "{{.NAME}}" "../{{.NAME}}"
```

Usage: `task new -- my-feature-branch`

### Internal Helper Tasks

```yaml
tasks:
  _run-command:
    internal: true
    requires:
      vars: [HOST, COMMAND]
    cmds:
      - ssh {{.HOST}} "{{.COMMAND}}"
```

### Looping Over Items

```yaml
tasks:
  lint-all:
    vars:
      PACKAGES: [./cmd/..., ./pkg/..., ./internal/...]
    cmds:
      - for: {var: PACKAGES}
        cmd: golangci-lint run {{.ITEM}}

  build-matrix:
    cmds:
      - for:
          matrix:
            OS: [linux, darwin, windows]
            ARCH: [amd64, arm64]
        cmd: GOOS={{.ITEM.OS}} GOARCH={{.ITEM.ARCH}} go build -o dist/app-{{.ITEM.OS}}-{{.ITEM.ARCH}}
```

### Deferred Cleanup

```yaml
tasks:
  test-with-db:
    cmds:
      - defer: docker rm -f test-db
      - docker run -d --name test-db postgres:16
      - go test ./...
```

### Destructive Task with Prompt

```yaml
tasks:
  drop-db:
    desc: Drop the development database
    prompt: This will permanently delete the dev database. Continue?
    cmds:
      - dropdb myapp_dev
```

### Source Tracking with Dynamic Vars

```yaml
tasks:
  fmt:
    desc: Format Terraform files
    vars:
      DIR: "{{.TASKFILE_DIR}}"
    sources:
      - "{{.DIR}}/**/*.tf"
    generates:
      - "{{.DIR}}/**/*.tf"
    cmds:
      - tofu fmt -recursive {{.DIR}}
```

### Watch Mode

```yaml
tasks:
  dev:
    desc: Run with hot reload
    watch: true
    sources: ["**/*.go"]
    cmds:
      - go run ./cmd/app
```

---

## Namespacing via Includes

```yaml
# Root Taskfile.yaml
includes:
  docker:
    taskfile: .taskfiles/docker/Taskfile.yaml
    dir: .taskfiles/docker

  api:
    taskfile: ./api/Taskfile.yaml
    dir: ./api
    optional: true          # Don't fail if file missing
    vars:
      ENV: production

  tools:
    taskfile: .taskfiles/tools
    internal: true          # Hide all included tasks from --list
```

```
# Recommended layout for larger projects
Taskfile.yaml
.taskfiles/
  docker/
    Taskfile.yaml
    scripts/
      build.sh
  api/
    Taskfile.yaml
  tools/
    Taskfile.yaml
```

---

## Makefile to Taskfile Translation

| Makefile | Taskfile |
|---|---|
| `.PHONY: target` | Not needed (all tasks are phony) |
| `target: dep1 dep2` | `deps: [dep1, dep2]` |
| `$(VAR)` | `{{.VAR}}` |
| `@command` (silent) | `silent: true` or per-cmd `silent:` |
| `$@` (target name) | `{{.TASK}}` |
| `.DEFAULT_GOAL := build` | `default` task name |
| `include file.mk` | `includes: {name: {taskfile: file.yaml}}` |
| `ifeq`/`ifneq` | `{{if eq .VAR "val"}}...{{end}}` in cmd |
| `$(shell cmd)` | `sh: cmd` in var definition |

**Before**:
```makefile
.PHONY: build clean test

VERSION := $(shell git describe --tags)
BUILD_DIR := ./build

build: clean
	@go build -ldflags="-X main.Version=$(VERSION)" -o $(BUILD_DIR)/app ./cmd/app

clean:
	rm -rf $(BUILD_DIR)

test:
	go test -v ./...
```

**After**:
```yaml
# yaml-language-server: $schema=https://taskfile.dev/schema.json
version: "3"

silent: true

vars:
  VERSION:
    sh: git describe --tags
  BUILD_DIR: ./build

tasks:
  default:
    desc: Show available tasks
    cmds:
      - task --list

  build:
    desc: Build the application
    deps: [clean]
    sources: ["**/*.go", go.mod]
    generates: ["{{.BUILD_DIR}}/app"]
    vars:
      VERSION:
        sh: git describe --tags --always
    cmds:
      - go build -ldflags="-X main.Version={{.VERSION}}" -o {{.BUILD_DIR}}/app ./cmd/app

  clean:
    desc: Remove build artifacts
    cmds:
      - rm -rf {{.BUILD_DIR}}

  test:
    desc: Run tests
    cmds:
      - go test -v ./...
```

---

## Common Workflow Patterns

### Development

```yaml
tasks:
  dev:
    desc: Start development server with hot reload
    watch: true
    sources: ["**/*.go"]
    cmds:
      - go run ./cmd/app

  test:
    desc: Run tests
    cmds:
      - go test -race -v ./...

  lint:
    desc: Run linters
    cmds:
      - golangci-lint run ./...

  check:
    desc: Run lint + test (CI gate)
    cmds:
      - task: lint
      - task: test
```

### Docker

```yaml
tasks:
  docker:build:
    desc: Build Docker image
    vars:
      TAG: '{{default "latest" .TAG}}'
      IMAGE: myapp
    cmds:
      - docker build -t {{.IMAGE}}:{{.TAG}} .

  docker:push:
    desc: Push image to registry
    deps: [docker:build]
    cmds:
      - docker push myapp:{{.TAG}}

  docker:run:
    desc: Run container locally
    cmds:
      - docker run --rm -p 8080:8080 myapp:latest
```

### Release

```yaml
tasks:
  release:
    desc: Create a new release
    preconditions:
      - sh: git diff --quiet
        msg: Working directory must be clean
      - sh: '[ "$(git branch --show-current)" = "main" ]'
        msg: Must be on main branch
    prompt: Create a new release?
    cmds:
      - goreleaser release --clean
```

---

## Script Extraction

Prefer external scripts over embedded multi-line commands:

```yaml
# Correct — complex logic in a script
tasks:
  bootstrap:
    cmds:
      - .taskfiles/scripts/bootstrap.sh

# Avoid — complex logic inline
tasks:
  bootstrap:
    cmds:
      - |
        if [ ! -f .env ]; then
          cp .env.example .env
          sed -i '' 's/placeholder/value/' .env
        fi
```

Script header standard:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Description: What this script does
# Inputs:
#   - VAR_NAME: description of expected env var
```

Extract to a script when logic has: conditionals, temp files, complex error handling, or exceeds ~5 lines.

---

## Best Practices

1. Set `silent: true` globally at the root — suppress command echoing by default
2. Always define a `default` task that runs `task --list` so bare `task` shows usage
3. Add `desc:` to all public tasks — enables `task --list` discoverability
4. Mark helper tasks `internal: true` to keep `--list` clean
5. Use `sources`/`generates` fingerprinting to avoid redundant work
6. Use `preconditions` with `msg:` for clear, actionable error messages
7. Use `requires.vars` to enforce inputs rather than failing mid-task
8. Use `deps:` (parallel) over sequential `task:` calls when order doesn't matter
9. Add `prompt:` to destructive tasks
10. Gitignore `.task/` (checksum cache directory)
11. Use `{{.ROOT_DIR}}` for absolute paths, not relative `../..`
12. Use `--dry` (`-n`) to preview commands without executing

---

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| No root `silent: true` | Add `silent: true` at root level |
| No `default` task or `default` runs something | `default` should always run `task --list` |
| Spaces in templates: `{{ .VAR }}` | Use `{{.VAR}}` |
| Lowercase variable names | Use `UPPER_CASE` |
| Underscore task names: `run_tests` | Use `kebab-case`: `run-tests` |
| Rebuilding always | Add `sources:`/`generates:` fingerprinting |
| Missing `desc:` on public tasks | Add descriptions for discoverability |
| Complex inline shell scripts | Extract to `.taskfiles/scripts/name.sh` |
| Sequential `deps:` when order irrelevant | Use parallel `deps:` |
| Hardcoded absolute paths | Use `{{.ROOT_DIR}}` or `{{.TASKFILE_DIR}}` |

---

## Schema Quick Reference

### Root

| Property | Type | Default | Description |
|---|---|---|---|
| `version` | string | Required | Always `"3"` |
| `includes` | map | — | Import other Taskfiles |
| `vars` | map | — | Global variables |
| `env` | map | — | Global environment variables |
| `dotenv` | []string | — | Load `.env` files |
| `output` | string | `interleaved` | `interleaved`, `group`, `prefixed` |
| `method` | string | `checksum` | `checksum`, `timestamp`, `none` |
| `silent` | bool | false | Suppress command echoing globally — **always set to `true`** |
| `run` | string | `always` | `always`, `once`, `when_changed` |
| `set` | []string | — | POSIX shell options (e.g. `[pipefail]`) |
| `shopt` | []string | — | Bash shell options (e.g. `[globstar]`) |

### Task

| Property | Type | Default | Description |
|---|---|---|---|
| `cmds` | []Command | — | Sequential commands |
| `deps` | []Dependency | — | Parallel prerequisites |
| `vars` | map | — | Task-local variables |
| `env` | map | — | Task-local environment |
| `dir` | string | — | Working directory |
| `sources` | []string | — | Input file globs |
| `generates` | []string | — | Output file globs |
| `status` | []string | — | Skip task if all exit 0 |
| `preconditions` | []Precondition | — | Fail task if any condition fails |
| `requires` | Requires | — | Required variable names/enum values |
| `desc` | string | — | Short description (`--list`) |
| `summary` | string | — | Long description (`--summary`) |
| `aliases` | []string | — | Alternative names |
| `label` | string | — | Custom display label |
| `internal` | bool | false | Hide from `--list` |
| `silent` | bool | false | Suppress output |
| `interactive` | bool | false | For interactive CLI tools |
| `platforms` | []string | — | OS/arch restrictions |
| `prompt` | string | — | Confirmation before running |
| `watch` | bool | false | Enable watch mode |
| `ignore_error` | bool | false | Continue on failure |
| `run` | string | — | Override global run mode |

### Variable Types

```yaml
vars:
  STATIC: "value"
  DYNAMIC:
    sh: git rev-parse HEAD
  REF:
    ref: .OTHER_VAR
  MAP_VAR:
    key1: val1
    key2: val2
```

---

## Templating Quick Reference

Taskfile uses Go `text/template` + Sprig. No spaces inside `{{}}`.

### Built-in Variables

| Variable | Description |
|---|---|
| `{{.TASK}}` | Current task name |
| `{{.ROOT_DIR}}` | Root Taskfile directory |
| `{{.TASKFILE_DIR}}` | Current Taskfile's directory |
| `{{.USER_WORKING_DIR}}` | Directory where `task` was invoked |
| `{{.CLI_ARGS}}` | Arguments after `--` as string |
| `{{.CLI_ARGS_LIST}}` | Arguments after `--` as list |
| `{{.MATCH}}` | Wildcard captures array |
| `{{.ITEM}}` | Current for-loop item |
| `{{.EXIT_CODE}}` | Exit code in deferred commands |

### Commonly Used Functions

```yaml
# Default value
'{{default "latest" .TAG}}'

# Conditional
'{{if eq .ENV "prod"}}--prod{{else}}--dev{{end}}'

# String ops
'{{.NAME | upper}}'
'{{.PATH | trimSuffix "/"}}'
'{{printf "%s-%s" .APP .ENV}}'
'{{shellQuote .ARG}}'

# List ops
'{{index .MATCH 0}}'          # wildcard capture
'{{join "," .ITEMS}}'
'{{splitList "," .CSV}}'

# Math
'{{add .COUNT 1}}'

# OS/Arch
'{{OS}}'    # linux / darwin / windows
'{{ARCH}}'  # amd64 / arm64
```

---

## CLI Quick Reference

```bash
task --list                  # List tasks with descriptions
task --list-all              # Include internal tasks
task --summary build         # Show detailed task info

task build                   # Run a task
task lint test               # Run multiple tasks
task build -- --verbose      # Pass args via CLI_ARGS
task deploy TAG=v1.2.3       # Pass variables
task build --force           # Force re-run (ignore fingerprints)
task build --dry             # Preview commands without executing
task build --watch           # Watch mode
task lint test --parallel    # Run in parallel
task -t ci/Taskfile.yaml build  # Use alternate Taskfile
```
