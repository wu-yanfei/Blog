---
title: "Bulk RNA-seq vs Single-cell RNA-seq in Drug Discovery: Differences and Data Processing"
slug: bulk-vs-single-cell-transcriptomics-drug-discovery
translationKey: bulk-vs-single-cell-transcriptomics-drug-discovery
description: "Summarizes the key differences between bulk RNA-seq and scRNA-seq, their standard processing workflows, and how expression profiles can be converted into inputs for drug screening, drug repositioning, and drug generation models."
date: 2026-06-07
lastmod: 2026-06-07
draft: false
tags:
  - Transcriptomics
  - Drug Discovery
  - Single-cell
categories:
  - Research
---

## Core differences

**bulk RNA-seq** and **single-cell RNA-seq, scRNA-seq** both measure gene expression, but their resolution is very different.

In simple terms:

- **bulk RNA-seq** measures the averaged expression of a mixed population of cells;
- **scRNA-seq** measures expression at the single-cell level, making it possible to observe cell types, cell states, and cellular heterogeneity.

| Dimension | bulk RNA-seq | scRNA-seq |
| --- | --- | --- |
| Measurement object | Average expression of a tissue, sample, or cell population | Expression of individual cells |
| Data matrix | gene × sample | gene × cell |
| Signal characteristics | Relatively smooth and stable | Sparse, noisy, and affected by dropout |
| Resolution | Sample-level or tissue-level | Cell-type-level and cell-state-level |
| Main issues | Mixed cell composition | Batch effects, doublets, low-quality cells, sparsity |
| Common analyses | Differential expression, pathway enrichment, WGCNA, signature construction | Clustering, cell annotation, trajectory analysis, cell-cell communication, pseudobulk |
| Advantage in drug discovery | Suitable for constructing global disease or drug expression signatures | Suitable for identifying specific cell types, resistant subpopulations, and toxic cell states |
| Limitation in drug discovery | Cannot directly resolve cellular heterogeneity | Higher cost, more complex processing, and harder cross-dataset integration |

Therefore, the two are not simple substitutes for each other. They are complementary. bulk RNA-seq is better suited for stable sample-level comparisons, whereas scRNA-seq is better suited for explaining which cell types or cell states drive the observed expression changes.

## Standard processing of bulk RNA-seq

bulk RNA-seq usually starts from FASTQ files or an existing count matrix. A typical workflow is:

```text
FASTQ
  ↓
Quality control: FastQC / MultiQC
  ↓
Adapter and low-quality read trimming: fastp / Trimmomatic
  ↓
Alignment or pseudoalignment: STAR / HISAT2 / Salmon / kallisto
  ↓
Gene quantification: featureCounts / Salmon / kallisto
  ↓
count matrix: gene × sample
  ↓
Normalization: TPM / FPKM / CPM / DESeq2 size factor / edgeR TMM
  ↓
Differential expression analysis: DESeq2 / edgeR / limma-voom
  ↓
Functional analysis: GO / KEGG / Reactome / GSEA / GSVA
  ↓
Drug-related analysis: disease signature, drug reversal, target prioritization
```

Common expression matrices in bulk RNA-seq include three types.

### raw counts

raw counts are the most commonly used input for differential expression analysis. For example:

| gene | control_1 | control_2 | disease_1 | disease_2 |
| --- | ---: | ---: | ---: | ---: |
| TP53 | 120 | 135 | 300 | 280 |
| EGFR | 80 | 76 | 180 | 200 |

These data are suitable for:

- DESeq2;
- edgeR;
- limma-voom.

### TPM / FPKM

TPM and FPKM are more suitable for:

- displaying expression levels within a sample;
- clustering and visualization;
- some machine learning inputs.

However, TPM or FPKM are generally not recommended as direct inputs for rigorous differential expression testing.

### log-normalized expression

A common form is:

```text
log2(TPM + 1)
```

or other normalized log expression values. These are suitable for:

- PCA;
- clustering;
- expression signature construction;
- drug response prediction;
- machine learning modeling.

## Standard processing of scRNA-seq

Single-cell data usually start from FASTQ files or 10x Genomics outputs. A typical workflow is:

```text
FASTQ
  ↓
barcode / UMI identification
  ↓
Alignment and quantification: Cell Ranger / STARsolo / kallisto-bustools / Alevin-fry
  ↓
gene × cell count matrix
  ↓
Cell quality control: remove low-quality cells, high-mitochondrial cells, and cells with too few detected genes
  ↓
Doublet removal: DoubletFinder / Scrublet / scDblFinder
  ↓
Ambient RNA removal: SoupX / CellBender
  ↓
Normalization: log-normalization / SCTransform / scran
  ↓
Dimensionality reduction: PCA → UMAP / t-SNE
  ↓
Clustering: Leiden / Louvain
  ↓
Cell type annotation: marker genes / SingleR / CellTypist / Azimuth
  ↓
Downstream analysis: differential expression, pseudobulk, trajectory analysis, cell-cell communication, drug response analysis
```

