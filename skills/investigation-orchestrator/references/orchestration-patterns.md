# Orchestration Patterns

Use these patterns to choose the smallest investigation topology that still
protects coverage.

`local` is the default. Move to another topology only after the parent skill's
activation gate passes and a concrete dependency or independent evidence front
requires it. Keywords, file count alone, or the mere possibility of a
cross-layer mismatch are not escalation reasons.

## Local

Choose `local` when:

- the issue is confined to one area
- only a few files are likely involved
- the answer depends on close reading more than broad discovery
- delegation overhead would be larger than the investigation itself

Use another topology only when a cross-layer mismatch remains plausible after focused local checks.

## Sequential

Choose `sequential` when:

- one discovery step determines where the next one should go
- contracts or boundaries must be understood first
- later branches would likely be reworked if started too early

Typical examples:

- understand API contract first, then inspect consumers
- map data model first, then inspect repository and service behavior

## Parallel

Choose `parallel` when:

- multiple fronts are genuinely independent
- overlap can be avoided with clean scope boundaries
- a synthesis step can merge findings safely afterward

Typical examples:

- frontend vs backend surface mapping
- tests vs implementation mapping
- two unrelated subsystems touched by the same workflow

Do not use `parallel` only because the task is large. Independence matters more
than size.

## Hybrid

Choose `hybrid` when:

- one initial step is needed to frame the investigation
- multiple branches become clear only after that step
- a final synthesis step is required

Typical shape:

1. foundation discovery
2. parallel deep-dives
3. synthesis and diagnosis

## Practical Heuristic

- low uncertainty + localized scope -> `local`
- medium uncertainty + dependency chain -> `sequential`
- medium/high uncertainty + isolated fronts -> `parallel`
- mixed dependency + isolated branches later -> `hybrid`
