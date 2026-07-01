# Development Philosophy of FlowKit

> _Architecture is the product. Code is merely its current implementation._

This document defines the engineering philosophy that guides the evolution of FlowKit. It is intended to outlive individual implementations, frameworks, and contributors.

These principles are not coding standards or style guidelines. They are architectural values that shape how decisions are made, how responsibilities are assigned, and how the system evolves over time.

When faced with multiple implementation options, choose the one that best preserves these principles.

---

# Philosophy

FlowKit is designed as an execution platform rather than a collection of UI components.

Its primary responsibility is to execute authored interaction flows in a deterministic, maintainable, and extensible manner.

The architecture should evolve gradually through evidence-based improvements rather than periodic rewrites.

Long-term maintainability is valued more highly than short-term implementation speed.

---

# Core Principles

## 1. Single Ownership

Every piece of state, behavior, and lifecycle has exactly one owner.

Other modules may observe, coordinate, or adapt that behavior, but they must never become secondary owners.

Duplicated ownership creates synchronization problems, hidden dependencies, and unpredictable execution.

Whenever ownership becomes unclear, the architecture should be clarified rather than worked around.

---

## 2. Runtime Independence

Execution must never depend on how a flow was authored.

Authoring formats are compile-time concerns.

The runtime operates only on the canonical runtime representation.

New authoring formats should require new compilers, not runtime redesign.

---

## 3. Compilation is a One-Way Boundary

Authoring formats are transformed into executable runtime objects during compilation.

Once compilation is complete, runtime code should not depend on authoring structures.

Compilation performs translation—not execution.

---

## 4. Clear Layer Boundaries

FlowKit is organized into distinct architectural layers.

```text
Authoring

↓

Compiler

↓

Runtime

↓

Coordination

↓

UI

↓

Observers
```

Each layer has a single responsibility.

Cross-layer shortcuts should be considered architectural exceptions requiring strong justification.

---

## 5. Behavior Before UI

Execution defines behavior.

The user interface visualizes behavior.

UI components should never determine execution correctness.

Execution logic should remain valid even if the presentation layer changes entirely.

---

## 6. Deterministic Execution

Given identical inputs and identical initial state, execution should always produce identical results.

Execution should never depend on rendering order, asynchronous UI timing, or framework lifecycle quirks.

Deterministic systems are easier to debug, test, and extend.

---

## 7. Explicit Data Flow

State should move through clearly defined transitions.

Developers should always be able to answer:

- Where was this value created?
- Who owns it?
- Who is allowed to modify it?
- Who consumes it?

Hidden mutations and implicit synchronization are considered architectural debt.

---

## 8. Composition Over Coupling

Subsystems should communicate through well-defined contracts rather than internal implementation knowledge.

Each subsystem should remain understandable in isolation.

Adding functionality should generally involve composing existing capabilities rather than tightly coupling unrelated modules.

---

## 9. Stable Public Contracts

Internal implementations are free to evolve.

Public contracts should evolve deliberately and cautiously.

Favor extending existing interfaces over replacing them whenever practical.

Stability reduces unnecessary migration effort throughout the codebase.

---

## 10. Coordinators Coordinate

Coordinator modules exist to orchestrate communication between subsystems.

They should not become owners of business logic or execution state.

Whenever a coordinator begins implementing domain behavior, responsibility has likely drifted.

---

## 11. Observers Never Influence Execution

Logging, analytics, debugging, recording, and telemetry are observers.

Observers receive information.

They never change execution.

Keeping observation separate from execution preserves determinism and simplifies reasoning.

---

## 12. Minimize Architectural Surface Area

Every abstraction introduces maintenance cost.

New services, utilities, hooks, managers, or interfaces should only be introduced when they reduce long-term complexity.

Prefer extending existing ownership over creating parallel abstractions.

Simple architecture scales better than clever architecture.

---

## 13. Incremental Evolution

Architecture should improve continuously through small, verified changes.

Large rewrites introduce unnecessary risk and invalidate existing knowledge.

Prefer the smallest correct improvement that strengthens the architecture.

---

## 14. Evidence-Driven Decisions

Architectural changes require evidence.

Evidence may include:

- execution tracing
- ownership analysis
- synchronization analysis
- confirmed correctness issues
- profiling
- verified architectural constraints

Speculation alone is not sufficient justification for architectural change.

---

## 15. Preserve Architectural Invariants

Implementations may change.

Architectural invariants should remain stable.

Refactoring should preserve the core design of the system while improving its implementation.

Changing an invariant requires architectural justification—not implementation convenience.

---

## 16. Backward Compatibility Through Isolation

Backward compatibility exists to preserve correctness, not to influence the future architecture.

Compatibility concerns should remain isolated behind well-defined boundaries.

The active runtime should not accumulate complexity solely because old systems continue to exist.

---

## 17. Optimize for Maintainability

Development speed should be measured over years rather than weeks.

Code that is easier to understand, reason about, and safely modify is more valuable than code that is merely shorter or more clever.

Reducing cognitive load is a primary architectural objective.

---

# Refactoring Principles

Refactoring is encouraged when it strengthens the architecture.

A refactor is justified when it:

- restores clear ownership
- removes duplicated responsibilities
- strengthens architectural boundaries
- reduces coupling
- improves execution determinism
- eliminates hidden synchronization
- simplifies reasoning
- reinforces existing architectural invariants

A refactor is **not** justified simply because code could be shorter, more modern, or stylistically cleaner.

---

# Decision Checklist

Before introducing any architectural change, ask:

1. Does this preserve or improve ownership?
2. Does this reduce coupling between subsystems?
3. Does this make execution more deterministic?
4. Does this strengthen architectural boundaries?
5. Does this improve local reasoning?
6. Does this reduce long-term maintenance cost?
7. Would a new contributor understand the system more easily after this change?
8. Does this preserve the canonical runtime model?
9. Is this decision supported by evidence rather than preference?
10. Is this the smallest change that achieves the desired outcome?

If most answers are "No", the change should be reconsidered.

---

# Working Rules

When contributing to FlowKit:

- Understand the existing architecture before proposing changes.
- Verify assumptions with evidence from the codebase.
- Respect established ownership boundaries.
- Preserve architectural invariants.
- Prefer extending existing abstractions over creating new ones.
- Avoid speculative improvements.
- Implement only confirmed issues.
- Keep changes focused and intentionally scoped.
- Leave the architecture easier to understand than you found it.

---

# Guiding Principle

> **Architecture should become simpler as FlowKit grows.**

Every feature, refactor, and bug fix should reinforce the architectural boundaries of the system rather than erode them.

Scalability is achieved not by increasing complexity, but by making responsibilities clearer, ownership stronger, and execution easier to reason about.
