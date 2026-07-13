---
inclusion: always
source: https://github.com/anthropics/skills/tree/main/skills/frontend-design
---

# Frontend Design

> Adapted from Anthropic's `frontend-design` skill (https://github.com/anthropics/skills). Original © Anthropic, provided under the terms in that repository's LICENSE. This steering file applies the skill's guidance to design/build work in this repository.

Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Approach every design as the design lead at a small studio known for giving each client a visual identity that could not be mistaken for anyone else's. Make deliberate, opinionated choices about palette, typography, and layout that are specific to the brief, and take one real aesthetic risk you can justify.

## Ground it in the subject
If the brief doesn't pin down what the product/subject is, pin it yourself before designing: name one concrete subject, its audience, and the page's single job. Use any known context/preferences as hints. Distinctive choices come from the subject's own world — its materials, instruments, artifacts, and vernacular. Build with the brief's real content throughout.

## Design principles
- **The hero is a thesis.** Open with the most characteristic thing in the subject's world (headline, image, animation, live demo, interactive moment). Avoid the template answer (big number + small label + supporting stats + gradient accent) unless it's genuinely best.
- **Typography carries personality.** Pair display and body faces deliberately — not your default families. Set a clear type scale with intentional weights, widths, and spacing. Make the type treatment itself memorable.
- **Structure is information.** Structural devices (numbering, eyebrows, dividers, labels) should encode something true about the content, not decorate it. Only use numbered markers (01/02/03) if the content really is a sequence.
- **Leverage motion deliberately.** Consider where animation serves the subject (page-load sequence, scroll reveal, hover micro-interactions, ambient atmosphere). An orchestrated moment usually beats scattered effects. Sometimes less is more — excess animation reads as AI-generated.
- **Match complexity to the vision.** Maximalist directions need elaborate execution; minimal directions need precision in spacing, type, and detail. Elegance is executing the chosen vision well.
- **Consider written content carefully.** Generic copy makes a design feel as templated as generic visuals. See "Writing in design" below.

## Process: brainstorm, explore, plan, critique, build, critique again
AI-generated design currently clusters around three defaults — avoid spending free design axes on them unless the brief explicitly asks:
1. Warm cream background (~#F4F1EA) + high-contrast serif display + terracotta accent.
2. Near-black background + a single bright acid-green or vermilion accent.
3. Broadsheet layout with hairline rules, zero border-radius, dense newspaper columns.
Where the brief pins a direction, follow it exactly (the brief's words win). Where it leaves an axis free, don't default.

Work in two passes:
1. **Plan** a compact token system from the brief — **Color:** 4–6 named hex values. **Type:** typefaces for 2+ roles (a characterful display face used with restraint, a complementary body face, a utility face for captions/data if needed). **Layout:** a layout concept described in one-sentence prose + ASCII wireframes to compare. **Signature:** the single unique element the page will be remembered by.
2. **Critique the plan against the brief** before building. If any part reads like the generic default you'd produce for any similar page, revise it and say what changed and why. Only then write code, following the revised plan and deriving every color/type decision from it.

When writing CSS, watch selector specificity — type-based (.section) and element-based (.cta) selectors can cancel each other out, especially for section paddings/margins. Do most planning/iteration in your head; only show ideas once you're confident they'll delight.

## Restraint and self-critique
Spend your boldness in one place: let the signature element be the one memorable thing and keep everything around it quiet and disciplined; cut decoration that doesn't serve the brief. Not taking a risk is itself a risk. Build to a quality floor without announcing it: responsive down to mobile, visible keyboard focus, reduced motion respected. Critique your own work as you build (screenshots if available). Chanel's rule: before leaving the house, remove one accessory. Keep notes on what you've tried to inform future passes.

## Writing in design
Words exist to make a design easier to understand and use — they're design material, not decoration.
- Write from the end user's side of the screen. Name things by what people control and recognize, not by how the system is built (a person manages "notifications," not "webhook config"). Be specific over clever.
- Use active voice; a control says exactly what happens ("Save changes," not "Submit"). Keep an action's name consistent through the whole flow ("Publish" → toast "Published"). Consistent vocabulary is how people learn the product.
- Treat failures and empty states as direction, not mood. Errors explain what went wrong and how to fix it, in the interface's voice; they don't apologize or stay vague. An empty screen is an invitation to act.
- Keep the register conversational and tuned: plain verbs, sentence case, no filler, tone matched to brand and audience. Each element does exactly one job.
