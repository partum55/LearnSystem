# Rich Content Editor

## Implemented Now

The rich content direction is a Notion/Craft-like document canvas built around structured blocks, not a plain textarea workflow.

Core implementation lives in:

- `apps/web/src/features/rich-content/components/RichContentEditor.tsx`
- `apps/web/src/features/rich-content/components/RichContentRenderer.tsx`
- `apps/web/src/features/rich-content/markdown-parser.ts`
- `apps/web/src/features/rich-content/rich-content.types.ts`

## Content Blocks

Implemented now / active model:

- Paragraph
- Headings
- Lists
- Quote/callout-style content
- Code
- Mermaid
- Math/LaTeX
- Video
- File
- Table

Markdown paste converts content into structured rich content where supported. Rendering includes live rich preview behavior inside the editor and display views.

## Used In

Implemented now / active integration points:

- Rich text learning items.
- Lesson `TEXT` pages.
- Assignment instructions through `instructions_json`.
- Text submission answers through `content_json`.

Partially implemented / needs verification:

- Quiz essay/free-text usage should be verified with the current quiz/form implementation before being described as stable.

## Design Boundary

The active UX should avoid plain textarea/card editing for rich learning content. The editor should remain document-first, with block and style controls available around the canvas.
