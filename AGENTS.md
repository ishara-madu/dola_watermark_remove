
<!-- END:nextjs-agent-rules -->

# Project Guidelines & Rules


## 2. Design System & UI Rules
- **No Sparkle Icons**: Do not use `Sparkles` or decorative sparkle icons anywhere in headings, badges, or sections.
- **No Background/Border Boxes Under Icons**: Do not wrap icons inside individual colored background boxes or bordered containers (e.g., avoid `w-10 h-10 bg-zinc-950 rounded-xl` icon wrappers). Render icons cleanly and directly inline with natural typography-aligned sizing and subtle colors (e.g., `w-5 h-5 text-zinc-900` or `text-zinc-500`).
- **Clean & Seamless Typography (No Card Boxing)**: Avoid segmenting content into small individual boxed cards with separate background colors, borders, and shadows (`bg-white border rounded-2xl shadow`). Keep layouts clean, seamless, and typography-driven with generous whitespace or subtle divider lines (`divide-y divide-zinc-200/80`).
- **Dark Container Sections (e.g., Quick Start Guide)**: When a dark container is used (`bg-zinc-950 text-white rounded-3xl p-8 sm:p-10`), do not add inner boxed sub-cards. Keep the interior clean with bold step numbers (`01`, `02`, `03` in `text-zinc-600`), headings in `text-white`, and description text in `text-zinc-400`.
- **Badges & Tags**: Keep badges, category tags, and status labels clean, text-based, and minimalist without heavy background boxes or thick borders.
- **FAQ Accordions & Lists**: Use clean single divider lines (`divide-y border-y`) rather than individual card boxes around each question.