The scRNA-seq matrix is generally:

```text
gene × cell
```

For example:

| gene | cell_1 | cell_2 | cell_3 | cell_4 |
| --- | ---: | ---: | ---: | ---: |
| CD3D | 10 | 0 | 0 | 2 |
| MS4A1 | 0 | 15 | 0 | 0 |
| EPCAM | 0 | 0 | 20 | 25 |

Its characteristics include:

- high sparsity;
- many genes are zero in many cells;
- expression measurements for individual cells are noisy;
- the number of captured cells can vary greatly across samples;
- individual cells should not be directly treated as independent biological replicates in ordinary differential expression analysis.

## Differences in differential expression analysis

### bulk RNA-seq

Differential expression analysis in bulk RNA-seq usually compares:

```text
disease samples vs normal samples
```

The result is:

```text
upregulated genes
downregulated genes
```

For example:

```text
Upregulated in disease: IL6, TNF, CXCL8, STAT1
Downregulated in disease: PPARG, KLF4, CDH1
```

This can be used as a disease expression signature.

### scRNA-seq

For scRNA-seq, it is usually not recommended to simply compare:

```text
all disease cells vs all normal cells
```

This is because cells from the same donor or sample are not independent biological replicates. Treating each cell as an independent sample may lead to **pseudoreplication**.

Two more robust strategies are commonly used.

First, perform differential expression analysis within each cell type:

```text
disease T cells vs normal T cells
disease macrophages vs normal macrophages
disease epithelial cells vs normal epithelial cells
```

This produces cell-type-specific disease signatures.

Second, perform **pseudobulk** analysis. Cells from the same sample and the same cell type are aggregated:

```text
sample_1_Tcell = sum of counts from all T cells in sample_1
sample_2_Tcell = sum of counts from all T cells in sample_2
sample_1_Macrophage = sum of counts from all macrophages in sample_1
```

This creates a matrix similar to bulk RNA-seq, which can then be analyzed using DESeq2, edgeR, or limma. For single-cell differential expression, pseudobulk is usually more robust than direct cell-level differential expression.

## Using bulk RNA-seq in drug discovery

The most common use of bulk RNA-seq in drug discovery is to build an **expression signature** for drug screening, drug repositioning, or drug response prediction.

### Disease signature reversal

The basic idea is: if some genes are upregulated and some genes are downregulated in a disease state, and a drug induces the opposite expression changes, then the drug may have therapeutic potential.

For example, the disease signature is:

```text
Upregulated in disease: A, B, C
Downregulated in disease: D, E, F
```

A drug-induced expression profile is:

```text
Downregulated by drug: A, B, C
Upregulated by drug: D, E, F
```

Then this drug may reverse the disease state. This is the core idea behind methods such as Connectivity Map and LINCS L1000.

A typical workflow is:

```text
Disease bulk RNA-seq data
  ↓
Differential expression between normal and disease samples
  ↓
Construct disease signature: up genes + down genes
  ↓
Compare with drug perturbation databases: CMap / LINCS / L1000 / GEO drug perturbation datasets
  ↓
Calculate connectivity score / reversal score
  ↓
Rank candidate drugs
  ↓
Pathway validation, target validation, and experimental validation
```

### Drug response prediction

bulk expression profiles are also frequently used to predict drug sensitivity. The input is usually:

```text
gene expression profiles of cell lines or patient samples
```

The output can be:

```text
IC50 / AUC / responder vs non-responder
```

Common data sources include:

- GDSC;
- CCLE;
- CTRP;
- PRISM;
- DepMap.

Common models include:

- Elastic Net;
- Random Forest;
- XGBoost;
- SVM;
- MLP;
- Autoencoder;
- Graph neural network;
- multi-omics fusion models.

### Target discovery

bulk expression changes can also be combined with pathway and network analysis to infer potential targets, such as:

- differentially expressed genes;
- hub genes;
- transcription factors;
- kinases;
- pathway nodes;
- master regulators.

## Using scRNA-seq in drug discovery

scRNA-seq is more suitable for answering questions related to cellular heterogeneity, such as:

- Which cell type does a drug mainly affect?
- Which cell subpopulation drives drug resistance?
- Which cell states are associated with disease progression?
- Does a drug induce toxic cell states?
- In which cells is a target specifically expressed?

### Identifying disease-associated cell types

For example, in inflammatory diseases, scRNA-seq may identify an expanded inflammatory macrophage subpopulation. Its marker genes, active pathways, and potential drug targets can then be analyzed.

### Identifying resistant cell subpopulations

In tumor samples collected before and after treatment, one can compare:

```text
pre-treatment
post-treatment
resistant relapse
```

The analysis can focus on:

- which cell subpopulations remain after treatment;
- which resistance pathways are activated;
- whether EMT, stem-like, hypoxia, or stress response states appear;
- whether immune escape-related expression changes are present.

### Prioritizing targets

For candidate targets, scRNA-seq can be used to examine:

```text
Is the target gene specifically highly expressed in disease-associated cell types?
Is the target also highly expressed in critical normal tissue cells?
Is the target co-expressed with disease-state markers?
```

This helps evaluate:

- therapeutic potential;
- cell-type specificity;
- potential toxicity.

### Cell-cell communication analysis

In the tumor microenvironment or immune diseases, scRNA-seq can also be used to analyze cell-cell communication, such as:

- ligand-receptor interaction;
- cytokine signaling;
- immune checkpoint;
- fibroblast-tumor interaction;
- macrophage-tumor interaction.

Common tools include:

- CellPhoneDB;
- NicheNet;
- CellChat;
- LIANA.

These analyses are useful for identifying microenvironment-related drug targets.

## Converting expression profiles into model inputs for drug discovery

### bulk expression profile inputs

bulk expression profiles can usually be represented as sample-level vectors:

```text
sample = [gene1_expr, gene2_expr, gene3_expr, ..., geneN_expr]
```

There are four common input forms.

First, a whole-gene expression matrix:

```text
X = samples × genes
```

A typical processing workflow is:

```text
raw counts
  ↓
filter lowly expressed genes
  ↓
normalize
  ↓
log transform
  ↓
batch correction
  ↓
feature selection
  ↓
model input
```

Second, a differential expression signature:

```text
up genes + down genes
```

This form is highly suitable for drug repositioning and CMap / LINCS queries.

Third, pathway activity scores. This converts the expression profile from the gene level to the pathway level:

```text
sample × pathway
```

Common methods include:

- GSEA;
- ssGSEA;
- GSVA;
- PROGENy;
- DoRothEA;
- VIPER.

This representation is usually more stable and more interpretable than using tens of thousands of genes directly.

Fourth, expression embeddings. PCA, autoencoders, VAE, and other methods can compress high-dimensional expression profiles into low-dimensional vectors:

```text
20,000 genes → 128-dimensional embedding
```

These embeddings can then be used for drug response prediction, disease subtype classification, drug similarity analysis, or as conditional inputs for generative models.

### scRNA-seq expression profile inputs

For scRNA-seq, it is generally not recommended to directly use each cell as an independent bulk sample in a model, because of sparsity, noise, unequal cell numbers, batch effects, and pseudoreplication. A more robust representation is usually constructed first.

First, pseudobulk expression profiles:

```text
sample_1_Tcell
sample_1_Macrophage
sample_1_Epithelial
sample_2_Tcell
sample_2_Macrophage
sample_2_Epithelial
```

These are suitable for cell-type-specific differential expression, drug signature comparison, and integration with bulk drug perturbation databases.

Second, cell type proportion features:

```text
Sample A:
T cell 30%
B cell 10%
Macrophage 20%
Tumor cell 40%
```

These proportions can be used as features for drug response prediction. For example, in immunotherapy, the proportions of CD8 T cells, exhausted T cells, and M2 macrophages may be associated with response or resistance.

Third, cell-type-specific signatures. A disease signature can be constructed separately for each cell type:

```text
disease macrophage signature
disease T cell signature
disease epithelial signature
```

This is more refined than bulk analysis, because a drug may only need to reverse the abnormal state of a key cell population.

Fourth, cell state embeddings. Models can learn representations of single-cell states, such as:

- scVI;
- scANVI;
- totalVI;
- scGPT;
- Geneformer;
- scFoundation;
- CPA;
- scGen.

These embeddings can be used for drug response prediction, perturbation response prediction, cell state transition modeling, and as conditional inputs for drug generation models.

Fifth, perturbation response profiles. If single-cell drug or CRISPR perturbation data are available, one can learn:

```text
untreated cell state + drug information → treated cell state
```

This type of task can be used to predict whether a drug can push a disease cell state back toward a normal state, and can also be used to predict drug combinations, sensitive subpopulations, and resistant subpopulations.

