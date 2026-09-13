"""
CashTrace — Feature Engineering (reconciled, leakage-safe)
=============================================================
This reconciles two independently-built feature engineering scripts:

  - graph_builder.py / the original feature_engineering.py (this repo):
    correct point-in-time graph snapshots via graph_as_of(), but a
    narrower feature set (basic graph + temporal features only).

  - A teammate's feature_engineering.py: richer features (fund-flow
    stats, temporal burstiness, geospatial spread, hop distance) and a
    good defensive merge-collision guard — but its fund-flow/temporal/
    geospatial aggregations run over ALL transactions/withdrawals
    regardless of filed_timestamp, which the script's own docstrings
    flag as unsafe for per-complaint model input.

The fix is structural, not a patch: the aggregation functions themselves
(build_fund_flow_features, build_temporal_features, build_geospatial_features)
are generic — they compute stats over whatever transactions/withdrawals
DataFrame they're given. The leak was entirely in HOW they were called
(the full table, unfiltered). Calling them with a cutoff-filtered slice
per complaint makes them leakage-safe with no change to their internals.

Output:
  features/account_features_full_history.csv   - descriptive only, NEVER use as ML input
  features/complaint_features_pointintime.csv   - leakage-safe, ML-ready
  features/complaint_ground_truth_targets.csv   - labels / post-event outcomes only
"""

from pathlib import Path

import networkx as nx
import numpy as np
import pandas as pd

from graph_builder import (
    build_transaction_graph,
    get_reachable_accounts,
    graph_as_of,
    load_data as load_raw_data,
)

DATA_DIR = "./data"
OUT_DIR = Path("features")
OUT_DIR.mkdir(exist_ok=True)


def assert_no_suffix_collision(df: pd.DataFrame, expected_cols: list, context: str) -> None:
    """
    Guards against pandas silently renaming colliding merge columns to
    `<col>_x` / `<col>_y` instead of erroring — which turns into a
    KeyError several scripts downstream instead of a clear message at
    the merge site. Call right after any merge where `expected_cols`
    must survive as single, unsuffixed columns.
    """
    missing = [c for c in expected_cols if c not in df.columns]
    if not missing:
        return
    suffixed_hints = {
        c: [sc for sc in (f"{c}_x", f"{c}_y") if sc in df.columns]
        for c in missing
    }
    details = "; ".join(
        f"'{c}' missing" + (f" (found suffixed as {hints} -- likely a duplicate-column "
                             f"merge collision)" if hints else "")
        for c, hints in suffixed_hints.items()
    )
    raise AssertionError(f"[{context}] {details}")


def load_data():
    data = load_raw_data(DATA_DIR)
    return (data["accounts"], data["transactions"], data["withdrawal_events"],
            data["complaints"], data["locations"])


# ---------------------------------------------------------------------------
# GENERIC AGGREGATIONS — leakage-safe ONLY if the caller scopes the input.
# These are otherwise unchanged from the richer teammate version.
# ---------------------------------------------------------------------------

