# CVBase Career OS  
## Recursive Implementation Authority

**Product:** CVBase  
**Target state:** AI Career Operating System  
**Document authority:** Product, UX, frontend architecture, orchestration, migration and implementation authority  
**Primary objective:** Transform the existing CVBase product into one coherent Career OS without unnecessarily rebuilding proven capabilities  
**Implementation mode:** Progressive recomposition of the existing product  
**Status:** Approved for repository audit and implementation planning  

---

# 0. Executive Directive

CVBase already possesses substantial career functionality.

The implementation objective is therefore **not to create another career platform**.

The objective is to transform the existing application from a collection of career tools into one persistent, intelligent system that:

- understands the user's professional identity;
- understands the user's career objectives;
- understands opportunities in relation to those objectives;
- maintains context across workflows;
- recommends the next useful action;
- helps execute that action;
- observes outcomes;
- improves subsequent recommendations.

The product must cease behaving as:

> a CV builder surrounded by additional features.

It must behave as:

> **the operating system for the user's professional life.**

The transformation is primarily one of:

- information architecture;
- persistent career context;
- workflow orchestration;
- product navigation;
- state continuity;
- recommendation prioritization;
- intelligent action;
- interaction design;
- visual design;
- cross-feature integration;
- migration;
- responsiveness;
- accessibility;
- perceived quality.

The implementation principle governing the entire program is:

> **Maximum experiential transformation with minimum unnecessary reinvention.**

---

# 1. Non-Negotiable Product Invariants

These requirements override local implementation convenience.

## 1.1 Preserve proven capabilities

Existing working capabilities must be discovered and reused before new implementations are created.

Agents must not recreate working:

- CV generation;
- CV editing;
- opportunity analysis;
- career profile functionality;
- application tracking;
- interview preparation;
- career coaching;
- document generation;
- opportunity matching;
- authentication;
- user preferences;
- analytics;
- integrations;
- historical data.

Refactoring is permitted.

Duplication is not.

---

## 1.2 One Career Context

There must be one canonical representation of what CVBase understands about the user's career.

Individual modules must not maintain competing professional profiles.

---

## 1.3 One Goal System

Career objectives must be reusable throughout CVBase.

The user must not repeatedly specify target roles, locations, industries, compensation or career direction inside separate tools.

---

## 1.4 One Opportunity Context

An opportunity selected in Opportunities must remain the same opportunity when the user moves through:

Opportunity  
→ Application  
→ CV  
→ Coach  
→ Networking  
→ Interview Preparation  
→ Outcome

---

## 1.5 One Application Context

All job-specific work must belong to one application workspace rather than independent feature sessions.

---

## 1.6 One Coach

CVBase must expose one primary conversational operating interface.

Individual features may provide contextual assistance, but they must not become independent AI products.

---

## 1.7 One Design Language

All new and migrated surfaces must use the canonical design system.

No page-specific design systems.

---

## 1.8 One Recommendation Model

Screens must consume a shared recommendation/action interface wherever technically appropriate.

Do not build unrelated recommendation logic separately for Today, Career, Opportunities, Campaigns and Coach unless existing architecture makes separation necessary.

---

# 2. Explicit Non-Goals

This program does not authorize CVBase to become:

- an ATS for employers;
- a recruiter CRM;
- a social network;
- a learning management system;
- a job marketplace requiring employer-side infrastructure;
- an HRIS;
- a general-purpose productivity suite;
- an autonomous job application spam engine;
- a separate AI platform unrelated to career workflows.

It also does not authorize architectural rewriting merely for elegance.

Existing business logic should remain intact unless one of the following is true:

1. it prevents the Career OS experience;
2. it contains a verified defect;
3. it creates unavoidable duplication;
4. it blocks maintainability or migration;
5. a documented capability gap exists.

---

# 3. Source-of-Truth Hierarchy

When implementation decisions conflict, authority is resolved in this order:

1. **Product invariants in this document**
2. **Existing production data integrity**
3. **Existing proven business behaviour**
4. **Canonical Career OS domain contracts**
5. **Canonical design system**
6. **Canonical information architecture**
7. **Individual screen specifications**
8. **Implementation convenience**

An agent must not violate a higher-level requirement to simplify a lower-level task.

---

# 4. Transformation Rule

Before introducing any functionality, agents must execute:

**SEARCH → MAP → REUSE → RECOMPOSE → EXTEND ONLY IF NECESSARY**

For each intended implementation:

### SEARCH

Inspect:

- routes;
- frontend components;
- hooks;
- stores;
- APIs;
- database models;
- services;
- existing AI workflows;
- tests;
- analytics;
- feature flags;
- integrations.

### MAP

Determine how the existing capability maps to Career OS.

### REUSE

Prefer existing capability and data.

### RECOMPOSE

Change navigation, presentation, state composition or orchestration.

### EXTEND

Add functionality only where a verified gap exists.

Every newly introduced subsystem must record:

- capability gap;
- evidence that existing implementation cannot satisfy it;
- why extension is preferable to refactoring;
- dependencies;
- consumers;
- migration impact;
- removal strategy if temporary.

---

# 5. Career OS Canonical Model

The experience is organized around five first-class product objects.

| Object | Purpose |
|---|---|
| Career | Persistent professional identity and evidence |
| Goal | Desired future professional state |
| Opportunity | Job, employer, project, path or professional possibility |
| Campaign | Coordinated effort toward a career outcome |
| Action | Something the user or CVBase should do next |

Supporting objects may include:

- Application;
- Achievement;
- Evidence;
- Skill;
- Document;
- Interview;
- Conversation;
- Activity;
- Outcome.

These supporting objects must attach to the primary Career OS model rather than establishing parallel product universes.

---

# 6. Canonical Relationship Model

Conceptually:

