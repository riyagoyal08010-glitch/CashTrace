"""
Synthetic dataset generator for SIH26184 — CashTrace.

Generates five linked CSVs that emulate the real-world data a cybercrime
predictive-analytics system would work with, since real NCRP/bank data
isn't publicly available:

    accounts.csv          - every account (victim, mule, background/legit)
    transactions.csv       - fund transfers between accounts (the graph)
    complaints.csv          - filed cybercrime complaints, tied to a victim account
    locations.csv           - ATM/branch withdrawal points (geo-tagged)
    withdrawal_events.csv   - ground truth: account withdrew X amount at
                              location Y at time Z (fraud-linked or background)

Usage:
    python generate_synthetic_data.py --n-complaints 500 --seed 42

Output is written to ./data/ by default.
"""

import argparse
import os
import random
import uuid
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from faker import Faker

fake = Faker("en_IN")

# ---- Reference data ----------------------------------------------------

CITIES = {
    "Delhi": (28.6139, 77.2090),
    "Mumbai": (19.0760, 72.8777),
    "Bengaluru": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Kolkata": (22.5726, 88.3639),
    "Hyderabad": (17.3850, 78.4867),
    "Pune": (18.5204, 73.8567),
    "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462),
    "Ahmedabad": (23.0225, 72.5714),
}

BANKS = [
    "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank",
    "Punjab National Bank", "Bank of Baroda", "Kotak Mahindra Bank",
    "Canara Bank", "Union Bank of India", "IndusInd Bank",
]

LOCATION_TYPES = ["ATM", "Bank Branch"]


def jitter_coords(lat, lon, km_radius=15):
    """Randomly offset a lat/lon within roughly km_radius kilometers."""
    deg_radius = km_radius / 111.0  # approx km per degree
    dlat = random.uniform(-deg_radius, deg_radius)
    dlon = random.uniform(-deg_radius, deg_radius)
    return round(lat + dlat, 6), round(lon + dlon, 6)


def random_timestamp(start, end):
    delta = end - start
    seconds = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=seconds)


# ---- Generators ----------------------------------------------------------

def generate_locations(n_locations, seed=None):
    rng = random.Random(seed)
    rows = []
    for _ in range(n_locations):
        city, (lat, lon) = rng.choice(list(CITIES.items()))
        j_lat, j_lon = jitter_coords(lat, lon)
        rows.append({
            "location_id": f"LOC-{uuid.uuid4().hex[:8]}",
            "name": f"{rng.choice(BANKS)} {rng.choice(LOCATION_TYPES)} - {city}",
            "type": rng.choice(LOCATION_TYPES),
            "city": city,
            "latitude": j_lat,
            "longitude": j_lon,
        })
    return pd.DataFrame(rows)


def generate_accounts(n_accounts):
    rows = []
    for _ in range(n_accounts):
        rows.append({
            "account_id": f"ACC-{uuid.uuid4().hex[:10]}",
            "holder_name": fake.name(),
            "bank": random.choice(BANKS),
            "opened_date": fake.date_between(start_date="-5y", end_date="-30d"),
            "is_mule": False,      # updated later for accounts used in fraud chains
            "is_victim": False,
        })
    return pd.DataFrame(rows)


def generate_rings(locations_df, n_rings=12, min_cluster=3, max_cluster=7,
                    seed=None):
    """
    Simulate mule-network 'cash-out rings': each ring operates out of a
    small, geographically tight cluster of locations within one city,
    and is reused across multiple fraud cases. This gives the geo-time
    model a real clustering signal to learn instead of pure noise, since
    real fraud rings tend to reuse the same withdrawal points repeatedly.
    """
    rng = random.Random(seed)
    rings = []
    for i in range(n_rings):
        city = rng.choice(list(CITIES.keys()))
        city_locations = locations_df[locations_df["city"] == city]
        if len(city_locations) < min_cluster:
            continue
        cluster_size = min(len(city_locations),
                            rng.randint(min_cluster, max_cluster))
        cluster = city_locations.sample(cluster_size, random_state=seed + i if seed else None)
        rings.append({
            "ring_id": f"RING-{i:03d}",
            "city": city,
            "location_ids": cluster["location_id"].tolist(),
        })
    return rings


