"""
CashTrace — Train/Val/Test Split + Leakage Checking (ML-3)
=============================================================
Splits complaints chronologically (train = earliest, test = latest) to
mirror real deployment: the model only ever sees the past when scoring
a new complaint. Also computes point-in-time fund-flow features (lifetime
+ rolling windows) so ML-1's risk score can't see the future.

IMPORTANT — case selection:
Only complaints with is_predictive_case == True are used. The False cases
(80 of 500) are complaints filed AFTER the cash-out already happened, so
there is nothing left to predict for the future-withdrawal task; including
them would dilute training signal and corrupt evaluation (see project
notes, section 18/30). is_predictive_case is dataset metadata used for
case selection ONLY — it is not a model input and not a model target.

Input : data/accounts.csv, data/transactions.csv, data/complaints.csv,
        data/withdrawal_events.csv, data/locations.csv
        features/complaint_features.csv                  (optional, from feature_engineering.py)
        features/complaint_features_inference_clean.csv  (optional, from feature_engineering.py)
Output: splits/train.csv, splits/val.csv, splits/test.csv
        splits/point_in_time_fund_flow_features.csv
        splits/leakage_report.txt
"""

import pandas as pd
import numpy as np
from pathlib import Path

DATA_DIR = Path("data")
FEATURES_DIR = Path("features")
OUT_DIR = Path("splits")
OUT_DIR.mkdir(exist_ok=True)

TRAIN_FRAC = 0.70
VAL_FRAC = 0.15
# TEST_FRAC = 0.15 (remainder)

ROLLING_WINDOWS_HOURS = (24, 72, 168)  # 1 day, 3 days, 1 week
SPLIT_SKEW_TOLERANCE = 0.10            # warn if actual split deviates >10pp from target
TIE_CONCENTRATION_WARN_FRAC = 0.05     # warn if one timestamp value covers >5% of complaints

# ML-1's real target (true_cashout_account, evaluated via top-k / rank-of-true-account —
# see project notes section 38) is not yet wired into a numeric/binary label that the
# correlation/MI checks below can consume. Until that label exists, target-leakage
# checks are skipped rather than silently run against a placeholder. Do NOT set this to
# "is_predictive_case" -- that column is case-selection metadata, not a model target,
# and after filtering (below) it has zero variance anyway.
TARGET_COL = None  # e.g. set to a derived per-candidate binary label once ML-1 defines one


def load_data():
    accounts = pd.read_csv(DATA_DIR / "accounts.csv", parse_dates=["opened_date"])
    transactions = pd.read_csv(DATA_DIR / "transactions.csv", parse_dates=["timestamp"])
    withdrawals = pd.read_csv(DATA_DIR / "withdrawal_events.csv", parse_dates=["timestamp"])
    complaints = pd.read_csv(
        DATA_DIR / "complaints.csv",
        parse_dates=["first_transaction_timestamp", "filed_timestamp"],
    )
    return accounts, transactions, withdrawals, complaints


def filter_predictive_cases(complaints: pd.DataFrame) -> pd.DataFrame:
    """Keep only is_predictive_case == True rows. This is case selection, not
    feature engineering -- the column itself must never be used as a model
    input or target downstream."""
    before = len(complaints)
    out = complaints[complaints["is_predictive_case"]].copy()
    after = len(out)
    print(f"  Filtered to predictive cases: {after}/{before} complaints "
          f"({before - after} non-predictive cases excluded).")
    return out


