"""
Time-based train/val/test split for CashTrace.

We deliberately do NOT use a random split. The real question the models
are answering is "can we predict a future cash-out given only information
available at complaint time" — a random split would let a model train on
complaints filed AFTER some test-set complaints, which is its own subtle
form of leakage (the model could learn patterns from a "future" relative
to the test point). Splitting strictly by filed_timestamp keeps training
data chronologically earlier than validation and test data, matching how
the model would actually be used in production.

Also filters to is_predictive_case == True only — the late-reported
cohort (complaint filed after the cash-out already happened) has nothing
left to predict and would only dilute training signal / inflate apparent
difficulty if included.

Usage:
    from graph_builder import load_data
    from time_split import time_based_split

    data = load_data("./data")
    train, val, test = time_based_split(data["complaints"])
"""

import pandas as pd


def time_based_split(complaints_df, train_frac=0.7, val_frac=0.15,
                      predictive_only=True):
    """
    Split complaints chronologically by filed_timestamp.

    Returns (train_df, val_df, test_df), each still containing all
    original columns. Fractions must sum to <= 1.0; the remainder goes
    to the test set (default: 70% train, 15% val, 15% test).
    """
    df = complaints_df.copy()
    if predictive_only:
        df = df[df["is_predictive_case"]].copy()

    df = df.sort_values("filed_timestamp").reset_index(drop=True)

    n = len(df)
    train_end = int(n * train_frac)
    val_end = int(n * (train_frac + val_frac))

    train_df = df.iloc[:train_end]
    val_df = df.iloc[train_end:val_end]
    test_df = df.iloc[val_end:]

    return train_df, val_df, test_df


def summarize_split(train_df, val_df, test_df):
    """Print a quick sanity-check summary of a split — sizes and the
    chronological boundaries, so it's obvious the split isn't leaking."""
    for name, split_df in [("train", train_df), ("val", val_df), ("test", test_df)]:
        if len(split_df) == 0:
            print(f"{name:5s}: 0 complaints")
            continue
        start = split_df["filed_timestamp"].min()
        end = split_df["filed_timestamp"].max()
        print(f"{name:5s}: {len(split_df):4d} complaints  "
              f"({start} -> {end})")

    # sanity check: splits should not overlap in time
    if len(train_df) and len(val_df):
        assert train_df["filed_timestamp"].max() <= val_df["filed_timestamp"].min(), \
            "train/val overlap in time — split logic is broken"
    if len(val_df) and len(test_df):
        assert val_df["filed_timestamp"].max() <= test_df["filed_timestamp"].min(), \
            "val/test overlap in time — split logic is broken"
    print("\nNo temporal overlap between splits — confirmed.")


if __name__ == "__main__":
    from graph_builder import load_data

    data = load_data("./data")
    train_df, val_df, test_df = time_based_split(data["complaints"])
    summarize_split(train_df, val_df, test_df)