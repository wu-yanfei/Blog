---
title: bulk 转录组和单细胞转录组在药物发现中的区别与数据处理
slug: bulk-vs-single-cell-transcriptomics-drug-discovery
translationKey: bulk-vs-single-cell-transcriptomics-drug-discovery
description: "梳理 bulk RNA-seq 与 scRNA-seq 的核心区别、常规处理流程，以及在药物发现中如何把表达谱转化为药物筛选、药物重定位和药物生成模型的输入。"
date: 2026-06-07
lastmod: 2026-06-07
draft: false
tags:
  - 转录组测序
  - 药物发现
  - 单细胞
categories:
  - 学术研究
---

## 核心区别

**bulk RNA-seq** 和 **single-cell RNA-seq, scRNA-seq** 都是在测量基因表达，但二者的分辨率完全不同。

简单来说：

- **bulk RNA-seq** 测的是一群细胞混合后的平均表达；
- **scRNA-seq** 测的是单个细胞级别的表达，可以看到细胞类型、细胞状态和细胞间异质性。

| 维度 | bulk RNA-seq | scRNA-seq |
| --- | --- | --- |
| 测量对象 | 一个组织、样本或细胞群的平均表达 | 单个细胞的表达 |
| 数据矩阵 | gene × sample | gene × cell |
| 信号特点 | 相对平滑、稳定 | 稀疏、噪声大、dropout 多 |
| 分辨率 | 样本级、组织级 | 细胞类型级、细胞状态级 |
| 主要问题 | 细胞组成混杂 | 批次效应、双细胞、低质量细胞、稀疏性 |
| 常见分析 | 差异表达、通路富集、WGCNA、signature 构建 | 聚类、细胞注释、轨迹分析、细胞通讯、pseudobulk |
| 药物发现优势 | 适合构建疾病或药物整体表达 signature | 适合识别特定细胞类型、耐药亚群和毒性细胞状态 |
| 药物发现局限 | 看不到细胞异质性 | 成本高，数据处理更复杂，跨数据集整合更难 |

因此，二者不是简单的替代关系，而是互补关系。bulk RNA-seq 更适合做稳定的样本级比较，scRNA-seq 更适合解释这种表达变化到底来自哪些细胞类型或细胞状态。

## bulk RNA-seq 的常规数据处理

bulk RNA-seq 通常可以从 FASTQ 或已经整理好的 count matrix 开始。完整流程一般如下：

```text
FASTQ
  ↓
质控：FastQC / MultiQC
  ↓
去接头和低质量 reads：fastp / Trimmomatic
  ↓
比对或准比对：STAR / HISAT2 / Salmon / kallisto
  ↓
基因定量：featureCounts / Salmon / kallisto
  ↓
count matrix：gene × sample
  ↓
标准化：TPM / FPKM / CPM / DESeq2 size factor / edgeR TMM
  ↓
差异表达分析：DESeq2 / edgeR / limma-voom
  ↓
功能分析：GO / KEGG / Reactome / GSEA / GSVA
  ↓
药物相关分析：disease signature、drug reversal、target prioritization
```

bulk RNA-seq 常见表达矩阵包括三类。

### raw counts

raw counts 是差异表达分析最常用的输入形式。例如：

| gene | control_1 | control_2 | disease_1 | disease_2 |
| --- | ---: | ---: | ---: | ---: |
| TP53 | 120 | 135 | 300 | 280 |
| EGFR | 80 | 76 | 180 | 200 |

这类数据适合直接输入：

- DESeq2；
- edgeR；
- limma-voom。

### TPM / FPKM

TPM 和 FPKM 更适合用于：

- 样本内表达量展示；
- 聚类和可视化；
- 某些机器学习输入。

但是，不建议直接用 TPM 或 FPKM 做严格的差异表达检验。

### log-normalized expression

常见形式是：

```text
log2(TPM + 1)
```

或经过其他标准化后的 log expression。它适合用于：

- PCA；
- 聚类；
- 表达 signature 构建；
- 药物响应预测；
- 机器学习建模。

## scRNA-seq 的常规数据处理

单细胞数据通常从 FASTQ 或 10x Genomics 的输出开始。典型流程如下：

```text
FASTQ
  ↓
barcode / UMI 识别
  ↓
比对和定量：Cell Ranger / STARsolo / kallisto-bustools / Alevin-fry
  ↓
gene × cell count matrix
  ↓
细胞质控：过滤低质量细胞、高线粒体比例细胞、低基因数细胞
  ↓
去除 doublet：DoubletFinder / Scrublet / scDblFinder
  ↓
去除 ambient RNA：SoupX / CellBender
  ↓
归一化：log-normalization / SCTransform / scran
  ↓
降维：PCA → UMAP / t-SNE
  ↓
聚类：Leiden / Louvain
  ↓
细胞类型注释：marker gene / SingleR / CellTypist / Azimuth
  ↓
下游分析：差异表达、pseudobulk、轨迹分析、细胞通讯、药物响应分析
```

