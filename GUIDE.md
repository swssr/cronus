# Cronus Guide (MVP)

## Modes
- Files: pick a file to explore
- Story: default in file view; shows first/last update, top authors, largest change
- Timeline: scrollable commit versions; select two commits to compare
- Commit: Smart Commit with Guided mode (Command Preview, Unstage All)

## How to compare file versions
1. Open a file from Files
2. In the timeline, click two commits to select them
3. The Compare view opens automatically with a side-by-side diff
4. Click "Clear compare" to exit

## Working area (experimental)
- Add a version to working area from a timeline card ("Add to working area")
- Saves can be exported under `.cronus/working/` (backend support ready)

## Simplifications (MVP)
- Analytics and Conflicts views are hidden in header to reduce noise
- File list uses neutral cards, sticky tabs, and compact spacing

## Tips (Guided)
- Use Guided toggle in Commit view to see command previews
- Use Unstage All to quickly reset the index without touching your changes

## Roadmap next
- Working Area drawer to collect snippets and commit on a virtual branch
- File relation graph with contextual actions (open story, diff, branch)
- Rename detection and churn heatmap in Story view