## Using expression profiles in drug generation models

If the goal is AI drug generation, where a disease expression profile is used as input to generate candidate molecules, expression profiles can be used as conditional inputs.

### Using bulk expression profiles

One possible strategy is:

```text
disease bulk expression signature
  ↓
encode into a latent vector
  ↓
use as a conditional input
  ↓
generative model produces molecular structures
  ↓
predict whether the molecule can reverse the disease signature
```

Possible models include:

- conditional VAE;
- diffusion model;
- transformer-based molecular generator;
- graph generative model;
- reinforcement learning + expression reversal score.

The input can be a disease differential expression vector, pathway activity vector, or disease embedding. The output can be SMILES, molecular graphs, or candidate drug rankings.

### Using scRNA-seq expression profiles

scRNA-seq is more suitable as a cell-state condition:

```text
disease cell state embedding
  ↓
target normal cell state embedding
  ↓
model learns the required perturbation
  ↓
generate or screen drugs that can induce the desired state transition
```

For example:

```text
resistant tumor cell state → sensitive state
inflammatory macrophage state → normal macrophage state
fibrotic fibroblast state → inactive state
```

The essence of this problem is to find a drug or perturbation that moves cells from a pathological state to a desired state.

## Practical selection strategy

If the goal is to quickly screen candidate drugs, a good starting point is:

```text
bulk RNA-seq + CMap/LINCS + GDSC/CCLE validation
```

This is because there are more data, the tools are mature, the workflow is compatible with drug perturbation databases, and the analysis cost is relatively low.

If the goal is to identify cell-type-specific targets, a good starting point is:

```text
scRNA-seq
```

This is because scRNA-seq can answer where the target is expressed, which cell subpopulations drive the disease, which cells may cause toxicity, and which cells may serve as the source of resistance.

A more ideal strategy is to combine the two:

```text
bulk RNA-seq: provides a stable global disease signature
scRNA-seq: explains which cells and states contribute to the signature
drug perturbation data: validates whether drugs can reverse the disease state
drug sensitivity data: validates whether candidate drugs are effective
target and pathway data: improves mechanistic interpretation
```

A relatively complete drug discovery analysis framework can be summarized as:

```text
1. Collect disease bulk RNA-seq data
   ↓
2. Perform differential expression analysis and construct a disease signature
   ↓
3. Use CMap / LINCS to identify drugs that reverse the signature
   ↓
4. Collect disease scRNA-seq data
   ↓
5. Annotate cell types and identify disease-associated cell subpopulations
   ↓
6. Check whether candidate drug targets are expressed in key cell populations
   ↓
7. Construct cell-type-specific signatures and re-screen drugs
   ↓
8. Validate drug sensitivity using GDSC / CCLE / PRISM / DepMap
   ↓
9. Perform pathway, network, target, and toxicity analysis
   ↓
10. Experimental validation
```

## Notes and cautions

bulk RNA-seq requires careful consideration of mixed cell composition. For example, increased CD8A expression in bulk data may indicate increased CD8 T cell infiltration, rather than increased CD8A expression within a particular cell type.

bulk data also require careful batch effect control. Drug screening is highly sensitive to batch effects, and directly combining datasets from different platforms or laboratories may lead to misleading results.

For scRNA-seq, do not treat each cell as an independent biological sample. For differential expression analysis, it is usually better to aggregate cells by sample and cell type into pseudobulk profiles.

In addition, single-cell drug perturbation data are still not as large-scale or standardized as bulk/L1000 resources. Therefore, in practical drug discovery projects, a common strategy is to use bulk data for initial drug candidate screening, then use scRNA-seq to interpret the affected cell types, refine targets, and evaluate resistance or toxicity risks.

## Summary

In one sentence:

> bulk RNA-seq is suitable for constructing stable global disease expression signatures for drug screening, drug repositioning, and drug sensitivity prediction; scRNA-seq is suitable for resolving disease-associated cell types and cell states, enabling cell-type-specific target discovery, resistance mechanism analysis, and more refined drug response modeling.

The input formats also differ:

- bulk commonly uses `sample × gene expression matrix`, `up/down gene signature`, pathway activity scores, or expression embeddings;
- scRNA-seq commonly uses pseudobulk profiles, cell type proportions, cell-type-specific signatures, cell state embeddings, or perturbation response profiles.

In practice, it is usually better to combine bulk RNA-seq and scRNA-seq: use bulk data to screen candidate drugs, and use scRNA-seq to interpret affected cell types, refine targets, and assess resistance and toxicity risks.
