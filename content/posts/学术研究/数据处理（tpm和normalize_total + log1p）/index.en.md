---
title: "Data Processing: TPM vs normalize_total + log1p"
slug: tpm-vs-normalize-total-log1p
translationKey: tpm-vs-normalize-total-log1p
description: "Compares the principles, use cases, advantages, disadvantages, and selection logic of normalize_total + log1p and TPM in single-cell data processing."
date: 2025-07-19
draft: false
tags:
categories:
  - Research
---

## **normalize_total + log1p processing**

This is usually called “CPM-like” normalization followed by log transformation. It is currently one of the most common approaches in single-cell analysis workflows, especially in Scanpy and Seurat.

### **normalize_total**

**Principle**: This step mainly corrects differences in **sequencing depth**. Different cells may capture very different total numbers of transcripts, also known as library size. This function divides each gene count in a cell by the total count of that cell, then multiplies the result by a scaling factor, which is 10,000 by default. The processed value can be understood as the gene count per 10k transcripts, similar to CPM (Counts Per Million).

**Purpose**: It removes differences in total molecular counts caused by technical factors such as capture efficiency and sequencing depth, making gene expression levels comparable across cells.

### **log1p**

**Principle**: Calculate log(X + 1), where X is the normalized count value.

**Purpose**:

-   **Stabilize variance**: The variance of raw counts is highly related to the mean. Genes with higher expression usually have larger differences across cells. Log transformation weakens this dependency and makes the variance of highly expressed and lowly expressed genes more similar.

-   **Make the data distribution more normal-like**: Single-cell data is usually highly skewed, with a small number of genes having very high expression. Log transformation makes the data distribution closer to a symmetric normal distribution, which is an important assumption for many downstream statistical models such as PCA and t-SNE.


## **TPM processing (Transcripts Per Million)**

TPM aims to correct both **sequencing depth** and **gene length** bias.

**Principle**:

-   **Correct gene length**: Divide the raw reads or UMI counts of each gene by its effective length, usually the total exon length in kilobases. This gives RPK (Reads Per Kilobase).

-   **Correct sequencing depth**: Sum the RPK values of all genes in a single cell to get a “total RPK”. Then divide each gene’s RPK value in that cell by the “total RPK” and multiply by 1,000,000.


## Comparison

|          |                                                |                                             |
| :------- | :--------------------------------------------- | :------------------------------------------ |
| Feature       | normalize_total + log1p                       | TPM (Transcripts Per Million)               |
| **Bias corrected** | **Sequencing depth**                                       | **Sequencing depth** and **gene length**                         |
| **Main use case** | Comparing the expression of **the same gene** across **different cells**. Suitable for clustering, trajectory inference, and differential expression analysis. | Comparing the expression of **different genes** within **the same cell**. For example, determining which gene is more highly expressed. |
| **Advantages**   | Fast, standard workflow, and no extra information required.                               | Theoretically more accurate and can reflect true gene abundance.                           |
| **Disadvantages**   | Does not correct gene length bias.                                     | More complex to calculate, requires gene length information, and may lose some gene information.                     |

In general, choose one of these two processing methods. Applying both will overwrite or distort the values produced by the previous processing step.
