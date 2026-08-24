---
title: "Sol 做决策，terra 做执行：我的 Codex 子代理工作流"
slug: codex-sol-terra-subagent-workflow
translationKey: codex-sol-terra-subagent-workflow
description: "让高成本模型专注于设计与判断，把实现、运行和审查交给低成本模型，在降低费用的同时保持主对话上下文干净。"
date: 2026-08-24
lastmod: 2026-08-24
draft: false
tags:
  - Codex
  - Subagents
  - Multi-Agent
  - Token
  - AI 工作流
categories:
  - AI
---

我在研究项目里使用 Codex 时，真正需要高能力模型处理的通常是研究问题、实验设计和结果判断；消耗大量 token 的却是读代码、改脚本、启动实验、等待任务和整理日志。

如果这些工作都留在主对话里，不仅费用高，执行过程还会不断挤占上下文。我的解决办法是把 Codex 分成两个层级：

- **Sol**：高成本主代理，负责设计与判断；
- **terra**：低成本子代理，负责实现、运行和必要的审查。

一句话概括：

> Sol 决定做什么、为什么做，以及结果意味着什么；terra 把已经确定的事情做完，只带回决策所需的证据。

## 省的不是总 token，而是高价 token

使用子代理不一定减少系统的 token 总量。子代理需要读取 brief、调用工具并返回结果，主代理也有委派和汇总的开销。

但 token 数量不等于费用。假设 terra 的单价低于 Sol：

```text
全部由 Sol 完成：
C_single = T_all × P_sol

使用子代理：
C_multi = T_sol × P_sol + T_terra × P_terra
```

即使多代理方案使用了更多 token，只要大量执行型 token 从 Sol 转移到更便宜的 terra，最终费用仍可能下降。

它还有第二个收益：terra 读过的文件、运行日志和中间过程留在独立线程中，Sol 只接收压缩后的数字、结论和证据路径。后续对话不必反复携带这些内容，主上下文会干净很多。

所以更准确的说法是：

> 子代理减少的是高成本模型的 token 消耗和主对话的上下文占用，而不一定是所有代理的 token 总和。

## 配置模型分层

我的 `~/.codex/config.toml` 中，与子代理相关的部分如下：

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

这里的 `gpt-5.6-sol` 和 `gpt-5.6-terra` 是我的 OpenAI-compatible provider 提供的模型标识，并非所有 Codex 用户都能直接使用的通用模型名。复用这套思路时，把它们替换成自己的高能力模型和低成本模型即可。

`max_concurrent_threads_per_session = 8` 只是并发上限，不代表每次都要启动 8 个子代理。多个 agent 重复阅读同一批文件，反而会浪费 token。

当前 Codex 也支持通过常规 `[agents]` 配置启用 subagents：

```toml
[agents]
enabled = true
max_concurrent_threads_per_session = 8
```

我使用的 `[features.multi_agent_v2]` 来自当前 schema，字段可能随版本变化，应以自己安装版本对应的文档为准。

## 两个 terra 角色

个人自定义 agent 放在 `~/.codex/agents/`，项目专属 agent 则放在 `.codex/agents/`。我只定义并调用两个角色，避免使用没有任务边界的默认子代理。

> 下面的提示词只是我针对研究代码和长时间实验编写的参考示例，不是 Codex 的标准模板，也不适合直接照抄。实际使用时，应根据自己的项目类型、任务边界、权限环境、工具和期望返回格式重新编写；最值得复用的是角色分工与约束思路，而不是具体措辞。

### terra_executor

`~/.codex/agents/terra-executor.toml`：

```toml
name = "terra_executor"
description = "Coding and execution agent for frozen implementation tasks and experiment runs."

model = "gpt-5.6-terra"
model_reasoning_effort = "max"
model_provider = "terra_api"

developer_instructions = """
实现 Sol 已经冻结的任务，修改真实文件并完成运行。
返回关键数字、验证结果、改动文件和日志路径，不要粘贴完整日志。
不要改变实验语义、扩大范围、提交代码或创建更多子代理。
"""
```

executor 负责：

- 阅读相关代码并实现 brief；
- 启动、监控训练或评估；
- 收集原始结果和失败证据；
- 返回简短、结构化的结果。

这是研究代码，所以我要求它写“足以得到可信数字的最短正确实现”，而不是顺手增加生产级防御、复杂抽象或无关测试。需要重点保护的是数据对齐、数据泄漏、tensor 语义、loss、train/eval mode 和 metric 定义。

### terra_reviewer

`~/.codex/agents/terra-reviewer.toml`：

```toml
name = "terra_reviewer"
description = "Read-only reviewer for result-critical research correctness."

model = "gpt-5.6-terra"
model_reasoning_effort = "max"
model_provider = "terra_api"
sandbox_mode = "read-only"

developer_instructions = """
只检查这份实现是否会产生一个错误、但研究者可能相信的数字。
只报告能定位到文件和行号，并能说明如何影响结果的问题。
不要修改文件，不做一般性的工程质量审查。
"""
```

reviewer 只关注会改变研究数字的错误，例如错误的数据 join、泄漏、mask、loss、checkpoint、metric 或 baseline 比较。命名、代码重复、CLI 体验和生产级错误处理都不在它的范围内。