```text
User
 └── Career
      ├── Experiences
      ├── Achievements
      ├── Skills
      ├── Education
      ├── Evidence
      ├── Documents
      └── Goals
           └── Campaigns
                ├── Opportunities
                │    └── Applications
                │         ├── CV Versions
                │         ├── Cover Letters
                │         ├── Questions
                │         ├── Networking
                │         ├── Interviews
                │         └── Outcomes
                └── Actions
```

This is a **product-domain relationship model**, not automatic authorization to create matching database tables.

Existing models must be mapped before persistence changes are considered.

---

# 7. Career OS Context Contract

Every context-aware screen or agent workflow should be able to receive a canonical context envelope.

Conceptually:

```text
CareerContext
    user
    career
    active_goal?
    active_campaign?
    active_opportunity?
    active_application?
    active_document?
    recent_activity
    relevant_evidence
    relevant_preferences
    permissions
```

Not every destination requires every field.

Context should be projected to the minimum relevant set.

The purpose is to eliminate repeated prompts such as:

- What role are you applying for?
- What are your career goals?
- What CV should I use?
- What industry are you targeting?
- What seniority do you want?

when CVBase already knows the answer.

---

# 8. Context Continuity Requirement

The following journey must retain context:

```text
Opportunity
   ↓
Application
   ↓
Tailored CV
   ↓
Coach
   ↓
Interview Preparation
   ↓
Outcome
```

Navigation tests must verify that:

- opportunity identity remains correct;
- application identity remains correct;
- goal remains available;
- campaign remains available;
- associated documents remain available;
- recommendations do not reset unnecessarily;
- user decisions persist.

Context preservation is a release requirement, not an optional optimization.

---

# 9. Product Experience Architecture

CVBase has six primary spaces.

| Space | Purpose |
|---|---|
| Today | Career command center |
| Career | Professional system of record |
| Opportunities | Opportunity intelligence |
| Campaigns | Outcome pursuit |
| Coach | Conversational operating interface |
| Library | Professional assets |

The primary information architecture must remain intentionally small.

The application's internal feature taxonomy must not leak into navigation.

---

# 10. Canonical Navigation

## Desktop

```text
CVBase

Today
Career
Opportunities
Campaigns
Coach
Library

────────────

Search
Notifications
Profile
```

## Mobile

```text
Today
Opportunities
Coach
Campaigns
More
```

`More` provides:

- Career
- Library
- Settings
- Integrations
- Help

Secondary capabilities should normally enter through context.

Example:

Interview Preparation should appear inside an application or relevant action rather than becoming another permanent navigation item.

---

# 11. Today — Career Command Center

Today replaces the generic SaaS dashboard.

Its question is:

> **What deserves my attention today?**

## 11.1 Information hierarchy

The default order should be:

1. orientation;
2. priority actions;
3. career pulse;
4. active campaigns;
5. recent activity.

Avoid filling the screen with equally weighted cards.

---

## 11.2 Orientation

Example:

```text
Good morning, Sarah.

You have 3 meaningful career actions today.

Target
Senior Product Director

Current campaign
UK Product Leadership

Momentum
Strong

Next milestone
Secure 3 first-round interviews
```

The user should understand their current trajectory within seconds.

---

## 11.3 Priority Actions

Normally expose approximately three highest-value actions.

Example:

```text
HIGH PRIORITY

Prepare for tomorrow's Stripe interview

42 min estimated
Interview readiness: 68%

Why this matters
Your interview is tomorrow and two leadership themes
have not yet been prepared.

[Continue preparation]
```

Every recommendation requires an explanation.

No unexplained AI prioritization.

---

## 11.4 Career Pulse

Use professional signals rather than artificial gamification.

Examples:

- career strength;
- market alignment;
- application response;
- interview readiness;
- profile completeness.

Signals must be explainable and ideally inspectable.

---

## 11.5 Campaign Summary

Campaign cards should communicate:

- objective;
- stage;
- momentum;
- important counts;
- immediate next action.

---

## 11.6 Activity

Provide one chronological activity stream across relevant Career OS activity.

Avoid separate histories for each feature where a unified timeline can serve the user better.

---

# 12. Career — Professional System of Record

Career answers:

> **What does CVBase understand about me professionally?**

Subnavigation:

```text
Overview
Experience
Achievements
Skills
Education
Evidence
Goals
Profile
```

Career must not visually behave like a résumé editor.

---

# 13. Career Overview

Show:

- professional positioning;
- current role;
- intended direction;
- strongest capabilities;
- career trajectory;
- achievement quality;
- evidence quality;
- target-role readiness;
- meaningful gaps.

Example:

```text
Sarah Khan
Product & Marketplace Leader

12 years experience

Current
Director of Product

Target
VP Product / CPO

Primary markets
UK · UAE · Remote
```

---

# 14. Career Timeline

The timeline should communicate progression.

Each experience may expand into:

- role;
- company;
- period;
- scope;
- achievements;
- projects;
- skills;
- evidence.

Do not mimic CV formatting.

---

# 15. Achievement Model

Achievements should become reusable career knowledge.

Example:

```text
Marketplace Growth

Grew GMV from $18M to $41M

Period
18 months

Role
Director of Product

Evidence
Verified

Used in
8 CVs
4 applications
2 interview stories
LinkedIn profile
```

An achievement should be reusable across workflows without repeatedly reconstructing it.

---

# 16. Evidence Model

Professional claims should expose a human-readable provenance state.

Canonical states should map, where possible, onto existing underlying data:

- Verified
- User confirmed
- Inferred
- Incomplete

The interface should never present uncertain information as verified fact.

Generated improvements that introduce new facts require confirmation.

---

# 17. Goals

Goals become first-class Career OS objects.

Examples:

```text
Primary
Become VP Product

Secondary
Move to UAE

Long term
Become CPO
```

A goal may include:

- role;
- level;
- industries;
- geography;
- compensation;
- timeline;
- constraints;
- target employers;
- preferences.

Goals must become available to:

- recommendation logic;
- opportunity analysis;
- campaign creation;
- Coach;
- application preparation;
- Today.

---

# 18. Opportunities

Opportunities must behave like an intelligence workspace rather than a conventional job board.

Views:

```text
For You
Saved
Applied
Watching
Archived
```

---

# 19. Opportunity Intelligence

Opportunity presentation must distinguish:

### Qualification fit

Can this person plausibly perform or obtain this role?

### Career-direction fit

Does pursuing this role move the person toward their stated objective?

These must not be collapsed into one opaque matching percentage.

Example:

```text
Qualification fit
High

Career-direction fit
Medium

Why

Your marketplace and leadership experience align strongly.

However, the role provides limited progression toward
your stated VP Product objective.
```

---

# 20. Opportunity Card

Cards should prioritize meaning rather than metadata volume.

Example:

```text
Head of Product
Revolut

London · Hybrid

Career alignment
91% — Strong

Strong evidence
Marketplace leadership
Team management
Fintech exposure

Needs attention
P&L ownership
International expansion

Posted 2 days ago

[Review]
```

A numeric score may summarize a result.

It may not replace its explanation.

---

# 21. Opportunity Detail

Desktop should favor a contextual split view.

### Opportunity information

- company;
- role;
- description;
- requirements;
- compensation;
- location;
- company information.

### Career intelligence

- qualification fit;
- career-direction fit;
- supporting evidence;
- gaps;
- missing information;
- career implications;
- recommended positioning.

Persistent actions:

```text
Save
Ask Coach
Start Application
Not Interested
```

---

# 22. Campaigns

A campaign is an intentional attempt to produce a career outcome.

Examples:

- secure a VP Product role in London;
- relocate to the UAE;
- transition into cybersecurity leadership;
- obtain a first graduate role;
- return after a career break.

Campaign lifecycle:

```text
Goal
 ↓
Strategy
 ↓
Target Opportunities
 ↓
Applications
 ↓
Networking
 ↓
Interviews
 ↓
Offers
 ↓
Outcome
```

---

# 23. Campaign Overview

Example:

```text
UK Product Leadership

Goal
VP Product position

Target deadline
31 March

Progress
64%

Opportunities        21
Applications         12
Responses             5
Interviews            3
Final rounds          1
Offers                0

CVBase assessment
Campaign is progressing well.

Primary constraint
Interview conversion.
```

Campaign assessments must be based on observable state.

---

# 24. Campaign Board

Optional lifecycle view:

```text
DISCOVERED
SAVED
PREPARING
APPLIED
RESPONSE
INTERVIEW
FINAL
OFFER
CLOSED
```

Where integrations provide reliable information, status may update automatically.

Automatically inferred status changes must remain inspectable and correctable.

---

# 25. Application Workspace

Starting an application creates a persistent workspace.

The user must not be sent between unrelated tools.

Canonical structure:

```text
Stripe
Director of Product

Application readiness
82%

Role Analysis
CV
Cover Letter
Questions
LinkedIn
Networking
Interview Preparation
Notes
Activity
```

Every section inherits the same application context.

---

# 26. Application Readiness

Readiness must be decomposable.

Example:

```text
Profile evidence          Complete
CV                        Ready
Cover letter              Ready
Application questions     3 remaining
LinkedIn positioning      Recommended change
Networking                2 possible contacts
Interview preparation     Not started
```

Avoid readiness scores that cannot be explained.

---

# 27. CV Workspace

CV creation remains a major capability but no longer defines the product architecture.

Within an application the normal action becomes:

> **Create application version**

General CV creation remains supported.

Desktop editing should support a three-pane model:

```text
STRUCTURE     EDITOR           PREVIEW

Experience    Content          Rendered CV
Education     Suggestions
Skills        Evidence
...
```

The structure pane must be collapsible.

Preview should update incrementally.

---

# 28. AI-Assisted Editing

Assistance belongs inline whenever possible.

Example:

```text
Strengthen this achievement

Current
Managed enterprise customers.

Suggested
Managed a portfolio of 34 enterprise accounts...

Why
Specific scope strengthens the seniority signal.

[Accept] [Edit] [Dismiss]
```

CVBase must distinguish:

### Transformation

Rewriting information already known.

from:

### New assertion

Introducing information not yet confirmed.

New assertions require explicit confirmation.

Metrics must never be fabricated silently.

---

# 29. Coach

Coach becomes the primary conversational interface to the Career OS.

It is not a generic chatbot.

Header concept:

```text
CVBase Coach

I understand your career, goals,
active applications and recent progress.
```

Contextual prompts may include:

- What should I focus on today?
- Should I consider this opportunity?
- Prepare me for tomorrow's interview.
- Why am I getting interviews but no offers?
- What would strengthen my path toward VP Product?
- Compare these opportunities.

---

# 30. Coach Context

Conversations can operate against:

- whole career;
- specific opportunity;
- specific application;
- campaign;
- goal.

The system should intelligently preselect context based on origin.

The user may override it.

The selected context must be visible.

---

# 31. Coach Actions

Coach must be capable of invoking product workflows.

Example:

```text
User:
Tailor my CV for the Stripe role.

Coach:
I've prepared a Stripe-specific version.

Main changes:
• prioritised marketplace leadership
• surfaced international expansion
• strengthened management evidence

Two statements need your confirmation.

[Review CV]
```

The action must create or update the real CV workflow.

Coach must not pretend an action happened when it merely described the action.

---

# 32. Library

Library contains imported and generated professional assets.

Categories may include:

- CVs;
- cover letters;
- career profiles;
- interview stories;
- documents;
- certificates;
- portfolio materials;
- generated assets.

Support:

- search;
- filters;
- collections;
- opportunity associations;
- version history.

Library is an asset repository.

It is not the product's home screen.

---

# 33. Universal Command Surface

Desktop:

```text
⌘ K / Ctrl K
```

Examples:

```text
Search my career
Open opportunity
Open campaign
Create CV
Ask Coach
Find achievement
Prepare interview
Update profile
Go to...
```

The command surface must support both navigation and actions.

---

# 34. Global Search

Global search should eventually span:

- experiences;
- achievements;
- skills;
- opportunities;
- applications;
- companies;
- documents;
- conversations;
- campaigns.

Example:

```text
Search: AWS

CAREER
AWS migration — Senior Engineer

ACHIEVEMENTS
Reduced AWS infrastructure spend 23%

OPPORTUNITIES
Cloud Director — AWS

APPLICATIONS
Principal Architect — Datadog
```

Implementation must first assess existing search capabilities before introducing new infrastructure.

---

# 35. Notifications

Notifications must distinguish:

### Information

Useful awareness.

### Action required

Something requiring user intervention.

Categories:

- Needs Attention
- Opportunity
- Application
- Career
- System

Examples:

```text
Stripe interview tomorrow
[Prepare]

3 newly aligned opportunities
[Review]

Recruiter responded
[Open]
```

Notification volume is not a success metric.

---

# 36. Career Intelligence Contract

The UI should ideally consume a unified intelligence interface.

Conceptually:

```text
Career
+
Goals
+
Opportunities
+
Campaigns
+
Applications
+
Activity
+
Outcomes
       ↓
Career Intelligence
       ↓
Actions
Insights
Warnings
Recommendations
Opportunity Signals
```

This does not automatically require a new backend service.

The repository audit determines whether orchestration belongs in:

- an existing service;
- frontend composition;
- an existing AI layer;
- a refactored domain service;
- or, only when justified, a new service.

---

# 37. Canonical Recommendation Contract

A recommendation should conceptually contain:

```text
Recommendation
    id
    type
    title
    summary
    reason
    evidence[]
    priority
    confidence?
    context
    action?
    created_at
    expires_at?
```

`reason` is mandatory for recommendations rendered to the user.

Recommendations should be inspectable.

---

# 38. Canonical Action Contract

Significant recommendations map to typed actions.

Initial canonical action vocabulary:

```text
REVIEW_OPPORTUNITY
IMPROVE_ACHIEVEMENT
PREPARE_INTERVIEW
TAILOR_CV
FOLLOW_UP_APPLICATION
UPDATE_SKILL
START_CAMPAIGN
REVIEW_PROFILE
COMPARE_ROLES
```

Action representation should conceptually include:

```text
Action
    id
    type
    priority
    title
    reason
    context
    destination
    estimated_effort?
    status
    source
    created_at
    expires_at?
```

Existing models should be adapted where possible rather than replaced.

---

# 39. Action State Model

Where required, actions should use a predictable lifecycle such as:

```text
PROPOSED
READY
IN_PROGRESS
WAITING_FOR_USER
COMPLETED
DISMISSED
EXPIRED
FAILED
```

The exact implementation should align with existing state infrastructure.

---

# 40. Real Execution Progress

Long-running operations must expose meaningful execution stages.

Bad:

```text
Loading...
```

Preferred:

```text
Preparing your application

✓ Analysed role
✓ Compared career evidence
● Building tailored CV
○ Preparing interview themes
```

Displayed stages must correspond to real execution state.

Fake progress indicators are prohibited.

---

# 41. Product Personalization

CVBase should retain the same underlying architecture while changing emphasis according to career stage.

### Graduate

Emphasize:

- first-role discovery;
- skills;
- internships;
- interview fundamentals.

### Experienced professional

Emphasize:

- progression;
- opportunity matching;
- evidence;
- compensation;
- application performance.

### Executive

Emphasize:

- positioning;
- narrative;
- networking;
- board/executive opportunities;
- recruiter engagement.

Personalization must not fragment CVBase into separate products.

---

# 42. Design Direction

CVBase should communicate:

- confidence;
- intelligence;
- clarity;
- calm;
- professionalism;
- precision.

The interface should avoid appearing as:

- generic HR SaaS;
- AI-chat wrapper;
- template marketplace;
- colourful gamified productivity application.

The conceptual category is:

> **Premium professional operating system**

---

# 43. Visual Hierarchy

Every major screen requires:

- one dominant purpose;
- one obvious primary action;
- limited secondary actions;
- contextual advanced detail;
- deliberate whitespace.

Avoid:

- walls of cards;
- excessive borders;
- equally weighted dashboard grids;
- decorative metrics without actionable meaning.

---

# 44. Canonical Design System

Design-system foundations must be established before broad screen migration.

Required areas:

```text
Typography
Spacing
Grid
Breakpoints
Radius
Elevation
Surface hierarchy
Colour semantics
Iconography
Motion
Focus
Forms
Loading
Empty states
Errors
Skeletons
Charts
Cards
Panels
Dialogs
Sheets
Tooltips
Commands
```

Use semantic tokens.

Examples:

```text
surface.primary
surface.secondary
surface.elevated

text.primary
text.secondary
text.muted

action.primary
action.secondary

status.success
status.warning
status.danger
status.info
```

Raw visual values should not proliferate throughout product code.

---

# 45. Career OS Component Layer

High-level reusable components should include, where existing equivalents do not already satisfy the requirement:

```text
CareerGoalCard
OpportunityCard
ApplicationCard
CampaignCard
CareerMetric
RecommendationCard
EvidenceBadge
CareerTimeline
FitBreakdown
ActionQueue
ActivityTimeline
AgentSuggestion
CareerProgress
InterviewCard
AchievementCard
DocumentCard
ContextSwitcher
```

Every component must define:

- normal;
- loading;
- empty;
- error;
- compact where appropriate;
- responsive treatment;
- accessibility behaviour.

---

# 46. Responsive Product Architecture

Supported classes:

- desktop;
- tablet;
- mobile.

Mobile must not simply become a narrower desktop.

Mobile priority workflows:

1. Today;
2. Coach;
3. opportunity review;
4. application status;
5. interview preparation;
6. notifications;
7. quick career updates.