# ---------------------------------------------------------------------------
# 1. CHRONOLOGICAL SPLIT (boundary-safe, with skew reporting)
# ---------------------------------------------------------------------------
def temporal_split(complaints: pd.DataFrame):
    """
    Cut chronologically on filed_timestamp VALUE (quantile cutoffs), not on
    row position, so ties at a cutoff land entirely on one side rather than
    splitting across train/val.

    NOTE: caller is responsible for passing in already-filtered
    (is_predictive_case == True) complaints -- see filter_predictive_cases().

    Known trade-off: if timestamps are coarse (e.g. truncated to day-level)
    and a large tie group sits at the cutoff, the actual split proportions
    can skew noticeably away from 70/15/15 -- the whole tie group goes to
    whichever side the quantile lands on. This is reported explicitly by
    check_split_proportions() and check_timestamp_tie_concentration() below
    rather than silently accepted; if it fires, the fix is upstream (finer
    timestamp resolution) or a documented acceptance of the skew, not a
    code change here -- forcing ties apart to hit exact proportions would
    mean training on same-instant complaints while testing on others,
    which is its own (weaker) leakage risk.
    """
    c = complaints.sort_values("filed_timestamp").reset_index(drop=True)

    train_cutoff = c["filed_timestamp"].quantile(TRAIN_FRAC)
    val_cutoff = c["filed_timestamp"].quantile(TRAIN_FRAC + VAL_FRAC)

    train = c[c["filed_timestamp"] <= train_cutoff].copy()
    val = c[(c["filed_timestamp"] > train_cutoff) & (c["filed_timestamp"] <= val_cutoff)].copy()
    test = c[c["filed_timestamp"] > val_cutoff].copy()

    train["split"] = "train"
    val["split"] = "val"
    test["split"] = "test"

    return train, val, test


def check_split_proportions(train, val, test) -> list[str]:
    """Reports actual vs. target split sizes and flags meaningful skew."""
    total = len(train) + len(val) + len(test)
    if total == 0:
        return ["SKIP: no complaints to split."]
    actual = {"train": len(train) / total, "val": len(val) / total, "test": len(test) / total}
    target = {"train": TRAIN_FRAC, "val": VAL_FRAC, "test": 1 - TRAIN_FRAC - VAL_FRAC}

    msgs = [
        f"INFO: actual split -> train {actual['train']:.1%} ({len(train)}), "
        f"val {actual['val']:.1%} ({len(val)}), test {actual['test']:.1%} ({len(test)}); "
        f"target 70/15/15."
    ]
    max_dev = max(abs(actual[k] - target[k]) for k in actual)
    if max_dev > SPLIT_SKEW_TOLERANCE:
        msgs.append(
            f"WARN: split proportions deviate {max_dev:.1%} from target (>{SPLIT_SKEW_TOLERANCE:.0%} "
            f"tolerance). Likely cause: a large tie group of identical filed_timestamp values sits "
            f"at a cutoff -- see timestamp tie-concentration check below."
        )
    return msgs


def check_timestamp_tie_concentration(complaints: pd.DataFrame) -> list[str]:
    """Flags whether filed_timestamp looks coarsely bucketed (e.g. day-truncated),
    which is the usual root cause of split-proportion skew."""
    counts = complaints["filed_timestamp"].value_counts()
    total = len(complaints)
    max_count = counts.max()
    msgs = [
        f"INFO: largest single filed_timestamp tie group = {max_count} complaints "
        f"({max_count / total:.1%} of all complaints)."
    ]
    if max_count / total > TIE_CONCENTRATION_WARN_FRAC:
        msgs.append(
            f"WARN: one timestamp value covers >{TIE_CONCENTRATION_WARN_FRAC:.0%} of complaints -- "
            f"check whether filed_timestamp is truncated (e.g. to day-level) rather than exact. "
            f"Coarse timestamps concentrate ties at split boundaries and skew proportions."
        )
    return msgs