`read-only` 可以保证 reviewer 只提供独立意见，不在审查过程中偷偷改变实现。

## 真正的编排依赖提示词

模型和并发数可以写进 `config.toml`，但“Sol 应该做什么、何时委派、怎样等待”不能只靠配置完成。因此，我在全局 `~/.codex/AGENTS.md` 中约束 Sol。下面仍然只是我的工作流摘要，读者需要根据自己的任务自行设计规则，而不是把研究场景中的分工直接套到所有项目：

```text
- Sol 负责实验设计、brief、委派、判断和汇报，不亲自实现或启动运行。
- 只调用 terra_executor 和 terra_reviewer。
- 先冻结目标、关键设计、验收数字和范围，再委派 executor。
- 所有训练、评估、监控和结果收集都交给 executor。
- reviewer 是例外，不是每个任务的固定步骤。
- 得到足以决策的结果后就汇报并停止。
```

这样，昂贵的 Sol 不会在委派之后又把 terra 看过的文件全部重读一遍。它只检查返回数字是否完整、是否符合冻结设计，并抽查真正计算结果的少量代码。

## 为什么轮询规则也必须写进提示词

长时间实验包含两层等待：

```text
Sol ──wait_agent──> terra_executor ──监控循环──> 实验进程
```

### Sol 等待 terra

`default_wait_timeout_ms = 3600000` 只是在调用 `wait_agent` 时没有显式传入 `timeout_ms` 的情况下，提供一个 1 小时默认值。

它不能阻止 Sol 自己设置短超时，也不能阻止 Sol 循环调用 `list_agents` 或频繁查看状态。因此，我在全局提示词里明确要求：

```text
调用 wait_agent 时不传 timeout_ms。
不要短轮询，不要循环调用 list_agents，也不要使用 shell sleep。
超时后只检查一次，然后继续等待。
```

任务完成或子代理发来消息时会立即唤醒 Sol，不需要频繁轮询。

### terra 等待实验进程

terra 启动训练后，还要等待真正的实验进程。这部分与 `default_wait_timeout_ms` 无关，也必须写进 executor 的提示词：

```text
只做一次启动检查，然后在同一个执行单元内监控进程。
cell、write_stdin 和 wait 使用一小时的 yield_time_ms。
进程结束时立即返回；未结束时最多每小时醒来一次。
不要在每一轮重新执行短 sleep。
```

因此，配置和提示词承担不同职责：

- **配置**提供默认等待时长；
- **提示词**规定 Sol 如何等待，以及 terra 如何监控实际进程。

只写配置，无法得到这套低频、可提前唤醒的轮询行为。

## 一次任务怎样流转

假设人类提出：

```text
新 loss 能否让 validation metric 至少提高 0.02？
```

### 1. Sol 冻结实验设计

Sol 确定 baseline、数据划分、唯一变量、primary metric、成功门槛和当前阶段不做的事情。

### 2. Sol 编写简短 brief

```text
目标：比较 baseline 与新 loss 的 validation metric。

冻结设计：
- 使用现有 train/validation split；
- 除 loss 外保持训练配置一致；
- 两次运行使用相同 GPU 数；
- 成功门槛为提升至少 0.02。

返回：
- 两次运行的 metric 和差值；
- GPU 数、命令与日志路径；
- 修改文件；
- 是否通过门槛。
```

brief 要自包含，但不应塞入完整聊天历史。任务如果需要很长的说明，通常说明当前阶段还没有拆得足够小。

### 3. terra_executor 实现并运行

executor 修改代码、完成运行并返回原始数字。Sol 使用 `wait_agent` 长等待，而不是频繁询问状态。

### 4. Sol 判断结果

如果结果是：

```text
baseline: 0.731
candidate: 0.744
delta: +0.013
primary gate: +0.020
```

Sol 应直接判断：结果有提升，但没有达到预先设定的门槛。负面结果也是完整结果，不应擅自增加 sweep 或更换 metric。

### 5. 必要时才审查

我只在以下三个条件同时成立时调用 `terra_reviewer`：

1. 人类会根据这个数字采取行动；
2. 静默错误以后很难发现；
3. 计算本身确实微妙，例如新 split、loss、metric、数据 join 或 baseline 比较。

smoke test、绘图、重跑超参数和可以直接检查的输出通常不需要 reviewer。审查也是有成本的，不应变成固定仪式。

## 使用边界

这套方式并非总是更划算：

- 一两步就能完成的小任务，委派成本可能更高；
- 多个子代理重复工作，会抵消模型分层的收益；
- 低成本模型仍可能犯错，关键结果必须有明确验收标准；
- agent 会继承部分父级权限和配置，“上下文干净”不等于完全没有继承；
- 权限、sandbox 和 trusted project 应按自己的环境配置，不要照抄；
- 是否省钱最终要看 Sol 与 terra 的真实价格和 token 统计。

## 总结

我的 Codex 子代理工作流只有三步：

1. **Sol 先把问题想清楚**：冻结目标、设计、验收数字和范围；
2. **terra 把任务做完**：实现、运行、监控，必要时进行一次只读审查；
3. **主线程只保留决策信息**：数字、结论、证据路径和真正的风险。

子代理不是为了让更多模型同时思考，而是为了把执行型 token 从高成本模型转移到低成本模型，并把中间过程留在主对话之外。