scRNA-seq 的矩阵一般是：

```text
gene × cell
```

例如：

| gene | cell_1 | cell_2 | cell_3 | cell_4 |
| --- | ---: | ---: | ---: | ---: |
| CD3D | 10 | 0 | 0 | 2 |
| MS4A1 | 0 | 15 | 0 | 0 |
| EPCAM | 0 | 0 | 20 | 25 |

它的特点是：

- 数据很稀疏；
- 很多基因在很多细胞中是 0；
- 单个细胞表达测量噪声较大；
- 不同样本捕获到的细胞数量可能差异很大；
- 不适合直接把每个 cell 当成一个独立生物学重复做普通差异表达分析。

## 差异表达分析的区别

### bulk RNA-seq

bulk 的差异分析通常比较：

```text
疾病样本 vs 正常样本
```

最终得到：

```text
upregulated genes
downregulated genes
```

例如：

```text
疾病中上调：IL6, TNF, CXCL8, STAT1
疾病中下调：PPARG, KLF4, CDH1
```

这可以作为一个疾病表达 signature。

### scRNA-seq

scRNA-seq 不建议简单地比较：

```text
所有疾病细胞 vs 所有正常细胞
```

因为来自同一个 donor 或 sample 的细胞不是独立生物学重复。如果把每个细胞都当成独立样本，容易产生 **pseudoreplication** 问题。

更稳妥的做法通常有两类。

第一，分细胞类型做差异表达：

```text
疾病 T cells vs 正常 T cells
疾病 macrophages vs 正常 macrophages
疾病 epithelial cells vs 正常 epithelial cells
```

这样可以得到细胞类型特异的疾病 signature。

第二，做 **pseudobulk** 分析。也就是把同一个样本、同一个细胞类型的细胞聚合起来：

```text
sample_1_Tcell = sample_1 中所有 T cell counts 求和
sample_2_Tcell = sample_2 中所有 T cell counts 求和
sample_1_Macrophage = sample_1 中所有 macrophage counts 求和
```

然后得到类似 bulk 的矩阵，再用 DESeq2、edgeR 或 limma 做差异分析。对于单细胞差异表达，pseudobulk 通常比直接 cell-level differential expression 更稳健。

## bulk RNA-seq 在药物发现中的使用

bulk RNA-seq 在药物发现中最常见的用途是构建 **expression signature**，然后进行药物筛选、药物重定位或药物响应预测。

### 疾病 signature 反转

基本思想是：如果疾病状态下某些基因上调、某些基因下调，而某个药物诱导的表达变化正好相反，那么这个药物可能有治疗潜力。

例如疾病 signature 是：

```text
疾病中上调：A, B, C
疾病中下调：D, E, F
```

某个药物处理后的表达变化是：

```text
药物下调：A, B, C
药物上调：D, E, F
```

那么这个药物可能可以反转疾病状态。这就是 Connectivity Map 和 LINCS L1000 一类方法背后的核心思路。

典型流程如下：

```text
疾病 bulk RNA-seq 数据
  ↓
正常 vs 疾病差异表达
  ↓
构建 disease signature：up genes + down genes
  ↓
和药物扰动数据库比较：CMap / LINCS / L1000 / GEO drug perturbation datasets
  ↓
计算 connectivity score / reversal score
  ↓
筛选候选药物
  ↓
通路验证、靶点验证、实验验证
```

### 药物响应预测

bulk 表达谱也经常用于预测药物敏感性。输入通常是：

```text
细胞系或患者样本的基因表达谱
```

输出可以是：

```text
IC50 / AUC / responder vs non-responder
```

常见数据来源包括：

- GDSC；
- CCLE；
- CTRP；
- PRISM；
- DepMap。

常见模型包括：

- Elastic Net；
- Random Forest；
- XGBoost；
- SVM；
- MLP；
- Autoencoder；
- Graph neural network；
- 多组学融合模型。

### 靶点发现

bulk 表达变化还可以结合通路和网络分析，用于推断潜在靶点，例如：

- 差异表达基因；
- hub genes；
- transcription factors；
- kinases；
- pathway nodes；
- master regulators。

## scRNA-seq 在药物发现中的使用

scRNA-seq 更适合回答与细胞异质性有关的问题，例如：

- 药物主要作用于哪类细胞？
- 哪些细胞亚群导致耐药？
- 哪些细胞状态和疾病进展有关？
- 药物是否诱导某些毒性状态？
- 靶点在哪些细胞中特异表达？