def build_fund_flow_features(accounts: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:
    """Per-account money-movement features. Caller MUST pass only
    transactions known as of the relevant cutoff time to keep this
    leakage-safe — this function itself has no notion of time."""
    if len(transactions) == 0:
        flow = accounts[["account_id", "is_mule", "is_victim"]].copy()
        for col in ["total_out", "n_out", "mean_out", "max_out", "total_in", "n_in",
                    "mean_in", "max_in", "net_flow", "total_txn_count",
                    "passthrough_ratio", "in_degree", "out_degree", "degree_ratio"]:
            flow[col] = 0
        return flow

    out_agg = transactions.groupby("from_account")["amount"].agg(
        total_out="sum", n_out="count", mean_out="mean", max_out="max"
    )
    in_agg = transactions.groupby("to_account")["amount"].agg(
        total_in="sum", n_in="count", mean_in="mean", max_in="max"
    )

    flow = accounts[["account_id", "is_mule", "is_victim"]].set_index("account_id")
    flow = flow.join(out_agg).join(in_agg).fillna(0)

    flow["net_flow"] = flow["total_in"] - flow["total_out"]
    flow["total_txn_count"] = flow["n_in"] + flow["n_out"]
    flow["passthrough_ratio"] = np.where(
        flow["total_in"] > 0, flow["total_out"] / flow["total_in"], 0
    )

    G = nx.from_pandas_edgelist(
        transactions, "from_account", "to_account", edge_attr="amount", create_using=nx.DiGraph
    )
    flow["in_degree"] = flow.index.map(lambda n: G.in_degree(n) if n in G else 0)
    flow["out_degree"] = flow.index.map(lambda n: G.out_degree(n) if n in G else 0)
    flow["degree_ratio"] = np.where(
        flow["in_degree"] > 0, flow["out_degree"] / flow["in_degree"], 0
    )

    return flow.reset_index()


def build_temporal_features(accounts: pd.DataFrame, transactions: pd.DataFrame,
                             now_ref=None) -> pd.DataFrame:
    """Timing-pattern features per account. `now_ref` defaults to the max
    timestamp in the passed-in transactions — for point-in-time use, pass
    the complaint's cutoff explicitly so 'hours_since_last_txn' means
    'as of when the complaint was filed', not 'as of the end of the
    dataset'."""
    if len(transactions) == 0:
        return accounts[["account_id"]].assign(
            account_age_days=np.nan, out_active_span_hours=np.nan,
            out_hours_since_last_txn=np.nan, out_n=0,
            in_active_span_hours=np.nan, in_hours_since_last_txn=np.nan,
            in_n=0, out_txn_burstiness=np.nan,
        )

    if now_ref is None:
        now_ref = transactions["timestamp"].max()

    def per_account_time_stats(df, acct_col):
        g = df.groupby(acct_col)["timestamp"]
        stats = g.agg(first_txn="min", last_txn="max", n="count")
        stats["active_span_hours"] = (stats["last_txn"] - stats["first_txn"]).dt.total_seconds() / 3600
        stats["hours_since_last_txn"] = (now_ref - stats["last_txn"]).dt.total_seconds() / 3600
        return stats[["active_span_hours", "hours_since_last_txn", "n"]]

    out_time = per_account_time_stats(transactions, "from_account").add_prefix("out_")
    in_time = per_account_time_stats(transactions, "to_account").add_prefix("in_")

    temporal = accounts[["account_id", "opened_date"]].set_index("account_id")
    temporal["account_age_days"] = (now_ref - temporal["opened_date"]).dt.total_seconds() / 86400
    temporal = temporal.join(out_time).join(in_time)

    def burstiness(df, acct_col):
        result = {}
        for acct, g in df.sort_values("timestamp").groupby(acct_col):
            gaps = g["timestamp"].diff().dt.total_seconds().dropna()
            if len(gaps) >= 2 and gaps.mean() > 0:
                result[acct] = gaps.std() / gaps.mean()
            else:
                result[acct] = np.nan
        return pd.Series(result, name="out_txn_burstiness")

    temporal = temporal.join(burstiness(transactions, "from_account"))
    return temporal.reset_index()


def haversine(lat1, lon1, lat2, lon2):
    """Great-circle distance in km between two lat/lon points (vectorized)."""
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


def build_geospatial_features(withdrawals: pd.DataFrame, locations: pd.DataFrame) -> pd.DataFrame:
    """Per-account withdrawal-location features: spread, diversity,
    home-base distance. Caller MUST pass only withdrawals known as of the
    cutoff — for a complaint's victim account, this describes the
    victim's own PAST (legitimate) withdrawal behavior, which is safe;
    it never includes the fraud cash-out itself since that hasn't
    happened yet at filing time for predictive cases."""
    if len(withdrawals) == 0:
        return pd.DataFrame(columns=[
            "account_id", "n_withdrawals", "n_unique_locations",
            "n_unique_cities", "avg_dist_from_home_km",
            "max_dist_from_home_km", "n_atm_type",
        ])

    w = withdrawals.merge(locations, on="location_id", how="left")

    def per_account_geo(g):
        home_lat, home_lon = g["latitude"].mean(), g["longitude"].mean()
        dists = haversine(g["latitude"], g["longitude"], home_lat, home_lon)
        return pd.Series({
            "n_withdrawals": len(g),
            "n_unique_locations": g["location_id"].nunique(),
            "n_unique_cities": g["city"].nunique(),
            "avg_dist_from_home_km": dists.mean(),
            "max_dist_from_home_km": dists.max(),
            "n_atm_type": (g["type"] == "ATM").sum(),
        })

    geo = w.groupby("account_id").apply(per_account_geo, include_groups=False).reset_index()
    return geo


# ---------------------------------------------------------------------------
# POINT-IN-TIME WRAPPER — this is the actual leakage fix.
# ---------------------------------------------------------------------------

def point_in_time_features_for_complaint(complaint_row, accounts_indexed, txn_by_from,
                                          txn_by_to, wd_by_account, graph, max_hops=6):
    """
    Builds every feature for one complaint using ONLY data known as of
    complaint_row['filed_timestamp']. Computes the victim's own stats
    directly (not via the generic multi-account aggregation functions
    above, which are correct but O(all accounts) per call — calling
    those once per complaint does needless repeated work; this does the
    equivalent computation scoped to just the one account that matters
    for this complaint).

    accounts_indexed, txn_by_from, txn_by_to, wd_by_account are
    pre-grouped lookups — see build_complaint_feature_matrix for setup.
    """
    cutoff = complaint_row["filed_timestamp"]
    victim = complaint_row["victim_account"]
    first_txn = complaint_row["first_transaction_timestamp"]

    subgraph = graph_as_of(graph, cutoff)
    candidates = get_reachable_accounts(subgraph, victim, max_hops=max_hops)

    out_txn = txn_by_from.get(victim)
    out_txn = out_txn[out_txn["timestamp"] <= cutoff] if out_txn is not None else None
    in_txn = txn_by_to.get(victim)
    in_txn = in_txn[in_txn["timestamp"] <= cutoff] if in_txn is not None else None

    total_out = out_txn["amount"].sum() if out_txn is not None and len(out_txn) else 0.0
    n_out = len(out_txn) if out_txn is not None else 0
    total_in = in_txn["amount"].sum() if in_txn is not None and len(in_txn) else 0.0
    n_in = len(in_txn) if in_txn is not None else 0
    passthrough_ratio = (total_out / total_in) if total_in > 0 else 0.0

    burstiness = np.nan
    if out_txn is not None and len(out_txn) >= 3:
        gaps = out_txn.sort_values("timestamp")["timestamp"].diff().dt.total_seconds().dropna()
        if gaps.mean() > 0:
            burstiness = gaps.std() / gaps.mean()

    all_txn_times = []
    if out_txn is not None and len(out_txn):
        all_txn_times.append(out_txn["timestamp"])
    if in_txn is not None and len(in_txn):
        all_txn_times.append(in_txn["timestamp"])
    if all_txn_times:
        combined = pd.concat(all_txn_times)
        active_span_hours = (combined.max() - combined.min()).total_seconds() / 3600
        hours_since_last_txn = (cutoff - combined.max()).total_seconds() / 3600
    else:
        active_span_hours, hours_since_last_txn = 0.0, np.nan

    opened_date = accounts_indexed.at[victim, "opened_date"] if victim in accounts_indexed.index else pd.NaT
    account_age_days = (cutoff - opened_date).total_seconds() / 86400 if pd.notna(opened_date) else np.nan

    wd = wd_by_account.get(victim)
    wd = wd[wd["timestamp"] <= cutoff] if wd is not None else None
    if wd is not None and len(wd):
        n_withdrawals = len(wd)
        n_unique_locations = wd["location_id"].nunique()
        n_unique_cities = wd["city"].nunique()
        home_lat, home_lon = wd["latitude"].mean(), wd["longitude"].mean()
        dists = haversine(wd["latitude"], wd["longitude"], home_lat, home_lon)
        avg_dist_from_home_km = dists.mean()
    else:
        n_withdrawals, n_unique_locations, n_unique_cities, avg_dist_from_home_km = 0, 0, 0, np.nan

    reporting_delay_hours = (cutoff - first_txn).total_seconds() / 3600.0

    return {
        "complaint_id": complaint_row["complaint_id"],
        "reported_amount": complaint_row["reported_amount"],
        "log_reported_amount": float(np.log1p(complaint_row["reported_amount"])),
        "hour_of_day": first_txn.hour,
        "day_of_week": first_txn.dayofweek,
        "is_weekend": int(first_txn.dayofweek >= 5),
        "reporting_delay_hours": reporting_delay_hours,
        "num_candidate_accounts": len(candidates),
        "state": complaint_row["state"],
        "victim_flow_total_out": total_out,
        "victim_flow_n_out": n_out,
        "victim_flow_total_in": total_in,
        "victim_flow_n_in": n_in,
        "victim_flow_passthrough_ratio": passthrough_ratio,
        "victim_temporal_account_age_days": account_age_days,
        "victim_temporal_active_span_hours": active_span_hours,
        "victim_temporal_hours_since_last_txn": hours_since_last_txn,
        "victim_temporal_out_txn_burstiness": burstiness,
        "victim_geo_n_withdrawals": n_withdrawals,
        "victim_geo_n_unique_locations": n_unique_locations,
        "victim_geo_n_unique_cities": n_unique_cities,
        "victim_geo_avg_dist_from_home_km": avg_dist_from_home_km,
    }


def build_complaint_feature_matrix(complaints_df, accounts, transactions,
                                    withdrawals, locations, graph, max_hops=6):
    """Pre-groups lookups ONCE, then computes features per complaint —
    avoids the O(complaints x all_accounts) blowup of calling the
    whole-table aggregation functions inside the loop."""
    accounts_indexed = accounts.set_index("account_id")
    txn_by_from = {acct: g for acct, g in transactions.groupby("from_account")}
    txn_by_to = {acct: g for acct, g in transactions.groupby("to_account")}
    wd_with_locations = withdrawals.merge(locations, on="location_id", how="left")
    wd_by_account = {acct: g for acct, g in wd_with_locations.groupby("account_id")}

    rows = [
        point_in_time_features_for_complaint(
            row, accounts_indexed, txn_by_from, txn_by_to, wd_by_account, graph, max_hops
        )
        for _, row in complaints_df.iterrows()
    ]
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# GROUND TRUTH TARGETS — post-event labels ONLY. Never join these into
# model input features.
# ---------------------------------------------------------------------------

def build_ground_truth_targets(complaints, accounts, transactions, withdrawals, locations):
    """
    true_cashout_account is the actual thing the fund-flow model predicts
    (evaluated via top-k / rank-of-true-account — see evaluation.py — not
    as a simple classification label). victim_to_cashout_hops and the
    cashout lat/lon/city are computed using the FULL, final transaction
    graph — legitimate for evaluation/analysis since the case has already
    resolved by the time you're scoring it, but never legitimate as a
    model input feature.
    """
    w = withdrawals.merge(locations, on="location_id", how="left")
    targets = complaints.merge(
        w[["event_id", "timestamp", "latitude", "longitude", "city"]],
        left_on="true_withdrawal_event", right_on="event_id", how="left",
    ).rename(columns={
        "timestamp": "withdrawal_timestamp", "latitude": "cashout_lat",
        "longitude": "cashout_lon", "city": "cashout_city",
    })
    targets["hours_to_withdrawal"] = (
        targets["withdrawal_timestamp"] - targets["filed_timestamp"]
    ).dt.total_seconds() / 3600

    full_graph = nx.from_pandas_edgelist(
        transactions, "from_account", "to_account", create_using=nx.DiGraph
    )

    def get_hops(row):
        v, c = row["victim_account"], row["true_cashout_account"]
        if pd.isna(v) or pd.isna(c):
            return -1
        try:
            return nx.shortest_path_length(full_graph, source=v, target=c)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return -1

    targets["victim_to_cashout_hops"] = targets.apply(get_hops, axis=1)

    result = targets[[
        "complaint_id", "is_predictive_case", "victim_account",
        "true_cashout_account", "true_withdrawal_event",
        "hours_to_withdrawal", "cashout_lat", "cashout_lon", "cashout_city",
        "victim_to_cashout_hops",
    ]]

    assert_no_suffix_collision(
        result, expected_cols=["is_predictive_case", "true_cashout_account"],
        context="build_ground_truth_targets merge",
    )
    return result


def build_account_features_full_history(accounts, transactions, withdrawals, locations):
    """Descriptive, whole-dataset account features — useful for EDA/dashboards.
    NEVER use as ML model input; every row here is aggregated over the
    ENTIRE dataset, including events that happen after any given complaint."""
    fund_flow = build_fund_flow_features(accounts, transactions)
    temporal = build_temporal_features(accounts, transactions)
    geo = build_geospatial_features(withdrawals, locations)
    return fund_flow.merge(temporal, on="account_id", how="left").merge(
        geo, on="account_id", how="left"
    )


if __name__ == "__main__":
    from time_split import time_based_split

    accounts, transactions, withdrawals, complaints, locations = load_data()
    graph = build_transaction_graph({
        "accounts": accounts, "transactions": transactions,
    })

    print("Building full-history account features (descriptive only)...")
    account_features = build_account_features_full_history(
        accounts, transactions, withdrawals, locations
    )
    account_features.to_csv(OUT_DIR / "account_features_full_history.csv", index=False)
    print(f"  -> {len(account_features)} accounts")

    print("\nBuilding point-in-time (leakage-safe) complaint features...")
    predictive = complaints[complaints["is_predictive_case"]]
    complaint_features = build_complaint_feature_matrix(
        predictive, accounts, transactions, withdrawals, locations, graph
    )
    complaint_features.to_csv(OUT_DIR / "complaint_features_pointintime.csv", index=False)
    print(f"  -> {complaint_features.shape[0]} complaints, {complaint_features.shape[1]} features")

    print("\nBuilding ground truth targets (labels only, never model input)...")
    targets = build_ground_truth_targets(complaints, accounts, transactions, withdrawals, locations)
    targets.to_csv(OUT_DIR / "complaint_ground_truth_targets.csv", index=False)
    print(f"  -> {len(targets)} rows")

    print("\nColumns in ML-ready complaint_features_pointintime.csv:")
    print(list(complaint_features.columns))