from sqlalchemy.ext.asyncio import AsyncSession

# These are no-ops for MVP. Wire your real scrapers/predictors later.
async def run_liquipedia_ingest(db: AsyncSession):
    # TODO: scrape schedule & rosters, upsert Teams/Players/Matches
    return

async def run_build_features(db: AsyncSession):
    # TODO: compute features from historical stats
    return

async def run_model_predict(db: AsyncSession):
    # TODO: run Bayesian model, write to predictions table
    return

async def run_publish_lines(db: AsyncSession):
    # TODO: read predictions, create/adjust lines
    return

async def run_vlr_ingest(db: AsyncSession):
    # TODO: scrape finals / stats and attach results
    return
