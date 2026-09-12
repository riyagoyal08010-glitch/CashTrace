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


def build_fraud_chain(victim_account, accounts_df, locations_df,
                       start_time, chain_length, ring, off_pattern_rate=0.1):
    """
    Simulate one fraud case: victim's money hops through `chain_length`
    mule accounts before being withdrawn as cash. The withdrawal location
    is drawn from the assigned ring's cluster most of the time, with a
    small chance (off_pattern_rate) of a fully random location — real
    mule networks aren't perfectly consistent either. Returns the new
    mule account rows, the transaction rows, and the final withdrawal event.
    """
    mule_accounts = []
    transactions = []

    current_account = victim_account
    current_time = start_time
    amount = round(random.uniform(15000, 500000), 2)

    for hop in range(chain_length):
        next_account_id = f"ACC-{uuid.uuid4().hex[:10]}"
        mule_accounts.append({
            "account_id": next_account_id,
            "holder_name": fake.name(),
            "bank": random.choice(BANKS),
            "opened_date": fake.date_between(start_date="-2y", end_date="-1d"),
            "is_mule": True,
            "is_victim": False,
        })

        # small "fee" shaved off at each hop, plus a short time gap
        amount = round(amount * random.uniform(0.85, 0.98), 2)
        current_time = current_time + timedelta(
            minutes=random.randint(5, 720)
        )

        transactions.append({
            "transaction_id": f"TXN-{uuid.uuid4().hex[:10]}",
            "from_account": current_account,
            "to_account": next_account_id,
            "amount": amount,
            "timestamp": current_time,
        })

        current_account = next_account_id

    # final hop: cash withdrawal, drawn from the ring's cluster (usually)
    withdrawal_time = current_time + timedelta(minutes=random.randint(10, 480))
    if ring is not None and random.random() > off_pattern_rate:
        location_id = random.choice(ring["location_ids"])
    else:
        location_id = locations_df.sample(1).iloc[0]["location_id"]

    withdrawal_event = {
        "event_id": f"WD-{uuid.uuid4().hex[:10]}",
        "account_id": current_account,
        "location_id": location_id,
        "amount": amount,
        "timestamp": withdrawal_time,
        "is_fraud_linked": True,
        "ring_id": ring["ring_id"] if ring is not None else None,
    }

    return mule_accounts, transactions, withdrawal_event


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
                      n_background_withdrawals=4000, seed=42):
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

        mule_accounts, transactions, withdrawal_event = build_fraud_chain(
            victim_account, accounts_df, locations_df, fraud_start,
            chain_length, ring
        )

        all_new_accounts.extend(mule_accounts)
        all_transactions.extend(transactions)
        all_withdrawals.append(withdrawal_event)

        complaint_filed = withdrawal_event["timestamp"] + timedelta(
            hours=random.randint(1, 72)
        )
        complaints.append({
            "complaint_id": f"CMP-{uuid.uuid4().hex[:10]}",
            "victim_account": victim_account,
            "reported_amount": transactions[0]["amount"],
            "filed_timestamp": complaint_filed,
            "state": random.choice(list(CITIES.keys())),
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
    )

    for name, df in datasets.items():
        path = os.path.join(args.out_dir, f"{name}.csv")
        df.to_csv(path, index=False)
        print(f"wrote {path}  ({len(df)} rows)")


if __name__ == "__main__":
    main()