### 发现疾病相关细胞类型

例如在炎症疾病中，scRNA-seq 可以发现某类 inflammatory macrophage 亚群显著扩增。随后可以分析这个亚群的 marker genes、活跃通路和潜在药物靶点。

### 发现耐药细胞亚群

在肿瘤治疗前后采样时，可以比较：

```text
pre-treatment
post-treatment
resistant relapse
```

重点分析：

- 哪些细胞亚群在治疗后保留下来；
- 哪些耐药通路被激活；
- 是否出现 EMT、stem-like、hypoxia、stress response 等状态；
- 是否有免疫逃逸相关表达变化。

### 靶点优先级排序

对于候选靶点，可以在单细胞层面检查：

```text
靶点基因是否在疾病相关细胞类型中特异高表达？
靶点是否在正常关键组织细胞中也高表达？
靶点是否和疾病状态 marker 共表达？
```

这有助于判断：

- 疗效潜力；
- 细胞类型特异性；
- 潜在毒性。

### 细胞通讯分析

在肿瘤微环境或免疫疾病中，scRNA-seq 还可以分析细胞间通讯，例如：

- ligand-receptor interaction；
- cytokine signaling；
- immune checkpoint；
- fibroblast-tumor interaction；
- macrophage-tumor interaction。

常用工具包括：

- CellPhoneDB；
- NicheNet；
- CellChat；
- LIANA。

这类分析对于寻找微环境相关药物靶点很有帮助。

## 表达谱作为药物发现模型输入时如何处理

### bulk 表达谱输入

bulk 表达谱通常可以直接表示为样本级向量：

```text
sample = [gene1_expr, gene2_expr, gene3_expr, ..., geneN_expr]
```

常见输入形式有四类。

第一，全基因表达矩阵：

```text
X = samples × genes
```

处理流程一般是：

```text
raw counts
  ↓
过滤低表达基因
  ↓
标准化
  ↓
log transform
  ↓
批次校正
  ↓
特征选择
  ↓
输入模型
```

第二，差异表达 signature：

```text
up genes + down genes
```

这种形式非常适合药物重定位和 CMap / LINCS 查询。

第三，通路活性分数。也就是把表达谱从基因层面转成通路层面：

```text
sample × pathway
```

常用方法包括：

- GSEA；
- ssGSEA；
- GSVA；
- PROGENy；
- DoRothEA；
- VIPER。

这种表示通常比直接使用上万个基因更稳定，也更容易解释。

第四，表达嵌入表示。可以用 PCA、autoencoder、VAE 等方法把高维表达谱压缩成低维向量：

```text
20,000 genes → 128-dimensional embedding
```

随后用于药物响应预测、疾病亚型分类、药物相似性分析或生成模型条件输入。

### scRNA-seq 表达谱输入

scRNA-seq 一般不建议直接把每个 cell 当成一个独立 bulk sample 输入模型，因为它存在稀疏、噪声、细胞数量不均衡、batch 和 pseudoreplication 等问题。更常见的做法是先转成更稳健的表示。

第一，pseudobulk 表达谱：

```text
sample_1_Tcell
sample_1_Macrophage
sample_1_Epithelial
sample_2_Tcell
sample_2_Macrophage
sample_2_Epithelial
```

它适合用于细胞类型特异的差异表达、药物 signature 比较，以及和 bulk 药物扰动数据库对接。

第二，cell type proportion 特征：

```text
样本 A：
T cell 30%
B cell 10%
Macrophage 20%
Tumor cell 40%
```

这些比例可以作为药物响应预测特征。比如在免疫治疗中，CD8 T cell、exhausted T cell、M2 macrophage 等比例可能和疗效或耐药相关。

第三，cell-type-specific signature。对每种细胞类型分别构建疾病 signature：

```text
disease macrophage signature
disease T cell signature
disease epithelial signature
```

这种方式比 bulk 更精细，因为一个药物可能只需要反转某个关键细胞群的异常状态。

第四，细胞状态 embedding。可以用模型学习单细胞状态表示，例如：

- scVI；
- scANVI；
- totalVI；
- scGPT；
- Geneformer；
- scFoundation；
- CPA；
- scGen。

这些 embedding 可以用于药物响应预测、扰动响应预测、细胞状态转换和药物生成模型的条件输入。

第五，perturbation response profile。如果有药物或 CRISPR 扰动单细胞数据，可以学习：

```text
未处理细胞状态 + 药物信息 → 处理后细胞状态
```

这类任务可以用于预测某个药物是否能把疾病细胞状态推回正常状态，也可以用于预测药物组合效果、敏感亚群和耐药亚群。

