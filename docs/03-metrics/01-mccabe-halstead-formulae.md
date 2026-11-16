# 03-01 // McCabe, Halstead & Maintainability Formulae

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Modules:** `src/core/metrics/complexity.engine.ts`, `src/core/metrics/halstead.engine.ts`

---

## 1. McCabe Cyclomatic Complexity (`complexity.engine.ts`)

Thomas J. McCabe's control-flow graph metric measures the number of linearly independent execution paths through an AST subtree:

$$v(G) = E - N + 2P = 1 + \text{branch\_predicates}$$

* **Branching AST Node Types (`AST_NODE_TYPES`):** `IF_STATEMENT`, `FOR_STATEMENT`, `WHILE_STATEMENT`, `DO_WHILE_STATEMENT`, `CASE_CLAUSE`, `CATCH_CLAUSE`, `CONDITIONAL_EXPRESSION`, `LOGICAL_AND`, `LOGICAL_OR`.

| Metric | Calculation Rule | Treatment of `CASE_CLAUSE` |
| :--- | :--- | :--- |
| **Standard Cyclomatic ($v(G)$)** | $1 + \text{total\_branch\_nodes}$ | Every `case` clause increments $v(G)$ by $+1$ |
| **Modified Cyclomatic ($v_{\text{mod}}(G)$)** | $1 + \text{non\_case\_branches} + (1 \text{ if case\_count} > 0)$ | Entire multi-arm switch/match counts as $+1$ |
| **Max Nesting Depth (`maxDepth`)** | Peak `BLOCK` nesting depth during recursive pre-order traversal | Tracks structural indentation complexity |
| **Essential Complexity ($ev(G)$)** | $\max(1, v(G) - \lfloor \text{structured\_blocks} / 2 \rfloor)$ | Measures irreducible unstructured control flow |

---

## 2. Halstead Software Science (`halstead.engine.ts`)

Maurice Halstead's lexical science derives software volume and cognitive effort from distinct operators ($\eta_1$), distinct operands ($\eta_2$), total operators ($N_1$), and total operands ($N_2$):

$$V = (N_1 + N_2) \cdot \log_2(\max(2, \eta_1 + \eta_2))$$

| Metric | Symbol | Mathematical Expression | Constants (`HALSTEAD_CONSTANTS`) |
| :--- | :--- | :--- | :--- |
| **Vocabulary** | $\eta$ | $\eta = \eta_1 + \eta_2$ | Minimum log vocabulary = `2` |
| **Program Length** | $N$ | $N = N_1 + N_2$ | Total lexical tokens |
| **Volume (bits)** | $V$ | $V = N \cdot \log_2(\eta)$ | Warning = `800`, Critical = `2400` |
| **Difficulty** | $D$ | $D = \frac{\eta_1}{2} \cdot \frac{N_2}{\max(1, \eta_2)}$ | `DIFFICULTY_DIVISOR = 2` |
| **Effort** | $E$ | $E = D \cdot V$ | Mental discriminations required |
| **Estimated Bugs** | $B$ | $B = \frac{V}{3000}$ | `BUGS_DIVISOR = 3000` |

---

## 3. Oman & Hagemeister Maintainability Index

Combines Halstead Volume ($V$), Cyclomatic Complexity ($v(G)$), and Lines of Code ($\text{LOC}$) onto a normalized $0$ to $100$ scale:

$$MI = \max\left(0, \min\left(100, \frac{(171 - 5.2 \cdot \ln(V) - 0.23 \cdot v(G) - 16.2 \cdot \ln(\text{LOC})) \cdot 100}{171}\right)\right)$$

* **Operational Thresholds:** Nominal $\ge 65$, Warning $< 65$, Critical $< 40$.