def build_fraud_chain(victim_account, ring, hop_timestamps, withdrawal_timestamp,
                       off_pattern_rate=0.1):
    """
    Simulate one fraud case's money movement given pre-computed timestamps:
    hop_timestamps[i] is when the i-th transfer happens (hop_timestamps[0]
    is the victim's initial transfer), and withdrawal_timestamp is when the
    final cash-out occurs. Timing is decided by the caller so that reporting
    delay and cash-out lead time can be controlled independently of how many
    hops the chain has. Returns the new mule account rows, the transaction
    rows, and the final withdrawal event.
    """
    mule_accounts = []
    transactions = []

    current_account = victim_account
    amount = round(random.uniform(15000, 500000), 2)

    for hop_time in hop_timestamps:
        next_account_id = f"ACC-{uuid.uuid4().hex[:10]}"
        mule_accounts.append({
            "account_id": next_account_id,
            "holder_name": fake.name(),
            "bank": random.choice(BANKS),
            "opened_date": fake.date_between(start_date="-2y", end_date="-1d"),
            "is_mule": True,
            "is_victim": False,
        })

        amount = round(amount * random.uniform(0.85, 0.98), 2)  # fee per hop

        transactions.append({
            "transaction_id": f"TXN-{uuid.uuid4().hex[:10]}",
            "from_account": current_account,
            "to_account": next_account_id,
            "amount": amount,
            "timestamp": hop_time,
        })

        current_account = next_account_id

    if ring is not None and random.random() > off_pattern_rate:
        location_id = random.choice(ring["location_ids"])
    else:
        location_id = None  # filled in by caller when no ring / off-pattern

    withdrawal_event = {
        "event_id": f"WD-{uuid.uuid4().hex[:10]}",
        "account_id": current_account,
        "location_id": location_id,
        "amount": amount,
        "timestamp": withdrawal_timestamp,
        "is_fraud_linked": True,
        "ring_id": ring["ring_id"] if ring is not None else None,
    }

    return mule_accounts, transactions, withdrawal_event


def distribute_hop_timestamps(fraud_start, end_time, chain_length):
    """
    Return `chain_length` strictly increasing timestamps starting at
    fraud_start (the victim's initial transfer) and ending before end_time
    (the target withdrawal time). Used for predictive cases, where the
    total chain duration is derived from complaint-filing + lead-time
    rather than independent per-hop random delays.
    """
    if chain_length == 1:
        return [fraud_start]
    total_seconds = (end_time - fraud_start).total_seconds()
    fracs = sorted(random.uniform(0.05, 0.9) for _ in range(chain_length - 1))
    return [fraud_start] + [
        fraud_start + timedelta(seconds=total_seconds * f) for f in fracs
    ]


def fast_hop_timestamps(fraud_start, chain_length):
    """Independent, fast per-hop delays — used for the late-reported cohort
    where realistic lead time doesn't matter, only chain plausibility."""
    timestamps = []
    t = fraud_start
    for _ in range(chain_length):
        timestamps.append(t)
        t = t + timedelta(minutes=random.randint(5, 720))
    return timestamps, t + timedelta(minutes=random.randint(10, 480))


def generate_background_noise(accounts_df, locations_df, n_transactions,
                               n_withdrawals, start_time, end_time):
    """Legit transactions and withdrawals unrelated to any fraud case,
    so the models have to learn real signal rather than trivial separation."""
    account_ids = accounts_df["account_id"].tolist()
    transactions = []
    for _ in range(n_transactions):
        a, b = random.sample(account_ids, 2)
        transactions.append({
            "transaction_id": f"TXN-{uuid.uuid4().hex[:10]}",
            "from_account": a,
            "to_account": b,
            "amount": round(random.uniform(500, 50000), 2),
            "timestamp": random_timestamp(start_time, end_time),
        })

    withdrawals = []
    for _ in range(n_withdrawals):
        acc = random.choice(account_ids)
        loc = locations_df.sample(1).iloc[0]
        withdrawals.append({
            "event_id": f"WD-{uuid.uuid4().hex[:10]}",
            "account_id": acc,
            "location_id": loc["location_id"],
            "amount": round(random.uniform(1000, 40000), 2),
            "timestamp": random_timestamp(start_time, end_time),
            "is_fraud_linked": False,
            "ring_id": None,
        })

    return transactions, withdrawals


