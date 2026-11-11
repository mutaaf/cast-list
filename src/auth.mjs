// Who may post a drift report: the audit job's token, stored only as its sha-256 (DRIFT_TOKEN_HASH).
// The check is the shared one from stagehand (github.com/mutaaf/stagehand).
import { bearer } from 'stagehand';

export const driftCaller = async (req, env) => (env.DRIFT_TOKEN_HASH ? bearer(req, env.DRIFT_TOKEN_HASH) : null);