Complex document editing may use purpose-built mobile interaction patterns.

---

# 47. Interaction Principles

## Immediate orientation

Within approximately five seconds users should understand:

- where they are;
- why it matters;
- what to do next.

## Progressive disclosure

Advanced capability appears when relevant.

## Context preservation

Workflow transitions retain active context.

## Optimistic interaction

Safe changes should feel immediate.

## Explainability

Recommendations expose reasoning.

## Reversibility

AI-driven and destructive changes should be reversible where practical.

---

# 48. Empty-State Standard

Empty states explain the model.

Bad:

```text
No campaigns.
```

Preferred:

```text
Turn a career goal into a campaign.

Campaigns help CVBase coordinate opportunities,
applications, networking and interviews around
one career outcome.

[Create campaign]
```

Empty states are onboarding surfaces.

---

# 49. Onboarding

Canonical journey:

```text
Welcome
 ↓
What are you trying to achieve?
 ↓
Import career information
 ↓
Build Career Profile
 ↓
Confirm important facts
 ↓
Select goals
 ↓
Generate Career OS
 ↓
Today
```

Manual questions should be avoided when reliable information can already be imported or inferred.

---

# 50. Onboarding Success Moment

The onboarding experience should culminate in something comparable to:

```text
Your Career OS is ready.

CVBase found:

11 years of experience
7 major achievements
34 demonstrated skills
3 likely career directions
6 areas where stronger evidence would help

Based on your goal, here's what I recommend next.
```

The user should understand immediately that CVBase is operating on their broader career rather than merely generating a document.

---

# 51. Existing-User Migration

Existing users must retain:

- CVs;
- profiles;
- documents;
- application history;
- analytics;
- saved opportunities;
- preferences;
- account state;
- relevant activity/history.

Migration must not require complete onboarding again.

Suggested first-run experience:

```text
CVBase has evolved.

Everything you've already created is still here.

We've organised your existing information into
your new Career OS.

[Explore my Career OS]
```

---

# 52. Migration Invariant

A migrated user must never encounter a state where previously accessible material appears lost simply because its new Career OS projection has not finished processing.

Original production data remains authoritative throughout migration.

Derived Career OS views must tolerate partial migration.

---

# 53. Legacy Route Disposition

Every existing route must receive exactly one disposition:

```text
KEEP
MOVE
MERGE
REDIRECT
DEPRECATE
DELETE
```

Every entry must identify:

- existing route;
- current capability;
- Career OS destination;
- disposition;
- dependencies;
- redirect requirement;
- migration impact;
- deletion eligibility.

No orphan route may remain undocumented.

---

# 54. Analytics

Track meaningful career journeys.

Initial events include:

```text
career_goal_created
career_profile_completed

recommendation_opened
recommendation_accepted
recommendation_dismissed

opportunity_reviewed
opportunity_saved

campaign_created

application_started
application_ready

cv_tailored

interview_preparation_started

coach_action_executed

offer_recorded
campaign_completed
```

Avoid instrumenting every visual interaction simply because it can be measured.

---

# 55. Primary Product Metrics

Desired movement:

| Metric | Direction |
|---|---|
| Time to first meaningful action | Down |
| Onboarding completion | Up |
| Career profile completeness | Up |
| Users with active goals | Up |
| Users with active campaigns | Up |
| Opportunity → application conversion | Up |
| Application preparation completion | Up |
| Interview preparation usage | Up |
| Weekly returning users | Up |
| Cross-workflow completion | Up |
| Useful recommendation acceptance | Up |
| Navigation abandonment | Down |
| Duplicate CV creation | Down |
| User-reported confusion | Down |

Generated-document count is not a North Star metric.

---

# 56. Product North Star

The long-term North Star is:

> **Meaningful Career Progress**

Supporting evidence may include:

- stronger professional evidence;
- improved opportunity alignment;
- higher-quality applications;
- increased response;
- interviews;
- interview progression;
- offers;
- promotions;
- career transitions;
- compensation progression;
- goal completion.

CVBase should progressively become better at identifying whether a user's actions correlate with progress toward their chosen objective.

---

# 57. Recursive Planning Model

Implementation must be decomposed recursively.

No agent should receive a broad instruction such as:

> Implement Career OS.

Instead, work is recursively decomposed until each executable task has a bounded surface, known dependencies and measurable acceptance criteria.

## Level 0 — Product outcome

```text
CVBase behaves as one Career OS.
```

## Level 1 — Product spaces

```text
Shell
Today
Career
Opportunities
Campaigns
Applications
Coach
Library
Onboarding
Migration
Mobile
```

## Level 2 — User journeys

Example:

```text
Opportunities
    ├── Discover opportunity
    ├── Understand fit
    ├── Save
    ├── Ask Coach
    └── Start application
```

## Level 3 — Product surfaces

Example:

```text
Opportunity Detail
    ├── Opportunity information
    ├── Qualification fit
    ├── Career-direction fit
    ├── Evidence
    ├── Gap analysis
    └── Action bar
```

## Level 4 — Implementation units

Example:

```text
Fit Breakdown
    ├── locate existing match API
    ├── map match result
    ├── separate qualification/career fit
    ├── implement FitBreakdown
    ├── implement responsive behaviour
    └── instrument actions
```

## Level 5 — Verification

```text
Unit tests
Integration tests
Navigation tests
State tests
Accessibility tests
Responsive tests
Visual regression
Production-data fixture
```

A task must continue decomposing until an implementation agent can complete it without making product-level architectural assumptions.

---

# 58. Recursive Agent Loop

For every implementation unit, agents execute:

```text
1. DISCOVER
      ↓
2. MAP
      ↓
3. PLAN
      ↓
4. CHECK DEPENDENCIES
      ↓
5. IMPLEMENT
      ↓
6. VERIFY
      ↓
7. RECONCILE
      ↓
8. RECORD EVIDENCE
```

