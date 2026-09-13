"""
CashTrace — Feature Engineering
================================
Builds features across four categories for fraud/cashout prediction:
  1. Fund flow features    (per-account transaction graph stats)
  2. Temporal features     (timing patterns)
  3. Geospatial features   (withdrawal location patterns)
  4. Prediction targets    (labels for modeling)

Input : data/accounts.csv, data/transactions.csv, data/withdrawal_events.csv,
        data/complaints.csv, data/locations.csv
Output: features/account_features.csv, features/complaint_features.csv
        features/complaint_features_inference_clean.csv
        features/complaint_ground_truth_targets.csv

NOTE on leakage: the victim_* fund-flow columns in complaint_features are
aggregated over ALL transactions regardless of filed_timestamp, so they are
NOT safe as ML-1 model input (see fix below, and see
split_and_leakage_check.py for the point-in-time replacement).
"""

import pandas as pd
import numpy as np
import networkx as nx
from pathlib import Path

DATA_DIR = Path("data")
OUT_DIR = Path("features")
OUT_DIR.mkdir(exist_ok=True)


def load_data():
    accounts = pd.read_csv(DATA_DIR / "accounts.csv", parse_dates=["opened_date"])
    transactions = pd.read_csv(DATA_DIR / "transactions.csv", parse_dates=["timestamp"])
    withdrawals = pd.read_csv(DATA_DIR / "withdrawal_events.csv", parse_dates=["timestamp"])
    complaints = pd.read_csv(
        DATA_DIR / "complaints.csv",
        parse_dates=["first_transaction_timestamp", "filed_timestamp"],
    )
    locations = pd.read_csv(DATA_DIR / "locations.csv")
    return accounts, transactions, withdrawals, complaints, locations