# ---------------------------------------------------------------------------
# 2. POINT-IN-TIME FEATURES: lifetime totals + rolling windows
# ---------------------------------------------------------------------------
def build_point_in_time_features(
    complaints: pd.DataFrame, transactions: pd.DataFrame, windows_hours=ROLLING_WINDOWS_HOURS
) -> pd.DataFrame:
    """
    Per-complaint fund-flow features using ONLY transactions strictly before
    that complaint's filed_timestamp, computed via pd.merge_asof (vectorized,
    not a per-row full-table scan).

    NOTE: caller is responsible for passing in already-filtered
    (is_predictive_case == True) complaints -- see filter_predictive_cases().
    Non-predictive cases have nothing to predict, so there's no reason to
    compute point-in-time features for them.

    Includes both:
      - Lifetime totals (pit_total_out/in, pit_n_out/in, pit_net_flow, passthrough)
      - Rolling windows (pit_out_{W}h / pit_in_{W}h for W in windows_hours), i.e.
        volume moved in the W hours immediately before filing. In fraud systems
        a sudden burst right before filing is often more predictive than the
        lifetime total, which a long-lived normal account can dwarf.

    Scope note (still open): this covers flat fund-flow aggregates only.
    Graph-based metrics (degree, hop distance, centrality) are computed
    elsewhere WITHOUT a point-in-time cutoff -- if ML-1 ends up relying on
    graph position, those need the same treatment (rebuild the DiGraph from
    only pre-filing edges per complaint), which is a heavier follow-up.
    """
    out = transactions[["from_account", "timestamp", "amount"]].rename(columns={"from_account": "account_id"})
    out = out.sort_values(["account_id", "timestamp"])
    out["cum_out"] = out.groupby("account_id")["amount"].cumsum()
    out["cum_n_out"] = out.groupby("account_id").cumcount() + 1
    out = out.sort_values("timestamp")

    inc = transactions[["to_account", "timestamp", "amount"]].rename(columns={"to_account": "account_id"})
    inc = inc.sort_values(["account_id", "timestamp"])
    inc["cum_in"] = inc.groupby("account_id")["amount"].cumsum()
    inc["cum_n_in"] = inc.groupby("account_id").cumcount() + 1
    inc = inc.sort_values("timestamp")

    base = complaints[["complaint_id", "victim_account", "filed_timestamp"]].rename(
        columns={"victim_account": "account_id", "filed_timestamp": "timestamp"}
    )

    def asof_cum(ts_frame: pd.DataFrame) -> pd.DataFrame:
        m = pd.merge_asof(
            ts_frame.sort_values("timestamp"), out[["account_id", "timestamp", "cum_out", "cum_n_out"]],
            on="timestamp", by="account_id", direction="backward", allow_exact_matches=False,
        )
        m = pd.merge_asof(
            m.sort_values("timestamp"), inc[["account_id", "timestamp", "cum_in", "cum_n_in"]],
            on="timestamp", by="account_id", direction="backward", allow_exact_matches=False,
        )
        m[["cum_out", "cum_n_out", "cum_in", "cum_n_in"]] = m[
            ["cum_out", "cum_n_out", "cum_in", "cum_n_in"]
        ].fillna(0)
        return m

    lifetime = asof_cum(base.copy())

    result = pd.DataFrame({"complaint_id": lifetime["complaint_id"].values})
    result["pit_total_out"] = lifetime["cum_out"].values
    result["pit_total_in"] = lifetime["cum_in"].values
    result["pit_net_flow"] = result["pit_total_in"] - result["pit_total_out"]
    result["pit_n_out"] = lifetime["cum_n_out"].values
    result["pit_n_in"] = lifetime["cum_n_in"].values
    result["pit_passthrough_ratio"] = np.where(
        result["pit_total_in"] > 0, result["pit_total_out"] / result["pit_total_in"], 0.0
    )

    for w in windows_hours:
        shifted = base.copy()
        shifted["timestamp"] = shifted["timestamp"] - pd.Timedelta(hours=w)
        baseline = asof_cum(shifted)
        result[f"pit_out_{w}h"] = lifetime["cum_out"].values - baseline["cum_out"].values
        result[f"pit_in_{w}h"] = lifetime["cum_in"].values - baseline["cum_in"].values
        result[f"pit_n_out_{w}h"] = lifetime["cum_n_out"].values - baseline["cum_n_out"].values
        result[f"pit_n_in_{w}h"] = lifetime["cum_n_in"].values - baseline["cum_n_in"].values

    # Sanity check: a rolling window is a difference of two cumulative sums taken
    # further apart in time, so it should never be negative. A negative value here
    # would indicate a merge_asof boundary bug, not a real data pattern.
    window_cols = [c for c in result.columns if c.startswith("pit_") and c.endswith("h")]
    negative = (result[window_cols] < -1e-6).any(axis=None)
    if negative:
        bad_cols = [c for c in window_cols if (result[c] < -1e-6).any()]
        raise ValueError(
            f"Point-in-time rolling window features went negative in columns {bad_cols} -- "
            f"this indicates a merge_asof boundary bug, not real data. Investigate before proceeding."
        )

    return result