## 药物生成模型中的表达谱使用方式

如果目标是 AI drug generation，也就是输入疾病表达谱，让模型生成候选分子，可以把表达谱作为条件输入。

### 使用 bulk 表达谱

一种思路是：

```text
疾病 bulk expression signature
  ↓
编码成 latent vector
  ↓
作为条件输入
  ↓
生成模型产生分子结构
  ↓
预测该分子是否能反转疾病 signature
```

可能使用的模型包括：

- conditional VAE；
- diffusion model；
- transformer-based molecular generator；
- graph generative model；
- reinforcement learning + expression reversal score。

输入可以是疾病差异表达向量、疾病通路活性向量或疾病 embedding。输出可以是 SMILES、分子图或候选药物 ranking。

### 使用 scRNA-seq 表达谱

scRNA-seq 更适合作为细胞状态条件：

```text
疾病细胞状态 embedding
  ↓
目标正常细胞状态 embedding
  ↓
模型学习需要怎样的 perturbation
  ↓
生成或筛选可诱导该状态转换的药物
```

例如：

```text
耐药肿瘤细胞状态 → 敏感状态
炎症巨噬细胞状态 → 正常巨噬细胞状态
纤维化成纤维细胞状态 → 非活化状态
```

这类问题本质上是在寻找一种药物或扰动，使细胞从 pathological state 转换到 desired state。

## 实际项目中的选择建议

如果目标是快速筛选候选药物，可以优先使用：

```text
bulk RNA-seq + CMap/LINCS + GDSC/CCLE 验证
```

原因是数据多、工具成熟、和药物扰动数据库兼容，且分析成本低。

如果目标是寻找细胞类型特异靶点，可以优先使用：

```text
scRNA-seq
```

因为它可以回答靶点在哪些细胞中表达、哪些细胞亚群驱动疾病、哪些细胞可能产生毒性，以及哪些细胞可能是耐药来源。

更理想的策略是结合两者：

```text
bulk RNA-seq：提供稳定的疾病整体 signature
scRNA-seq：解释 signature 来自哪些细胞和状态
药物扰动数据：验证药物是否能反转疾病状态
药敏数据：验证候选药物是否有效
靶点和通路数据：增强机制解释
```

一个比较完整的药物发现分析框架可以写成：

```text
1. 收集疾病 bulk RNA-seq 数据
   ↓
2. 差异表达分析，构建疾病 signature
   ↓
3. 用 CMap / LINCS 找反转 signature 的候选药物
   ↓
4. 收集疾病 scRNA-seq 数据
   ↓
5. 注释细胞类型，找到疾病相关细胞亚群
   ↓
6. 检查候选药物靶点是否在关键细胞亚群中表达
   ↓
7. 构建细胞类型特异 signature，重新筛选药物
   ↓
8. 用 GDSC / CCLE / PRISM / DepMap 验证药物敏感性
   ↓
9. 做通路、网络、靶点和毒性分析
   ↓
10. 实验验证
```

## 注意事项

bulk RNA-seq 需要特别注意细胞组成混杂。比如 bulk 中 CD8A 上调，可能表示 CD8 T cell 浸润增加，而不一定表示某个细胞类型内部 CD8A 表达升高。

bulk 数据还要注意批次效应。药物筛选对 batch 非常敏感，不同平台、不同实验室的数据直接合并容易产生误导性结果。

scRNA-seq 需要特别注意不要把每个 cell 当成独立生物学样本。做差异表达时，优先考虑按 sample 和 cell type 聚合成 pseudobulk。

另外，单细胞药物扰动数据目前仍然没有 bulk/L1000 那样大规模和标准化。因此，在实际药物发现中，常见做法是用 bulk 数据进行候选药物初筛，再用 scRNA-seq 解释作用细胞、优化靶点，并排查耐药和毒性风险。

## 总结

一句话总结：

> bulk RNA-seq 适合构建稳定的疾病整体表达 signature，用于药物筛选、药物重定位和药敏预测；scRNA-seq 适合解析疾病相关细胞类型和细胞状态，用于细胞类型特异靶点发现、耐药机制分析和更精细的药物响应建模。

两类数据在药物发现中的输入形式也不同：

- bulk 常用 `sample × gene expression matrix`、`up/down gene signature`、通路活性分数或表达 embedding；
- scRNA-seq 常用 pseudobulk、cell type proportion、cell-type-specific signature、cell state embedding 或 perturbation response profile。

实际应用中，更推荐把 bulk RNA-seq 和 scRNA-seq 结合使用：bulk 用来筛候选药物，scRNA-seq 用来解释作用细胞、优化靶点，并评估耐药和毒性风险。