If verification exposes a higher-level design flaw:

```text
STOP
 ↓
return to parent planning level
 ↓
correct plan
 ↓
propagate dependency changes
 ↓
resume implementation
```

Agents must not patch around incorrect parent assumptions indefinitely.

---

# 59. Repository Discovery Gate

No Career OS implementation begins until the repository audit reaches sufficient coverage.

Produce:

`CURRENT_PRODUCT_MAP.md`

It must include at least:

- route inventory;
- screen inventory;
- capabilities;
- frontend components;
- design primitives;
- frontend state;
- APIs;
- domain models;
- AI capabilities;
- background jobs where relevant;
- integrations;
- analytics;
- duplicated experiences;
- legacy surfaces;
- test coverage.

Unknown areas must be marked `UNKNOWN`.

Agents must not silently treat unknown as absent.

---

# 60. Information Architecture Gate

Produce:

`CAREER_OS_INFORMATION_ARCHITECTURE.md`

It must map:

```text
Existing Capability
        ↓
Career OS Space
        ↓
Canonical Route
        ↓
Disposition
```

Every discovered route must be accounted for before legacy cleanup begins.

---

# 61. Domain Mapping Gate

Produce:

`CAREER_OS_DOMAIN_MAP.md`

For every canonical Career OS concept identify:

- existing model(s);
- existing API(s);
- existing frontend state;
- gaps;
- migration needs;
- canonical ownership.

This file determines whether new persistence is actually needed.

---

# 62. Context Mapping Gate

Produce:

`CAREER_OS_CONTEXT_MODEL.md`

Define:

- career context;
- goal context;
- campaign context;
- opportunity context;
- application context;
- document context;
- Coach context;
- navigation propagation rules;
- URL ownership where relevant;
- frontend-state ownership;
- persistence expectations.

This must be resolved before Application Workspace and Coach integration are considered complete.

---

# 63. Design-System Gate

Produce:

`DESIGN_SYSTEM.md`

and implementation equivalents.

The gate passes when:

- semantic tokens exist;
- common primitives exist;
- accessibility states exist;
- responsive rules exist;
- new Career OS surfaces can be created without page-local style foundations.

---

# 64. Implementation Workstreams

## WS-00 — Product Audit

Outputs:

- `CURRENT_PRODUCT_MAP.md`
- capability inventory
- route inventory
- duplication inventory

Dependencies:

None.

---

## WS-01 — Career OS Domain Mapping

Outputs:

- `CAREER_OS_DOMAIN_MAP.md`
- ownership model
- context relationships
- genuine-gap list

Dependencies:

WS-00.

---

## WS-02 — Information Architecture

Outputs:

- `CAREER_OS_INFORMATION_ARCHITECTURE.md`
- route disposition ledger
- migration plan

Dependencies:

WS-00, WS-01.

---

## WS-03 — Design System

Outputs:

- `DESIGN_SYSTEM.md`
- design tokens
- primitives
- Career OS components

Dependencies:

WS-00.

Can execute partially in parallel with WS-01/02 after discovery.

---

## WS-04 — Career OS Shell

Implement:

- primary navigation;
- mobile navigation;
- command surface;
- search entry point;
- notification surface;
- breadcrumbs/context where appropriate;
- responsive shell.

Dependencies:

WS-02, sufficient WS-03.

---

## WS-05 — Context Foundation

Implement or adapt:

- Career context;
- Goal context;
- Opportunity context;
- Campaign context;
- Application context;
- navigation propagation.

Dependencies:

WS-01.

Must precede deep workflow integration.

---

## WS-06 — Today

Implement:

- orientation;
- Action Queue;
- Career Pulse;
- Campaign summary;
- activity.

Dependencies:

WS-03, WS-04, action/recommendation mapping.

---

## WS-07 — Career

Recompose:

- overview;
- experience;
- achievements;
- evidence;
- skills;
- education;
- goals;
- profile.

Dependencies:

WS-01, WS-03, WS-04, WS-05.

---

## WS-08 — Opportunities

Unify:

- discovery;
- matching;
- saved state;
- opportunity intelligence;
- fit;
- strategic fit;
- opportunity detail.

Dependencies:

WS-03, WS-04, WS-05.

---

## WS-09 — Campaigns

Implement:

- campaign object projection;
- overview;
- progress;
- board;
- constraint insights;
- goal association.

Dependencies:

WS-01, WS-05, WS-07, relevant existing application tracking.

---

## WS-10 — Application Workspace

Unify:

- role analysis;
- CV;
- cover letter;
- questions;
- LinkedIn;
- networking;
- interview preparation;
- notes;
- activity.

Dependencies:

WS-05, WS-08, sufficient WS-03.

---

## WS-11 — Coach

Integrate existing conversational capability with:

- Career context;
- Goals;
- Campaigns;
- Opportunities;
- Applications;
- typed actions.

Dependencies:

WS-05, relevant destination workflows.

Coach may be visually migrated earlier, but action execution cannot qualify before destination workflows exist.

---

## WS-12 — Library

Consolidate:

- documents;
- generated assets;
- imported materials;
- associations;
- version history where supported.

Dependencies:

WS-02, WS-03.

---

## WS-13 — Onboarding

Implement Career OS onboarding using existing import/profile capabilities.

Dependencies:

Career model sufficiently stable.

---

## WS-14 — Existing-User Migration

Implement:

- Career OS projection;
- legacy preservation;
- first-run explanation;
- compatibility;
- redirects.

Dependencies:

WS-02 and target destinations.

---

## WS-15 — Mobile Product Treatment

Dedicated mobile optimization across all primary journeys.

Dependencies:

Individual workflows sufficiently mature.

---

## WS-16 — Accessibility & Performance

Continuous workstream with final qualification gate.

---

## WS-17 — Legacy Retirement

Remove superseded UI only after:

- replacement exists;
- migration exists;
- redirect exists;
- analytics indicate safe transition;
- rollback strategy is known.

---

# 65. Dependency Graph

Canonical implementation dependency:

```text
AUDIT
  ↓
DOMAIN MAP
  ↓
INFORMATION ARCHITECTURE
  ↓
┌───────────────────┐
│ DESIGN SYSTEM     │
│ CONTEXT FOUNDATION│
└───────────────────┘
  ↓
APPLICATION SHELL
  ↓
┌─────────┬─────────────┐
│ TODAY   │ CAREER      │
└─────────┴─────────────┘
            ↓
       OPPORTUNITIES
            ↓
        CAMPAIGNS
            ↓
     APPLICATION WORKSPACE
            ↓
           COACH
            ↓
          LIBRARY
            ↓
        ONBOARDING
            ↓
         MIGRATION
            ↓
         MOBILE
            ↓
 A11Y / PERFORMANCE / UX
            ↓
 PRODUCTION QUALIFICATION
            ↓
      LEGACY RETIREMENT
```

This graph may be parallelized where dependencies permit.

Dependency order must not be violated merely to maximize agent concurrency.

---

# 66. Implementation Phases

## Phase A — Foundations

- product audit;
- domain map;
- IA;
- design system;
- context foundation;
- application shell.

## Phase B — Career OS Core

- Today;
- Career;
- Goals.

## Phase C — Career Execution

- Opportunities;
- Campaigns.

## Phase D — Application Intelligence

- Application Workspace;
- Coach execution;
- interview workflow integration.

## Phase E — Product Completion

- Library;
- onboarding;
- existing-user migration;
- mobile.

## Phase F — Qualification and Cleanup

- accessibility;
- performance;
- analytics validation;
- visual regression;
- production qualification;
- legacy retirement.

---

# 67. Agent Task Contract

Every implementation task must specify:

```text
Task ID
Parent requirement
Purpose
Existing implementation discovered
Files/modules affected
Dependencies
Data ownership
API dependencies
UI states
Responsive requirement
Accessibility requirement
Analytics requirement
Tests
Acceptance criteria
Evidence required
Legacy impact
```

Tasks without sufficient discovery must not be marked implementation-ready.

---

# 68. New Subsystem Approval Rule

Before creating a new subsystem, the implementing agent must provide:

```text
Capability gap:
Existing alternatives inspected:
Why they are insufficient:
Proposed subsystem:
Consumers:
Persistent data introduced:
Operational complexity:
Migration requirement:
Testing strategy:
Long-term owner:
```

If this justification cannot be provided, the subsystem should not be created.

---

# 69. Anti-Drift Rules

Agents must not:

- build a second frontend;
- create a second Career database;
- create an unrelated AI memory layer;
- rebuild the CV engine;
- rebuild opportunity analysis unnecessarily;
- rebuild interview functionality unnecessarily;
- create duplicate application objects;
- introduce a competing design system;
- add unrelated product categories;
- turn the program into an architectural rewrite;
- treat mock data as production completion;
- add features solely to increase perceived scope.

When uncertain:

> preserve the functioning capability and improve orchestration.

---

# 70. Required UX States

Every important surface must explicitly support:

```text
First use
Populated
Loading
Partial data
Empty
Error
Offline/degraded where relevant
Permission denied
AI unavailable
Very large history/account
Mobile
```

A screen implemented only for its ideal populated state is incomplete.

---

# 71. Testing Matrix

Every migrated workflow requires appropriate coverage from the following layers.

## Functional

Underlying capability remains correct.

## Navigation

Destination and back-navigation behaviour are correct.

## Context

Career, goal, campaign, opportunity and application context survive required transitions.

## Migration

Existing user data remains accessible and semantically correct.

## Responsive

Desktop, tablet and mobile.

## Accessibility

Target:

**WCAG 2.2 AA**

## AI UX

Confirm:

- recommendations explain reasoning;
- unsupported facts are not silently created;
- new factual assertions request confirmation;
- Coach actions execute real workflows;
- correct context is used.

## Visual regression

Major surfaces and state variants.

## Performance

Critical journey timings and perceived responsiveness.

---

# 72. Screen Definition of Done

A screen is complete only when:

- canonical components are used;
- production-shaped data works;
- actions function;
- routing functions;
- context persists;
- loading exists;
- empty state exists;
- failure state exists;
- mobile treatment exists;
- keyboard interaction works;
- accessibility is verified;
- analytics exists where meaningful;
- critical behaviour is tested;
- legacy equivalent has a recorded disposition.

Matching a mock-up is insufficient.

---

# 73. Workflow Definition of Done

A workflow is complete only when:

- entry point works;
- state is available;
- every transition works;
- context survives transitions;
- partial state works;
- errors are recoverable;
- user can leave and return;
- Coach can reference it correctly where applicable;
- analytics describes meaningful progression;
- relevant legacy path is migrated.

---

# 74. Migration Definition of Done

Migration qualifies when:

- no expected user-owned data is lost;
- historical CVs remain accessible;
- applications remain accessible;
- saved opportunities remain accessible;
- existing account preferences survive;
- legacy deep links redirect correctly where applicable;
- partially migrated users remain functional;
- rollback is possible where required.

---

# 75. Performance Requirements

Career OS must feel immediate.

Architectural targets:

- shell renders independently of slower secondary content;
- navigation avoids unnecessary full-state reloads;
- large Career objects progressively render;
- AI work does not unnecessarily block navigation;
- expensive analysis may continue while the user browses;
- document preview updates incrementally where supported;
- skeletons represent actual eventual layout;
- duplicated requests are minimized;
- prefetching is used where evidence supports benefit.

Precise numerical budgets should be established from measured existing application baselines rather than invented in this document.

---

# 76. Accessibility Requirements

Accessibility belongs to the design foundation.

Required:

