import os
import sys

sys.path.insert(0, os.path.abspath("backend"))

import pandas as pd
from geoalchemy2.elements import WKTElement

from app.database import Base, engine, SessionLocal
from app.models import (
    Account,
    Transaction,
    Complaint,
    Location,
    WithdrawalEvent,
)


DATA_DIR = "data"


def load_data():
    print("Resetting database tables...")

    # Prototype DB hai, so existing empty/old tables ko recreate karenge
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # ---------------- ACCOUNTS ----------------
        accounts = pd.read_csv(f"{DATA_DIR}/accounts.csv")

        account_rows = []
        for _, row in accounts.iterrows():
            account_rows.append({
                "account_id": row["account_id"],
                "holder_name": row["holder_name"],
                "bank": row["bank"],
                "opened_date": pd.to_datetime(row["opened_date"]).to_pydatetime(),
                "is_mule": bool(row["is_mule"]),
                "is_victim": bool(row["is_victim"]),
            })

        db.bulk_insert_mappings(Account, account_rows)
        db.commit()
        print(f"Accounts loaded: {len(account_rows)}")

        # ---------------- LOCATIONS ----------------
        locations = pd.read_csv(f"{DATA_DIR}/locations.csv")

        location_rows = []
        for _, row in locations.iterrows():
            location_rows.append({
                "location_id": row["location_id"],
                "name": row["name"],
                "type": row["type"],
                "city": row["city"],
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "coordinates": WKTElement(
                    f"POINT({row['longitude']} {row['latitude']})",
                    srid=4326
                ),
            })

        db.bulk_insert_mappings(Location, location_rows)
        db.commit()
        print(f"Locations loaded: {len(location_rows)}")

        # ---------------- TRANSACTIONS ----------------
        transactions = pd.read_csv(f"{DATA_DIR}/transactions.csv")

        transaction_rows = []
        for _, row in transactions.iterrows():
            transaction_rows.append({
                "transaction_id": row["transaction_id"],
                "from_account": row["from_account"],
                "to_account": row["to_account"],
                "amount": float(row["amount"]),
                "timestamp": pd.to_datetime(row["timestamp"]).to_pydatetime(),
            })

        db.bulk_insert_mappings(Transaction, transaction_rows)
        db.commit()
        print(f"Transactions loaded: {len(transaction_rows)}")

        # ---------------- COMPLAINTS ----------------
        complaints = pd.read_csv(f"{DATA_DIR}/complaints.csv")

        complaint_rows = []
        for _, row in complaints.iterrows():
            complaint_rows.append({
                "complaint_id": row["complaint_id"],
                "victim_account": row["victim_account"],
                "reported_amount": float(row["reported_amount"]),
                "first_transaction_timestamp":
                    pd.to_datetime(row["first_transaction_timestamp"]).to_pydatetime(),
                "filed_timestamp":
                    pd.to_datetime(row["filed_timestamp"]).to_pydatetime(),
                "state": row["state"],
                "is_predictive_case": bool(row["is_predictive_case"]),
                "true_cashout_account": row["true_cashout_account"],
                "true_withdrawal_event": row["true_withdrawal_event"],
            })

        db.bulk_insert_mappings(Complaint, complaint_rows)
        db.commit()
        print(f"Complaints loaded: {len(complaint_rows)}")

        # ---------------- WITHDRAWALS ----------------
        withdrawals = pd.read_csv(f"{DATA_DIR}/withdrawal_events.csv")

        withdrawal_rows = []
        for _, row in withdrawals.iterrows():
            withdrawal_rows.append({
                "event_id": row["event_id"],
                "account_id": row["account_id"],
                "location_id": row["location_id"],
                "amount": float(row["amount"]),
                "timestamp": pd.to_datetime(row["timestamp"]).to_pydatetime(),
                "is_fraud_linked": bool(row["is_fraud_linked"]),
                "ring_id": row["ring_id"],
            })

        db.bulk_insert_mappings(WithdrawalEvent, withdrawal_rows)
        db.commit()
        print(f"Withdrawals loaded: {len(withdrawal_rows)}")

        print("\n✅ ALL DATA LOADED SUCCESSFULLY!")

    except Exception as e:
        db.rollback()
        print("\n❌ ERROR:")
        print(e)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    load_data()