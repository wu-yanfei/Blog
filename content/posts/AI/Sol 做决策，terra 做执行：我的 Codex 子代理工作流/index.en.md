---
title: "Sol Decides, terra Executes: My Codex Subagent Workflow"
slug: codex-sol-terra-subagent-workflow
translationKey: codex-sol-terra-subagent-workflow
description: "Keep an expensive model focused on design and judgment while lower-cost models handle implementation, runs, and review—reducing cost and keeping the main conversation context clean."
date: 2026-08-24
lastmod: 2026-08-24
draft: false
tags:
  - Codex
  - Subagents
  - Multi-Agent
  - Token
  - AI Workflow
categories:
  - AI
---

In my research projects, the work that truly needs a highly capable Codex model is usually framing the question, designing the experiment, and judging the result. Yet most tokens are spent reading code, editing scripts, launching experiments, waiting for jobs, and summarizing logs.

Keeping all of that in the primary conversation is expensive and continually fills the context with execution details. My solution is to divide Codex into two tiers:

- **Sol**: an expensive primary agent for design and judgment;
- **terra**: a lower-cost subagent for implementation, execution, and targeted review.

In one sentence:

> Sol decides what to do, why to do it, and what the result means. terra completes the settled task and brings back only the evidence needed for a decision.

## Save expensive tokens, not necessarily total tokens

Subagents do not necessarily reduce total token usage. They need briefs, tool calls, and result summaries, while the primary agent pays delegation and synthesis overhead.

But token count is not the same as cost. If terra is cheaper than Sol:

```text
Sol does everything:
C_single = T_all × P_sol

With subagents:
C_multi = T_sol × P_sol + T_terra × P_terra
```

Even when the multi-agent workflow uses more tokens overall, moving execution-heavy work from Sol to the cheaper terra model can still reduce the bill.

There is another benefit: files, logs, and intermediate steps remain in terra's thread. Sol receives only compressed numbers, conclusions, and evidence paths, so later turns do not need to carry the full execution history.

A more precise claim is therefore:

> Subagents reduce expensive-model token usage and primary-context growth, not necessarily the combined token count of every agent.

## Configure model tiering

The relevant part of my `~/.codex/config.toml` is:

```toml
#:schema https://developers.openai.com/codex/config-schema.json

model_provider = "newapi"
model = "gpt-5.6-sol"
model_reasoning_effort = "high"

[model_providers.newapi]
name = "OpenAI"
base_url = "https://your-provider.example/v1"
requires_openai_auth = true

[model_providers.terra_api]
name = "OpenAI"
base_url = "https://your-provider.example/v1"

[features.multi_agent_v2]
enabled = true
default_wait_timeout_ms = 3600000

[agents]
max_concurrent_threads_per_session = 8
default_subagent_model = "gpt-5.6-terra"
default_subagent_reasoning_effort = "high"
```

`gpt-5.6-sol` and `gpt-5.6-terra` are identifiers exposed by my OpenAI-compatible provider, not universal model IDs available to every Codex user. Replace them with your own high-capability and lower-cost models.

`max_concurrent_threads_per_session = 8` is only a ceiling. It does not mean every task should start eight subagents. Multiple agents rereading the same files waste tokens.

Current Codex versions also support enabling subagents through the standard `[agents]` configuration:

```toml
[agents]
enabled = true
max_concurrent_threads_per_session = 8
```

The `[features.multi_agent_v2]` table comes from the current schema and may change between versions. Consult the documentation matching your installed Codex version.

## Two terra roles

Personal custom agents live under `~/.codex/agents/`; project-scoped agents live under `.codex/agents/`. I define and invoke only two roles instead of using an unconstrained default subagent.

> The prompts below are reference examples written for my research code and long-running experiments. They are not standard Codex templates and should not be copied unchanged. Rewrite them for your project type, task boundaries, permission model, tools, and desired output format. The reusable part is the role separation and constraint design, not the exact wording.

### terra_executor

`~/.codex/agents/terra-executor.toml`:

```toml
name = "terra_executor"
description = "Coding and execution agent for frozen implementation tasks and experiment runs."

model = "gpt-5.6-terra"
model_reasoning_effort = "max"
model_provider = "terra_api"

developer_instructions = """
Implement Sol's frozen task, edit real files, and complete the run.
Return key numbers, validation, changed files, and log paths—not full logs.
Do not change experiment semantics, expand scope, commit, or create subagents.
"""
```

The executor:

- reads the relevant code and implements the brief;
- launches and monitors training or evaluation;
- collects raw results and failure evidence;
- returns a short, structured report.

Because this is research code, I ask for the shortest correct implementation that produces a trustworthy number—not production hardening, elaborate abstractions, or unrelated tests. The critical details are data alignment, leakage, tensor semantics, loss, train/eval mode, and metric definition.

### terra_reviewer

`~/.codex/agents/terra-reviewer.toml`:

```toml
name = "terra_reviewer"
description = "Read-only reviewer for result-critical research correctness."

model = "gpt-5.6-terra"
model_reasoning_effort = "max"
model_provider = "terra_api"
sandbox_mode = "read-only"

developer_instructions = """
Ask only whether this implementation could produce a wrong number the researcher would believe.
Report only issues with a file and line and a concrete effect on the result.
Do not edit files or conduct general engineering-quality review.
"""
```