- keyboard navigation;
- clear focus states;
- semantic headings;
- labelled controls;
- accessible status changes;
- sufficient contrast;
- reduced-motion support;
- accessible dialogs;
- accessible charts;
- alternatives to drag-and-drop;
- screen-reader-compatible loading and agent states.

---

# 77. Production Evidence

Completion claims require evidence.

For significant implementation tasks, evidence should include applicable items such as:

- test identifier;
- screenshot or visual-regression result;
- route verification;
- migration fixture result;
- API integration result;
- accessibility result;
- production-like fixture;
- telemetry verification.

A task must not be declared complete because code exists.

---

# 78. Acceptance Ledger

Maintain:

`CAREER_OS_ACCEPTANCE_LEDGER.md`

Each major requirement should map:

```text
Requirement
→ Workstream
→ Task
→ Implementation
→ Test
→ Evidence
→ Status
```

Permitted completion states:

```text
NOT_STARTED
PLANNED
IN_PROGRESS
BLOCKED
IMPLEMENTED
VERIFIED
QUALIFIED
```

`IMPLEMENTED` is not equivalent to `QUALIFIED`.

---

# 79. Release Gates

## Gate 1 — Foundation

Pass when:

- product audit sufficiently covers repository;
- domain map exists;
- IA exists;
- design foundation exists;
- route strategy exists.

## Gate 2 — Career OS Shell

Pass when:

- new navigation functions;
- shell is responsive;
- Today can host real data;
- core context propagation exists.

## Gate 3 — Core Experience

Pass when:

- Today;
- Career;
- Goals;
- Opportunities

operate against real existing data.

## Gate 4 — Execution Experience

Pass when:

- Campaign;
- Application Workspace;
- Coach actions

form one continuous workflow.

## Gate 5 — Migration

Pass when existing-user fixtures migrate without data loss or material functional regression.

## Gate 6 — Experience Quality

Pass when:

- mobile;
- accessibility;
- performance;
- empty/error/loading states;
- visual consistency

meet acceptance criteria.

## Gate 7 — Production Qualification

Pass when the canonical end-to-end Career OS journey succeeds.

---

# 80. Canonical End-to-End Acceptance Journey

The final product must support:

```text
Open CVBase
 ↓
See what matters today
 ↓
Review recommended opportunity
 ↓
Understand why it fits
 ↓
Understand whether it advances career goal
 ↓
Start application
 ↓
Review tailored CV
 ↓
Confirm unsupported or missing evidence
 ↓
Complete application preparation
 ↓
Ask Coach about strategy
 ↓
Submit
 ↓
Track response
 ↓
Prepare interview
 ↓
Record outcome
 ↓
Update campaign
 ↓
Receive improved future recommendations
```

The user must not perceive these steps as unrelated tools.

---

# 81. Existing-User Acceptance Journey

A populated existing account must be included in production qualification.

Expected journey:

```text
Existing user logs in
 ↓
Career OS introduction appears
 ↓
Existing CVs remain available
 ↓
Existing profile appears in Career
 ↓
Existing applications appear correctly
 ↓
Existing saved opportunities remain available
 ↓
Today produces meaningful actions from existing state
 ↓
User enters an existing application
 ↓
Coach understands relevant context
```

No re-onboarding requirement.

---

# 82. New-User Acceptance Journey

```text
Create account
 ↓
Specify objective
 ↓
Import existing career information
 ↓
Review extracted professional facts
 ↓
Confirm evidence
 ↓
Create goal
 ↓
Career OS generated
 ↓
Today recommends useful action
 ↓
Opportunity discovered/reviewed
 ↓
Application started
```

The user must experience value before completing excessive manual configuration.

---

# 83. Qualitative Acceptance

The product should naturally evoke statements comparable to:

> CVBase knows my career.

> CVBase tells me what deserves attention.

> Everything for this application is in one place.

> I don't have to explain my background repeatedly.

> It understands what I'm trying to achieve.

Most importantly:

> I use CVBase even when I'm not writing a CV.

---

# 84. Target Product Experience

The product should ultimately be capable of presenting an experience comparable to:

```text
Good morning, Sarah.

You're making progress toward your VP Product goal.

TODAY

1. Prepare for tomorrow's Stripe interview

2. Review a new opportunity that strongly matches
   your target trajectory

3. Strengthen one achievement currently affecting
   four active applications


CAREER

Your market alignment improved this week.


CAMPAIGN

UK Product Leadership

12 applications
5 responses
3 interviews


COACH

"I noticed that your strongest interview outcomes
have come from marketplace businesses.

Would you like me to prioritise similar opportunities?"
```

This is not accomplished by adding more features.

It is accomplished by making existing and future capabilities behave as one system.

---

# 85. Final Implementation Authority

Implementation agents are authorized to:

- restructure information architecture;
- consolidate routes;
- introduce redirects;
- refactor frontend state;
- establish canonical Career OS contexts;
- build or consolidate design-system primitives;
- create Career OS components;
- implement Today;
- create the Campaign experience;
- create the unified Application Workspace;
- make Coach capable of executing real workflows;
- consolidate Library experiences;
- modernize responsive behaviour;
- improve accessibility;
- improve perceived performance;
- progressively retire superseded UI.

Agents are **not** authorized to replace proven underlying business logic solely for architectural consistency.

---

# 86. Final Program Rule

Every proposed change should answer:

### Does this make CVBase behave more like one coherent Career OS?

and:

### Can this be achieved by composing what CVBase already possesses?

If the first answer is **no**, the change is probably out of scope.

If the second answer is **yes**, unnecessary reinvention is prohibited.

---

# 87. Completion Threshold

The Career OS transformation is complete only when:

```text
one identity
one career context
one goal system
one opportunity context
one application context
one Coach
one recommendation/action language
one design system
one coherent product
```

are evident to both the implementation architecture and the user experience.

The target reaction from an existing CVBase user is:

> **“This used to help me create career documents. Now it understands and manages my career.”**

That is the threshold for CVBase Career OS.
