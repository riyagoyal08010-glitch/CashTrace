# Data Analysis — CashTrace

Exploratory analysis of the CashTrace fraud-ring dataset (`data/*.csv`).

## 1. Dataset Overview

| File | Rows | Columns |
|---|---|---|
| `accounts.csv` | 4,791 | `account_id`, `holder_name`, `bank`, `opened_date`, `is_mule`, `is_victim` |
| `complaints.csv` | 500 | `complaint_id`, `victim_account`, `reported_amount`, `first_transaction_timestamp`, `filed_timestamp`, `state`, `is_predictive_case`, `true_cashout_account`, `true_withdrawal_event` |
| `locations.csv` | 150 | `location_id`, `name`, `type`, `city`, `latitude`, `longitude` |
| `transactions.csv` | 9,791 | `transaction_id`, `from_account`, `to_account`, `amount`, `timestamp` |
| `withdrawal_events.csv` | 4,500 | `event_id`, `account_id`, `location_id`, `amount`, `timestamp`, `is_fraud_linked`, `ring_id` |

## 2. Data Quality

- **Missing values:** none in any file except `withdrawal_events.csv`, where `ring_id` is missing for 4,000 of 4,500 rows (i.e. only 500 withdrawals are tagged to a known fraud ring — expected, since not all withdrawals are fraud-linked).
- **Duplicate rows:** 0 across all five files.
- **Referential integrity:** fully clean — 0 orphaned references across all checked relationships:
  - Complaint `victim_account` → `accounts.account_id`
  - Complaint `true_cashout_account` → `accounts.account_id`
  - Complaint `true_withdrawal_event` → `withdrawal_events.event_id`
  - Transaction `from_account` / `to_account` → `accounts.account_id`
  - Withdrawal `account_id` → `accounts.account_id`
  - Withdrawal `location_id` → `locations.location_id`

## 3. Complaints Breakdown

`is_predictive_case` splits complaints into two groups:

| Case type | Count | Mean reported amount | Min | Max |
|---|---|---|---|---|
| Predictive (`True`) | 420 | ₹242,490.57 | ₹13,803.09 | ₹472,341.68 |
| Non-predictive (`False`) | 80 | ₹222,718.33 | ₹16,774.53 | ₹480,282.19 |

Predictive cases (420 of 500, or 84%) make up the large majority of complaints and carry a slightly higher average reported amount (~9% higher than non-predictive cases).

## 4. Timing Analysis — Predictive Cases

For the 420 predictive cases, timestamps were compared across three events: first fraudulent transaction, complaint filing, and true cashout withdrawal.

**Sequence check (all 420 cases):**
- First transaction occurs **before** filing in 100% of cases (0 filed before the first transaction).
- The true cashout withdrawal happens **after** filing in 100% of cases (0 withdrawals occurred before filing).

This confirms a consistent causal order: `first_transaction → filed_timestamp → withdrawal`, meaning that at the moment a complaint is filed, the fraudulent cashout has **not yet happened** — this is the predictive window the model/system aims to act within.

**Hours between filing and cashout withdrawal** (`hours_to_withdrawal`):

| Stat | Value (hours) |
|---|---|
| count | 420 |
| mean | 25.04 |
| std dev | 12.87 |
| min | 2.17 |
| 25th percentile | 14.04 |
| median (50th) | 24.99 |
| 75th percentile | 35.85 |
| max | 48.00 |

**Interpretation:** Across predictive cases, the cashout withdrawal happens on average about **25 hours** (~1 day) after the complaint is filed, with the full range spanning **2.2 to 48 hours**. Half of all cashouts happen within roughly **25 hours** of filing, and 75% happen within **36 hours**. This gives a clear operational window (~2–48 hrs, median ~1 day) during which intervention could plausibly prevent the withdrawal.

