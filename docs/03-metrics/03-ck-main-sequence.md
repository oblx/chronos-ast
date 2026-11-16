# 03-03 // Chidamber-Kemerer OO Suite, Main Sequence & CodeCheck Engine

> **Author:** `Oblx <code@oblx.dev>` | **Parent Index:** [`../00-index.md`](../00-index.md) | **Domain:** `src/core/metrics/{oo_metrics,codecheck}.engine.ts`, `src/config/rules.registry.ts`

---

## 1. Chidamber-Kemerer (CK) Object-Oriented Metric Suite

`src/core/metrics/oo_metrics.engine.ts` computes the six canonical Chidamber-Kemerer object-oriented metrics alongside Robert C. Martin's package stability equations for every class, struct, interface, and module:

| Metric | Formula & Graph Derivation | Threshold (`CK_THRESHOLDS`) |
| :--- | :--- | :--- |
| **`WMC` (Weighted Methods per Class)** | Sum of McCabe cyclomatic complexities `v(G)` across all member methods of the class | Warning `>= 20`, Critical `>= 30` |
| **`DIT` (Depth of Inheritance Tree)** | Maximum directed path length along `INHERITS` and `IMPLEMENTS` edges to root ancestors | Warning `>= 3`, Critical `>= 5` |
| **`NOC` (Number of Children)** | Count of direct subtypes referencing the entity via `INHERITS` or `IMPLEMENTS` | Informational fan-in indicator |
| **`CBO` (Coupling Between Object Classes)** | Count of distinct external entities coupled via outbound or inbound non-inheritance edges | Warning `>= 12`, Critical `>= 16` |
| **`RFC` (Response For a Class)** | Cardinality of the union of local methods and all directly invoked external functions (`CALLS`) | Warning `>= 20`, Critical `>= 25` |
| **`LCOM4` (Lack of Cohesion of Methods)** | Connected components of methods sharing state reads/writes (`USES`, `SETS`, `MODIFIES`) or internal calls | Split candidate when `LCOM4 >= 2` |

---

## 2. Abstractness ($A$) & Distance from the Main Sequence ($D$)

$$D = |A + I - 1|$$

* **Abstractness ($A$):** Ratio of abstract contracts (`INTERFACE` entities) to total workspace entities ($0.0 \le A \le 1.0$).
* **Instability ($I$):** Ratio of efferent coupling to total coupling ($I = \frac{C_e}{C_a + C_e}$).
* **Main Sequence Distance ($D$):** Concrete, heavily depended-upon modules ($A = 0, I = 0$) sit in the Zone of Pain ($D \ge 0.7$, rule `CHR-013`).

---

## 3. Declarative 15-Rule CodeCheck Governance Registry (`CHR-001` .. `CHR-015`)

`src/config/rules.registry.ts` and `src/core/metrics/codecheck.engine.ts` enforce 15 zero-magic rules across the HUD (`CodeCheckDrawer.svelte`) and headless CLI (`src/workers/cli.runner.ts`):

1. **`CHR-001` (`MCCABE_WARN`) & `CHR-002` (`MCCABE_CRIT`):** Cyclomatic complexity `v(G) >= 10` and `v(G) >= 25`.
2. **`CHR-003` (`HALSTEAD_WARN`) & `CHR-004` (`HALSTEAD_CRIT`):** Halstead volume `V >= 800` and `V >= 2400`.
3. **`CHR-005` (`LOC_BUDGET`) & `CHR-006` (`CFG_UNREACHABLE`):** Entity LOC `> 150` and unreachable CFG dead blocks `>= 1`.
4. **`CHR-007` (`LCOM4_SPLIT`) & `CHR-008` (`GOD_CLASS`):** Disconnected cohesion `LCOM4 >= 2` and compound `WMC >= 30` with `LCOM4 >= 2`.
5. **`CHR-009` (`CK_DIT_DEEP`), `CHR-010` (`CK_CBO_HIGH`), `CHR-014` (`CK_RFC_HIGH`):** Deep inheritance (`DIT >= 3`), high coupling (`CBO >= 16`), and excessive response set (`RFC >= 25`).
6. **`CHR-011` (`LAYER_VIOLATION`), `CHR-012` (`SCC_CYCLE`), `CHR-013` (`MAIN_SEQ_PAIN`), `CHR-015` (`STATE_MUTATION_HOTSPOT`):** Clean Onion ring back-calls, Tarjan cyclic SCC participation, Main Sequence distance `D >= 0.7`, and in-place state mutation hotspots (`MODIFIES >= 4`).