# ---------------------------------------------------------------------------
# 1. FUND FLOW FEATURES
# ---------------------------------------------------------------------------
def build_fund_flow_features(accounts: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:
    """Per-account money-movement features, including graph-based hop distance.
    NOTE: this aggregates over ALL transactions (not point-in-time) -- fine for
    the standalone account_features.csv table, but NOT safe to use directly as
    ML-1 input per-complaint. See point_in_time_fund_flow() in
    split_and_leakage_check.py for the leakage-safe version."""

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

    flow = flow.reset_index()
    return flow


def hops_to_cashout(transactions: pd.DataFrame, victim_account: str, cashout_account: str) -> int:
    """Shortest number of transaction hops from victim account to cashout account."""
    G = nx.from_pandas_edgelist(
        transactions, "from_account", "to_account", create_using=nx.DiGraph
    )
    try:
        return nx.shortest_path_length(G, source=victim_account, target=cashout_account)
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return -1


# ---------------------------------------------------------------------------
# 2. TEMPORAL FEATURES
# ---------------------------------------------------------------------------
def build_temporal_features(accounts: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:
    """Timing-pattern features per account: activity spread, burstiness, recency."""

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
    temporal = temporal.reset_index()
    return temporal


def build_complaint_timing_features(complaints: pd.DataFrame, withdrawals: pd.DataFrame) -> pd.DataFrame:
    """Reproduces + extends the hours_to_withdrawal analysis from the EDA, per complaint."""
    c = complaints.copy()
    c = c.merge(
        withdrawals[["event_id", "timestamp"]],
        left_on="true_withdrawal_event",
        right_on="event_id",
        how="left",
    ).rename(columns={"timestamp": "withdrawal_timestamp"})

    c["hours_first_txn_to_filed"] = (
        c["filed_timestamp"] - c["first_transaction_timestamp"]
    ).dt.total_seconds() / 3600
    c["hours_to_withdrawal"] = (
        c["withdrawal_timestamp"] - c["filed_timestamp"]
    ).dt.total_seconds() / 3600
    c["filed_hour_of_day"] = c["filed_timestamp"].dt.hour
    c["filed_day_of_week"] = c["filed_timestamp"].dt.dayofweek

    return c[
        [
            "complaint_id",
            "is_predictive_case",
            "hours_first_txn_to_filed",
            "hours_to_withdrawal",
            "filed_hour_of_day",
            "filed_day_of_week",
        ]
    ]


# ---------------------------------------------------------------------------
# 3. GEOSPATIAL FEATURES
# ---------------------------------------------------------------------------
def haversine(lat1, lon1, lat2, lon2):
    """Great-circle distance in km between two lat/lon points (vectorized)."""
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


def build_geospatial_features(withdrawals: pd.DataFrame, locations: pd.DataFrame) -> pd.DataFrame:
    """Per-account withdrawal-location features: spread, diversity, home-base distance."""

    w = withdrawals.merge(locations, on="location_id", how="left")

    def per_account_geo(g):
        home_lat, home_lon = g["latitude"].mean(), g["longitude"].mean()
        dists = haversine(g["latitude"], g["longitude"], home_lat, home_lon)
        return pd.Series(
            {
                "n_withdrawals": len(g),
                "n_unique_locations": g["location_id"].nunique(),
                "n_unique_cities": g["city"].nunique(),
                "avg_dist_from_home_km": dists.mean(),
                "max_dist_from_home_km": dists.max(),
                "n_atm_type": (g["type"] == "ATM").sum(),
            }
        )

    geo = w.groupby("account_id").apply(per_account_geo).reset_index()
    return geo


def cashout_distance_from_victim(
    complaints: pd.DataFrame, accounts: pd.DataFrame, withdrawals: pd.DataFrame, locations: pd.DataFrame
) -> pd.DataFrame:
    """Distance between where the cashout happened and where the victim account 'normally' operates."""
    w = withdrawals.merge(locations, on="location_id", how="left")
    c = complaints.merge(
        w[["event_id", "latitude", "longitude", "city"]],
        left_on="true_withdrawal_event",
        right_on="event_id",
        how="left",
    ).rename(columns={"latitude": "cashout_lat", "longitude": "cashout_lon", "city": "cashout_city"})
    return c[["complaint_id", "cashout_lat", "cashout_lon", "cashout_city"]]


# ---------------------------------------------------------------------------
# 4. PREDICTION TARGETS
# ---------------------------------------------------------------------------
def build_targets(complaints: pd.DataFrame) -> pd.DataFrame:
    """
    Two modeling targets:
      - classification target: is_predictive_case (already labeled)
      - regression target: hours_to_withdrawal (time budget to intervene)

    NOTE: true_cashout_account is included here because it's needed downstream
    for joins/analysis, but it is a POST-EVENT OUTCOME (the answer ML-1/ML-2
    are trying to predict) and must be excluded from model input features --
    see the leakage_cols handling in main().
    """
    t = complaints[["complaint_id", "is_predictive_case", "victim_account", "true_cashout_account"]].copy()
    return t


# ---------------------------------------------------------------------------
# COMPLAINT-LEVEL HOP DISTANCE
# ---------------------------------------------------------------------------
def compute_all_hops(complaints: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:
    """Calculates graph hop distances for each complaint using hops_to_cashout."""
    G = nx.from_pandas_edgelist(
        transactions, "from_account", "to_account", create_using=nx.DiGraph
    )

    def get_hops(row):
        v = row.get("victim_account")
        c = row.get("true_cashout_account")
        if pd.isna(v) or pd.isna(c):
            return -1
        try:
            return nx.shortest_path_length(G, source=v, target=c)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return -1

    hops_df = complaints[["complaint_id", "victim_account", "true_cashout_account"]].copy()
    hops_df["victim_to_cashout_hops"] = hops_df.apply(get_hops, axis=1)
    return hops_df[["complaint_id", "victim_to_cashout_hops"]]


# ---------------------------------------------------------------------------
# MAIN PIPELINE
# ---------------------------------------------------------------------------
def main():
    accounts, transactions, withdrawals, complaints, locations = load_data()

    print("Building fund flow features...")
    fund_flow = build_fund_flow_features(accounts, transactions)

    print("Building temporal features...")
    temporal = build_temporal_features(accounts, transactions)
    complaint_timing = build_complaint_timing_features(complaints, withdrawals)

    print("Building geospatial features...")
    geo = build_geospatial_features(withdrawals, locations)
    cashout_geo = cashout_distance_from_victim(complaints, accounts, withdrawals, locations)

    print("Building prediction targets...")
    targets = build_targets(complaints)

    # --- Assemble account-level feature table (descriptive; fine as-is) ---
    account_features = (
        fund_flow.merge(temporal, on="account_id", how="left")
        .merge(geo, on="account_id", how="left")
    )

    # --- Assemble complaint-level feature table (full, includes leaky columns for now) ---
    complaint_features = (
        targets.merge(complaint_timing, on="complaint_id", how="left")
        .merge(cashout_geo, on="complaint_id", how="left")
        .merge(
            fund_flow.add_prefix("victim_"),
            left_on="victim_account",
            right_on="victim_account_id",
            how="left",
        )
    )

    account_out = OUT_DIR / "account_features.csv"
    complaint_out = OUT_DIR / "complaint_features.csv"
    account_features.to_csv(account_out, index=False)
    complaint_features.to_csv(complaint_out, index=False)

    print(f"\nSaved {len(account_features)} account rows -> {account_out}")
    print(f"Saved {len(complaint_features)} complaint rows -> {complaint_out}")
    print(f"\nAccount feature columns:\n{list(account_features.columns)}")
    print(f"\nComplaint feature columns:\n{list(complaint_features.columns)}")

    # -----------------------------------------------------------------------
    # HOPS FEATURE + LEAKAGE-FREE INFERENCE / TARGETS SPLIT
    # -----------------------------------------------------------------------
    print("\nRunning additions (hops calculation & clean feature-target split)...")
    hops_data = compute_all_hops(complaints, transactions)
    complaint_features_extended = complaint_features.merge(hops_data, on="complaint_id", how="left")

    # Columns that must NEVER be used as ML-1/ML-2 model input, because they are only
    # knowable after the fraud has resolved:
    #   - true_cashout_account: the literal answer being predicted
    #   - hours_to_withdrawal / cashout_lat / cashout_lon / cashout_city: depend on the
    #     withdrawal event, which hasn't happened yet at prediction time
    #   - victim_to_cashout_hops: computed FROM true_cashout_account, so it's leakage too
    leakage_cols = [
        "true_cashout_account",
        "hours_to_withdrawal",
        "cashout_lat",
        "cashout_lon",
        "cashout_city",
        "victim_to_cashout_hops",
    ]
    target_cols = ["complaint_id", "is_predictive_case"] + leakage_cols

    # The victim_* fund-flow columns merged in above are aggregated over ALL transactions
    # (see build_fund_flow_features docstring) -- not point-in-time, so also not safe as
    # ML-1 input. Drop them here; use point_in_time_fund_flow_features.csv from
    # split_and_leakage_check.py for the leakage-safe replacement instead.
    leaky_fundflow_cols = [
        c for c in complaint_features_extended.columns
        if c.startswith("victim_") and c != "victim_account"
    ]

    drop_cols = leakage_cols + leaky_fundflow_cols
    clean_features = complaint_features_extended.drop(
        columns=[c for c in drop_cols if c in complaint_features_extended.columns]
    )
    ground_truth_targets = complaint_features_extended[
        [c for c in target_cols if c in complaint_features_extended.columns]
    ]

    clean_features_out = OUT_DIR / "complaint_features_inference_clean.csv"
    targets_out = OUT_DIR / "complaint_ground_truth_targets.csv"

    clean_features.to_csv(clean_features_out, index=False)
    ground_truth_targets.to_csv(targets_out, index=False)

    print(f"Saved clean inference features ({clean_features.shape[1]} cols) -> {clean_features_out}")
    print(f"Saved ground truth targets/post-event labels ({ground_truth_targets.shape[1]} cols) -> {targets_out}")
    print(
        "\nReminder: join point_in_time_fund_flow_features.csv "
        "(from split_and_leakage_check.py) onto complaint_features_inference_clean.csv "
        "before training ML-1 -- that's where the leakage-safe fund-flow features live."
    )


if __name__ == "__main__":
    main()