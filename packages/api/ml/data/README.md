# ML Data Directory (Excluded from Git)

Large historical and training CSV datasets live here locally but are ignored in version control.

## Rationale
- Avoids bloating the repository and hitting GitHub file size limits.
- Encourages reproducible data acquisition pipelines instead of storing raw bulk data.

## Suggested Workflow
1. Obtain datasets via internal script or documented pipeline.
2. Place raw files under this directory (`./packages/api/ml/data`).
3. Generate derived / feature-engineered artifacts under a sibling path (e.g. `ml/models/`).
4. Commit only lightweight metadata or schema descriptions.

## Not Tracked
- Raw match logs
- Training matrices
- Large CSV exports (> a few MB)

## Do Track (if needed)
- Small sample slices for tests (put them in a `samples/` subfolder and explicitly whitelist if required).
- Schema documentation or data dictionaries.

## Reproducing Data
Add a script (e.g. `scripts/fetch_ml_data.ts` or Python equivalent) that:
- Downloads or regenerates the required CSVs.
- Verifies file integrity (hash / row counts).

> Keep data operations deterministic where possible for reliable model rebuilds.