# ---------------------------------------------------------------------------
# 3. LEAKAGE CHECKS
# ---------------------------------------------------------------------------
def check_temporal_ordering(train, val, test) -> list[str]:
    issues = []
    if len(train) and len(val) and train["filed_timestamp"].max() > val["filed_timestamp"].min():
        issues.append("FAIL: train contains complaints filed AFTER the earliest val complaint.")
    if len(val) and len(test) and val["filed_timestamp"].max() > test["filed_timestamp"].min():
        issues.append("FAIL: val contains complaints filed AFTER the earliest test complaint.")
    if not issues:
        issues.append("PASS: train/val/test are strictly chronologically ordered.")
    return issues


def check_duplicate_ids(train, val, test) -> list[str]:
    ids = pd.concat([train["complaint_id"], val["complaint_id"], test["complaint_id"]])
    dupes = ids[ids.duplicated()]
    if len(dupes) > 0:
        return [f"FAIL: {len(dupes)} complaint_id(s) appear in multiple splits: {dupes.tolist()}"]
    return ["PASS: no complaint_id appears in more than one split."]


def check_account_overlap(train, val, test) -> list[str]:
    def acct_set(df):
        return set(df["victim_account"]) | set(df["true_cashout_account"])

    train_accts, val_accts, test_accts = acct_set(train), acct_set(val), acct_set(test)
    tv_overlap = train_accts & val_accts
    tt_overlap = train_accts & test_accts

    msgs = [
        f"INFO: {len(tv_overlap)} accounts overlap between train and val "
        f"({len(tv_overlap) / max(len(val_accts), 1):.1%} of val accounts).",
        f"INFO: {len(tt_overlap)} accounts overlap between train and test "
        f"({len(tt_overlap) / max(len(test_accts), 1):.1%} of test accounts).",
    ]
    if len(tt_overlap) / max(len(test_accts), 1) > 0.3:
        msgs.append(
            "WARN: >30% of test accounts also appear in train — evaluate whether this "
            "reflects real repeat-mule behavior or an artifact of the synthetic data. "
            "(Not treated as a hard FAIL: repeat mule accounts across time are plausible "
            "real-world behavior, not necessarily a data leak.)"
        )
    return msgs


def check_predictive_case_filter(complaints_raw: pd.DataFrame, train, val, test) -> list[str]:
    """Confirms non-predictive cases were actually excluded from every split."""
    msgs = []
    combined = pd.concat([train, val, test])
    if "is_predictive_case" not in combined.columns:
        return ["SKIP: is_predictive_case column not present in split output."]
    n_non_predictive = (~combined["is_predictive_case"]).sum()
    n_total_non_predictive = (~complaints_raw["is_predictive_case"]).sum()
    if n_non_predictive > 0:
        msgs.append(
            f"FAIL: {n_non_predictive} non-predictive complaints leaked into train/val/test "
            f"(out of {n_total_non_predictive} in the raw data)."
        )
    else:
        msgs.append(
            f"PASS: all non-predictive complaints ({n_total_non_predictive}) excluded from splits."
        )
    return msgs


def check_target_leakage(features: pd.DataFrame, target_col: str, threshold: float = 0.9) -> list[str]:
    """Linear/monotonic-ish leakage via Pearson correlation. Run against the FULL
    candidate feature table so it has real leakage to find (see check_target_leakage_nonlinear
    for the complementary non-linear check -- Pearson alone will miss non-monotonic leaks)."""
    numeric = features.select_dtypes(include=[np.number]).copy()
    if target_col not in numeric.columns:
        return [f"SKIP: target column '{target_col}' not numeric or not present."]

    corrs = numeric.corr()[target_col].drop(target_col).abs().sort_values(ascending=False)
    suspicious = corrs[corrs > threshold]
    if len(suspicious) > 0:
        return [
            f"WARN: feature '{f}' has |Pearson r|={v:.3f} with target — check for leakage."
            for f, v in suspicious.items()
        ]
    return [f"PASS: no feature exceeds |Pearson r|={threshold} with '{target_col}' in this table."]