The reviewer focuses only on errors that could change the scientific number: bad joins, leakage, masks, losses, checkpoints, metrics, or incomparable baselines. Naming, duplication, CLI ergonomics, and production error handling are out of scope.

`read-only` ensures that the reviewer provides an independent opinion without silently changing the implementation under review.

## Orchestration requires prompts

Models and concurrency limits fit in `config.toml`, but configuration alone cannot decide what Sol should do, when it should delegate, or how it should wait. I therefore constrain Sol in the global `~/.codex/AGENTS.md`. The following is still only a summary of my workflow: readers should design rules for their own tasks rather than applying a research-oriented division of labor to every project unchanged:

```text
- Sol owns experiment design, briefs, delegation, judgment, and reporting; it does not implement or launch runs.
- Spawn only terra_executor and terra_reviewer.
- Freeze the objective, material design choices, acceptance number, and scope before delegation.
- Delegate every training run, evaluation, monitoring task, and result collection step.
- Review is an exception, not a mandatory stage.
- Report and stop once the result is sufficient for a decision.
```

This prevents expensive Sol from delegating a task and then rereading every file terra already inspected. Sol checks whether the returned numbers are complete and consistent with the frozen design, then spot-reads only the small amount of code that computes the critical result.

## Polling rules also belong in prompts

A long experiment has two waiting layers:

```text
Sol ──wait_agent──> terra_executor ──monitor loop──> experiment process
```

### Sol waits for terra

`default_wait_timeout_ms = 3600000` only supplies a one-hour default when `wait_agent` is called without an explicit `timeout_ms`.

It cannot prevent Sol from choosing a short timeout, repeatedly calling `list_agents`, or checking status too often. My global prompt therefore says:

```text
Call wait_agent without timeout_ms.
Do not short-poll, loop over list_agents, or use shell sleep.
After a timeout, inspect once and wait again.
```

Completion or a message wakes Sol immediately, so frequent polling is unnecessary.

### terra waits for the experiment process

After launching training, terra still has to wait for the real process. This is unrelated to `default_wait_timeout_ms` and must be specified in the executor prompt:

```text
Perform one startup check, then monitor inside one execution cell.
Use a one-hour yield_time_ms for the cell, write_stdin, and wait.
Return immediately when the process exits; otherwise wake at most once per hour.
Do not issue a fresh short sleep on every turn.
```

Configuration and prompts therefore have different jobs:

- **configuration** provides a default waiting duration;
- **prompts** define how Sol waits and how terra monitors the process.

Configuration alone cannot create this low-frequency, early-wakeup behavior.

## How one task flows

Suppose the human asks:

```text
Can the new loss improve the validation metric by at least 0.02?
```

### 1. Sol freezes the design

Sol chooses the baseline, data split, single changed variable, primary metric, success threshold, and what is out of scope.

### 2. Sol writes a short brief

```text
Objective: compare the baseline and new loss on the validation metric.

Frozen design:
- Keep the existing train/validation split.
- Change only the loss.
- Use the same GPU count for both runs.
- Success requires an improvement of at least 0.02.

Return:
- Both metrics and their difference.
- GPU count, commands, and log paths.
- Changed files.
- Whether the gate passed.
```

A brief should be self-contained without copying the full conversation history. If it needs a long document, the phase is probably still too broad.

### 3. terra_executor implements and runs

The executor edits the code, completes the run, and returns raw numbers. Sol waits with `wait_agent` instead of repeatedly requesting status.

### 4. Sol judges the result

If the executor returns:

```text
baseline: 0.731
candidate: 0.744
delta: +0.013
primary gate: +0.020
```

Sol reports that the result improved but missed the prespecified gate. A negative result is still complete; Sol should not silently add a sweep or change the metric.

### 5. Review only when necessary

I invoke `terra_reviewer` only when all three conditions hold:

1. the human will act on the number;
2. a silent error would be difficult to notice later;
3. the computation is genuinely subtle, such as a new split, loss, metric, data join, or baseline comparison.

Smoke tests, plots, hyperparameter reruns, and directly inspectable output usually do not need a reviewer. Review costs tokens too and should not become a ritual.

## Limits

This workflow is not always cheaper:

- delegation overhead can outweigh savings for one- or two-step tasks;
- duplicated subagent work can erase the benefit of model tiering;
- cheaper models still make mistakes, so critical results need explicit acceptance criteria;
- agents inherit some parent permissions and settings, so clean context does not mean zero inheritance;
- permissions, sandboxes, and trusted projects must be configured for your own environment;
- actual savings depend on real Sol and terra prices and token measurements.

## Conclusion

My Codex subagent workflow has three steps:

1. **Sol settles the problem first**: freeze the objective, design, acceptance number, and scope.
2. **terra completes the task**: implement, run, monitor, and perform one read-only review only when needed.
3. **The primary thread retains only decision-relevant information**: numbers, conclusions, evidence paths, and genuine risks.

Subagents are not primarily a way to make more models think at once. They move execution-heavy tokens from an expensive model to a cheaper one while keeping intermediate work out of the main conversation.
