# 02-01 // Chronos Core Metamodel: Entity & Reference Schema

> **Author:** `Oblx <code@oblx.dev>` | **Parent:** [`../00-index.md`](../00-index.md) | **Module:** `src/config/metamodel.constants.ts`

---

## 1. Entity Taxonomy (`ENTITY_KINDS`)

Every named syntactic construct extracted from a workspace is persisted in the `entities` table with one of nine canonical kinds:

| Entity Kind | Scope Level | Qualified Name Pattern | Semantic Role |
| :--- | :--- | :--- | :--- |
| `PROJECT` | Root | `workspace_name` | Top-level workspace container |
| `MODULE` | Package | `dir/module` | Logical package or imported module boundary |
| `FILE` | Physical File | `src/path/file.ts` | Physical compilation unit on disk or in archive |
| `NAMESPACE` | Lexical | `file.ts::Namespace` | Explicit namespace or Rust `mod` scope |
| `CLASS` | Type | `file.ts::ClassName` | Class, Python class, or Rust/C++ `struct` declaration |
| `INTERFACE` | Contract | `file.ts::InterfaceName` | Interface, type alias, or Rust `trait` |
| `FUNCTION` | Callable | `file.ts::fnName` | Standalone module-level callable function |
| `METHOD` | Member Callable | `file.ts::ClassName::method` | Callable scoped inside a `CLASS` or `INTERFACE` |
| `VARIABLE` | State / Constant | `file.ts::CONST_NAME` | Module constant, class field, or state variable |

---

## 2. Granular Reference & Mutation Taxonomy (`REFERENCE_KINDS`)

Directional dependencies between entities are stored in the `references` table with source/target coordinates (`line`, `column`) and one of ten canonical kinds:

| Reference Kind | Direction | Inverse Projection | Semantic Meaning |
| :--- | :--- | :--- | :--- |
| `DEFINES` | `Container -> Member` | `DefinedIn` | Lexical ownership (`FILE` defines `CLASS`, `CLASS` defines `METHOD`) |
| `CALLS` | `Caller -> Callee` | `CalledBy` | Direct function or method invocation |
| `IMPORTS` | `File -> Symbol/Module` | `ImportedBy` | Module import, Python `import`, or Rust `use` statement |
| `INHERITS` | `Subtype -> Supertype` | `InheritedBy` | Class inheritance (`extends` or Python base class) |
| `IMPLEMENTS` | `Class -> Interface` | `ImplementedBy` | Contract realization (`implements` or `impl Trait for Struct`) |
| `SETS` | `Method -> Variable` | `SetBy` | Direct state assignment (`this.field = ...` or `self.field = ...`) |
| `MODIFIES` | `Method -> Variable` | `ModifiedBy` | In-place state mutation (`+=`, `-=`, `++`, `--`, `.push()`, `.pop()`, `.splice()`, `.set()`, `.delete()`) |
| `USES` | `Method -> Variable` | `UsedBy` | State read access (`this.field` or `self.field`) |
| `TYPED` | `Callable/Field -> Type` | `TypedBy` | Parameter, return, or field type annotation coupling (`: TypeName`) |
| `OVERRIDES` | `Subtype Method -> Base Method` | `OverriddenBy` | Polymorphic method override (`override` or matching base method) |

---

## 3. Source Units (`source_units`) & Deterministic FNV-1a Checksums

Full raw file buffers are persisted in the `source_units` table (`fileId`, `filePath`, `language`, `lineCount`, `content`) mirrored across `bun:sqlite` and IndexedDB, while each entity row stores a 32-bit FNV-1a hexadecimal checksum computed over its `sourceSlice`.