def generate_dataset(n_complaints=500, n_background_accounts=3000,
                      n_locations=150, n_background_transactions=8000,
                      n_background_withdrawals=4000, seed=42,
                      early_complaint_rate=0.85):
    """
    early_complaint_rate: fraction of cases where the victim files their
    complaint BEFORE the cash-out withdrawal happens — the realistic,
    "predictive" scenario CashTrace is meant to solve. The remainder are
    filed AFTER the withdrawal (victim reported late, money's already
    gone) — these are kept as a realistic minority cohort, flagged via
    `is_predictive_case=False`, and should generally be excluded from
    training/eval of the prediction models since there's nothing left
    to predict by the time the complaint lands.
    """
    if n_complaints > n_background_accounts:
        raise ValueError(
            f"n_complaints ({n_complaints}) cannot exceed "
            f"n_background_accounts ({n_background_accounts}) — each "
            f"complaint needs a unique victim account sampled from the "
            f"background pool. Increase --n-background-accounts."
        )

    random.seed(seed)
    np.random.seed(seed)

    start_time = datetime.now() - timedelta(days=180)
    end_time = datetime.now()

    locations_df = generate_locations(n_locations, seed=seed)
    accounts_df = generate_accounts(n_background_accounts)
    rings = generate_rings(locations_df, seed=seed)

    all_new_accounts = []
    all_transactions = []
    all_withdrawals = []
    complaints = []

    victim_pool = accounts_df.sample(n_complaints, replace=False)

    for _, victim_row in victim_pool.iterrows():
        victim_account = victim_row["account_id"]
        accounts_df.loc[
            accounts_df["account_id"] == victim_account, "is_victim"
        ] = True

        fraud_start = random_timestamp(start_time, end_time - timedelta(days=5))
        chain_length = random.randint(2, 5)
        ring = random.choice(rings) if rings else None
        is_predictive_case = random.random() < early_complaint_rate

        if is_predictive_case:
            # Victim notices quickly (banking fraud alerts are usually fast)
            # and reports within 0.5-24 hours of the first transfer.
            reporting_delay_h = random.uniform(0.5, 24)
            complaint_filed = fraud_start + timedelta(hours=reporting_delay_h)
            # Actionable lead time: how far in the future the cash-out is
            # relative to when the complaint lands — this is the window
            # CashTrace is meant to give investigators.
            lead_time_h = random.uniform(2, 48)
            withdrawal_time = complaint_filed + timedelta(hours=lead_time_h)
            hop_timestamps = distribute_hop_timestamps(
                fraud_start, withdrawal_time, chain_length
            )
        else:
            # Late-reported cohort: chain moves fast, complaint comes well
            # after the cash-out has already happened.
            hop_timestamps, withdrawal_time = fast_hop_timestamps(
                fraud_start, chain_length
            )
            complaint_filed = withdrawal_time + timedelta(
                hours=random.randint(1, 72)
            )

        mule_accounts, transactions, withdrawal_event = build_fraud_chain(
            victim_account, ring, hop_timestamps, withdrawal_time
        )
        if withdrawal_event["location_id"] is None:
            withdrawal_event["location_id"] = (
                locations_df.sample(1).iloc[0]["location_id"]
            )

        all_new_accounts.extend(mule_accounts)
        all_transactions.extend(transactions)
        all_withdrawals.append(withdrawal_event)

        first_transaction_time = transactions[0]["timestamp"]

        complaints.append({
            "complaint_id": f"CMP-{uuid.uuid4().hex[:10]}",
            "victim_account": victim_account,
            "reported_amount": transactions[0]["amount"],
            "first_transaction_timestamp": first_transaction_time,
            "filed_timestamp": complaint_filed,
            "state": random.choice(list(CITIES.keys())),
            "is_predictive_case": is_predictive_case,
            "true_cashout_account": withdrawal_event["account_id"],   # ground truth
            "true_withdrawal_event": withdrawal_event["event_id"],    # ground truth
        })

    mule_accounts_df = pd.DataFrame(all_new_accounts)
    accounts_df = pd.concat([accounts_df, mule_accounts_df], ignore_index=True)

    bg_transactions, bg_withdrawals = generate_background_noise(
        accounts_df, locations_df, n_background_transactions,
        n_background_withdrawals, start_time, end_time
    )
    all_transactions.extend(bg_transactions)
    all_withdrawals.extend(bg_withdrawals)

    transactions_df = pd.DataFrame(all_transactions)
    withdrawals_df = pd.DataFrame(all_withdrawals)
    complaints_df = pd.DataFrame(complaints)

    return {
        "accounts": accounts_df,
        "transactions": transactions_df,
        "complaints": complaints_df,
        "locations": locations_df,
        "withdrawal_events": withdrawals_df,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic CashTrace dataset")
    parser.add_argument("--n-complaints", type=int, default=500)
    parser.add_argument("--n-background-accounts", type=int, default=3000)
    parser.add_argument("--n-locations", type=int, default=150)
    parser.add_argument("--n-background-transactions", type=int, default=8000)
    parser.add_argument("--n-background-withdrawals", type=int, default=4000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--early-complaint-rate", type=float, default=0.85,
                         help="Fraction of complaints filed before the cash-out "
                              "withdrawal happens (the predictive scenario).")
    parser.add_argument("--out-dir", type=str, default="./data")
    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    datasets = generate_dataset(
        n_complaints=args.n_complaints,
        n_background_accounts=args.n_background_accounts,
        n_locations=args.n_locations,
        n_background_transactions=args.n_background_transactions,
        n_background_withdrawals=args.n_background_withdrawals,
        seed=args.seed,
        early_complaint_rate=args.early_complaint_rate,
    )

    for name, df in datasets.items():
        path = os.path.join(args.out_dir, f"{name}.csv")
        df.to_csv(path, index=False)
        print(f"wrote {path}  ({len(df)} rows)")


if __name__ == "__main__":
    main()