def check_target_leakage_nonlinear(
    features: pd.DataFrame, target_col: str, mi_threshold: float = 0.3
) -> list[str]:
    """
    Mutual-information scan, to catch leakage Pearson correlation would miss:
    Pearson only detects linear/monotonic relationships. A feature that's a
    near-perfect but NON-monotonic function of the target (categorical ID
    encodings, modulo transforms, bucketed/threshold splits a tree could
    exploit) can sit at |r| well under 0.9 while still being fully
    predictive. Mutual information captures dependency regardless of shape.

    Requires scikit-learn (sklearn.feature_selection.mutual_info_classif).
    Threshold is on normalized MI (MI / target entropy in nats), roughly
    "what fraction of the target's uncertainty does this feature resolve" --
    unlike Pearson's r this isn't a standard fixed convention, so treat
    mi_threshold as a tunable trigger for manual review, not a hard verdict.
    """
    try:
        from sklearn.feature_selection import mutual_info_classif
    except ImportError:
        return ["SKIP: scikit-learn not installed -- non-linear leakage check unavailable (pip install scikit-learn)."]

    numeric = features.select_dtypes(include=[np.number]).copy()
    if target_col not in numeric.columns:
        return [f"SKIP: target column '{target_col}' not numeric or not present."]

    y = numeric[target_col].astype(int)
    X = numeric.drop(columns=[target_col]).fillna(0)
    if X.shape[1] == 0 or y.nunique() < 2:
        return ["SKIP: not enough feature columns or target variation for MI scan."]

    mi = mutual_info_classif(X, y, discrete_features="auto", random_state=0)
    # normalize by target entropy so the score is roughly comparable across datasets
    p = y.value_counts(normalize=True).values
    target_entropy = -(p * np.log(p)).sum()
    normalized_mi = mi / target_entropy if target_entropy > 0 else mi

    mi_series = pd.Series(normalized_mi, index=X.columns).sort_values(ascending=False)
    suspicious = mi_series[mi_series > mi_threshold]
    if len(suspicious) > 0:
        return [
            f"WARN: feature '{f}' has normalized MI={v:.3f} with target (non-linear signal, "
            f"may not show up in Pearson correlation) — check for leakage."
            for f, v in suspicious.items()
        ]
    return [f"PASS: no feature exceeds normalized MI={mi_threshold} with '{target_col}' in this table."]


def check_post_event_columns(df: pd.DataFrame) -> list[str]:
    forbidden = ["true_cashout_account", "true_withdrawal_event"]
    present = [c for c in forbidden if c in df.columns]
    if present:
        return [
            f"WARN: columns {present} are post-event outcomes. Fine as targets/joins for "
            f"labeling, but must be dropped before training ML-1's risk-scoring features."
        ]
    return ["PASS: no raw post-event outcome columns found in this feature table."]


