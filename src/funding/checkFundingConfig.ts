import { env } from "../config/env.js";

/**
 * CLAUDE.md step 7 (Tracxn/Crunchbase structured funding ingestion) is
 * explicitly conditional: "only if a paid API key is actually
 * provisioned; otherwise skip, rely on India news RSS for funding
 * signal." Neither provider has a key in this deployment's env, so step
 * 7 is not built — no Tracxn/Crunchbase client, no stubbed dead code
 * path waiting for a key that doesn't exist. This just logs that choice
 * once per run so it's visible, not silent.
 *
 * If a key does get provisioned later, this is the one place that
 * needs to change: build the actual Tracxn/Crunchbase ingester (see
 * src/config/sources.ts's "crunchbase-funding-rounds" /
 * "tracxn-transactions" entries for the endpoints/auth already
 * researched) and flip those entries' `status` from "out-of-scope" to
 * "active", then wire it into the run summary the same way steps 2/3
 * are.
 */
export function logFundingStatusOnce(): void {
  if (env.tracxnApiKey || env.crunchbaseApiKey) {
    console.log(
      "[funding] A Tracxn/Crunchbase API key is set, but step 7 ingestion isn't built yet — " +
        "see the comment in src/funding/checkFundingConfig.ts for what to do next. Funding " +
        "signal still comes from India news RSS (step 2) for this run.",
    );
    return;
  }
  console.log(
    "[funding] No Tracxn/Crunchbase API key provisioned — step 7 is skipped by design. " +
      "Funding signal relies on India news RSS (YourStory/ET Tech/Mint/Business Standard, step 2).",
  );
}
