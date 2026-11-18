# Agent Instructions

## Engineering approach

Use Matt Pocock's skills as the primary workflow for:
- Requirements and domain modeling
- Specifications and ticketing
- Implementation and TDD
- General code review

Use Addy Osmani's skills for:
- API and frontend engineering
- Security and accessibility
- Performance and observability
- CI/CD and production deployment

## Skill coordination

- Use one primary workflow skill per phase.
- Do not run overlapping workflow skills.
- Apply complementary skills only when relevant.
- Do not preload full skill instructions here.
- Prefer explicitly selected skills when workflows overlap.
- Project requirements take precedence over generic advice.
- Surface instruction conflicts before proceeding.

## Implementation

- Clarify significant ambiguity before coding.
- Read the project glossary and relevant ADRs.
- Implement small vertical slices.
- Use red-green-refactor for behavioral changes.
- Run relevant tests, type checks and linting.
- Avoid unrelated modifications.

## Quality gates

- Apply security checks to auth and external integrations.
- Apply accessibility checks to UI changes.
- Review changes against acceptance criteria.
- Report verification evidence and outstanding risks.

## Completion

Work is complete only when applicable verification passes.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `j0yk1ll/mini-jobboard`. Read `docs/agents/issue-tracker.md` when working with tickets or specs.

### Triage labels

This repo uses the default triage labels. Read `docs/agents/triage-labels.md` when mapping a triage role to a tracker label.

### Domain docs

This repo uses a single-context layout. Read `docs/agents/domain.md` before exploring domain terminology or architecture decisions.