def run_all_checks(
    train, val, test, complaints_predictive, complaints_raw,
    full_feature_table=None, clean_feature_table=None, target_col=None,
) -> str:
    report_lines = ["CashTrace — Leakage Report", "=" * 40, ""]

    report_lines.append("[1] Temporal ordering")
    report_lines += check_temporal_ordering(train, val, test)
    report_lines.append("")

    report_lines.append("[2] Duplicate complaint IDs across splits")
    report_lines += check_duplicate_ids(train, val, test)
    report_lines.append("")

    report_lines.append("[3] Account overlap across splits")
    report_lines += check_account_overlap(train, val, test)
    report_lines.append("")

    report_lines.append("[4] Post-event column check")
    report_lines += check_post_event_columns(train)
    report_lines.append("")

    report_lines.append("[5] Split proportion / timestamp tie-concentration check")
    report_lines += check_split_proportions(train, val, test)
    report_lines += check_timestamp_tie_concentration(complaints_predictive)
    report_lines.append("")

    report_lines.append("[6] Non-predictive case exclusion check")
    report_lines += check_predictive_case_filter(complaints_raw, train, val, test)
    report_lines.append("")

    if target_col is None:
        report_lines.append("[7] Target leakage scan (Pearson + mutual information)")
        report_lines.append(
            "SKIP: no TARGET_COL configured. ML-1's real target (true_cashout_account, "
            "evaluated via top-k / rank-of-true-account) is not a numeric/binary column "
            "yet, so a correlation/MI scan can't run against it. Do NOT substitute "
            "is_predictive_case here -- it is case-selection metadata (and after filtering "
            "to predictive cases it has zero variance), not a model target. Re-enable this "
            "section once ML-1 defines a concrete numeric/binary label to check."
        )
        report_lines.append("")
    else:
        if full_feature_table is not None:
            report_lines.append(f"[7a] Linear correlation — FULL candidate table (target: {target_col})")
            report_lines += check_target_leakage(full_feature_table, target_col)
            report_lines.append("")

            report_lines.append(f"[7b] Non-linear (mutual information) scan — FULL candidate table")
            report_lines += check_target_leakage_nonlinear(full_feature_table, target_col)
            report_lines.append("")

        if clean_feature_table is not None:
            report_lines.append(f"[7c] Linear correlation — CLEAN inference table (target: {target_col})")
            report_lines += check_target_leakage(clean_feature_table, target_col)
            report_lines.append("")

            report_lines.append(f"[7d] Non-linear (mutual information) scan — CLEAN inference table")
            report_lines += check_target_leakage_nonlinear(clean_feature_table, target_col)
            report_lines.append("")

    return "\n".join(report_lines)


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    accounts, transactions, withdrawals, complaints_raw = load_data()

    print("Filtering to predictive cases (is_predictive_case == True)...")
    complaints = filter_predictive_cases(complaints_raw)

    print("\nSplitting complaints chronologically (value-based cutoffs, tie-safe)...")
    train, val, test = temporal_split(complaints)
    print(f"  train: {len(train)}  ({train['filed_timestamp'].min()} -> {train['filed_timestamp'].max()})")
    print(f"  val:   {len(val)}  ({val['filed_timestamp'].min()} -> {val['filed_timestamp'].max()})")
    print(f"  test:  {len(test)}  ({test['filed_timestamp'].min()} -> {test['filed_timestamp'].max()})")

    print("\nBuilding point-in-time fund-flow features (lifetime + rolling windows)...")
    pit_features = build_point_in_time_features(complaints, transactions)

    full_path = FEATURES_DIR / "complaint_features.csv"
    clean_path = FEATURES_DIR / "complaint_features_inference_clean.csv"

    full_table = None
    clean_table = None
    if full_path.exists():
        full_table = pd.read_csv(full_path)
        full_table["is_predictive_case"] = full_table["is_predictive_case"].astype(int)
        # Match the case selection applied to complaints/splits above.
        full_table = full_table[full_table["is_predictive_case"] == 1].copy()
    else:
        print(f"  (skipping full-table leakage scan -- {full_path} not found; run feature_engineering.py first)")

    if clean_path.exists():
        clean_table = pd.read_csv(clean_path)
        clean_table["is_predictive_case"] = clean_table["is_predictive_case"].astype(int)
        clean_table = clean_table[clean_table["is_predictive_case"] == 1].copy()
        clean_table = clean_table.merge(pit_features, on="complaint_id", how="left")
    else:
        print(f"  (skipping clean-table leakage scan -- {clean_path} not found; run feature_engineering.py first)")

    print("Running leakage checks...")
    report = run_all_checks(
        train, val, test, complaints, complaints_raw,
        full_feature_table=full_table,
        clean_feature_table=clean_table,
        target_col=TARGET_COL,
    )
    print("\n" + report)

    train.to_csv(OUT_DIR / "train.csv", index=False)
    val.to_csv(OUT_DIR / "val.csv", index=False)
    test.to_csv(OUT_DIR / "test.csv", index=False)
    pit_features.to_csv(OUT_DIR / "point_in_time_fund_flow_features.csv", index=False)
    (OUT_DIR / "leakage_report.txt").write_text(report)

    print(f"\nSaved splits + leakage_report.txt -> {OUT_DIR}/")


if __name__ == "__main__":
    main()