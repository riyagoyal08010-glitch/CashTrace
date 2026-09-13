"""
Loads the synthetic dataset and builds the account transaction graph that
both the fund-flow model and the geo-time model are built on top of.

Critically, this also provides `graph_as_of()` — a temporal snapshot of
the graph containing only transactions that existed at a given cutoff
time. This is what prevents the leakage problem we caught earlier:
whoever traces fund flow for a complaint must only see the part of the
graph that existed at complaint-filing time, not the full future chain
that only exists in the synthetic ground truth.

Usage:
    from graph_builder import load_data, build_transaction_graph, get_complaint_context

    data = load_data("./data")
    graph = build_transaction_graph(data)

    complaint = data["complaints"].iloc[0]
    victim_account, cutoff_time, subgraph = get_complaint_context(complaint, graph)
    # subgraph now contains ONLY transactions timestamped <= cutoff_time —
    # safe to hand to a model without leaking the future.
"""

import os

import networkx as nx
import pandas as pd

DATE_COLUMNS = {
    "accounts": ["opened_date"],
    "transactions": ["timestamp"],
    "complaints": ["first_transaction_timestamp", "filed_timestamp"],
    "locations": [],
    "withdrawal_events": ["timestamp"],
}


def load_data(data_dir="./data"):
    """Load all five CSVs into a dict of DataFrames with datetime columns parsed."""
    data = {}
    for name, date_cols in DATE_COLUMNS.items():
        path = os.path.join(data_dir, f"{name}.csv")
        data[name] = pd.read_csv(path, parse_dates=date_cols or None)
    return data


def build_transaction_graph(data):
    """
    Build a directed multigraph of all transactions:
      - nodes = accounts, carrying is_mule / is_victim / bank / opened_date
      - edges = transactions, carrying amount / timestamp / transaction_id

    A MultiDiGraph is used (not DiGraph) because the same pair of accounts
    can legitimately transact more than once.
    """
    graph = nx.MultiDiGraph()

    for _, row in data["accounts"].iterrows():
        graph.add_node(
            row["account_id"],
            bank=row["bank"],
            opened_date=row["opened_date"],
            is_mule=bool(row["is_mule"]),
            is_victim=bool(row["is_victim"]),
        )

    for _, row in data["transactions"].iterrows():
        graph.add_edge(
            row["from_account"],
            row["to_account"],
            key=row["transaction_id"],
            transaction_id=row["transaction_id"],
            amount=row["amount"],
            timestamp=row["timestamp"],
        )

    return graph


def graph_as_of(graph, cutoff_timestamp):
    """
    Return a subgraph containing only edges (transactions) with
    timestamp <= cutoff_timestamp. This is the "what would we have known
    at this point in time" view — always use this, never the full graph,
    when tracing fund flow for a specific complaint.
    """
    edges_to_keep = [
        (u, v, k)
        for u, v, k, ts in graph.edges(keys=True, data="timestamp")
        if ts <= cutoff_timestamp
    ]
    return graph.edge_subgraph(edges_to_keep).copy()


def get_reachable_accounts(subgraph, victim_account, max_hops=6):
    """
    Return all accounts reachable downstream from the victim account
    within max_hops, in the (already temporally-filtered) subgraph.
    These are the fund-flow model's candidate cash-out accounts.
    """
    if victim_account not in subgraph:
        return []
    lengths = nx.single_source_shortest_path_length(
        subgraph, victim_account, cutoff=max_hops
    )
    # exclude the victim account itself
    return [acc for acc, hops in lengths.items() if hops > 0]


def get_complaint_context(complaint_row, graph, max_hops=6):
    """
    Convenience wrapper for model code: given one row of complaints.csv
    and the full transaction graph, return:
        victim_account   - the account to start tracing from
        cutoff_time      - filed_timestamp (the leakage boundary)
        subgraph          - graph_as_of(cutoff_time)
        candidate_accounts - accounts reachable from victim within max_hops,
                              using only transactions known by cutoff_time
    """
    victim_account = complaint_row["victim_account"]
    cutoff_time = complaint_row["filed_timestamp"]
    subgraph = graph_as_of(graph, cutoff_time)
    candidate_accounts = get_reachable_accounts(subgraph, victim_account, max_hops)
    return victim_account, cutoff_time, subgraph, candidate_accounts


if __name__ == "__main__":
    data = load_data("./data")
    graph = build_transaction_graph(data)
    print(f"Full graph: {graph.number_of_nodes()} accounts, "
          f"{graph.number_of_edges()} transactions")

    predictive = data["complaints"][data["complaints"]["is_predictive_case"]]
    print(f"\nChecking {len(predictive)} predictive-case complaints for leakage...")

    hit_count = 0
    reachable_sizes = []
    for _, complaint in predictive.iterrows():
        victim, cutoff, subgraph, candidates = get_complaint_context(complaint, graph)
        true_account = complaint["true_cashout_account"]
        if true_account in candidates:
            hit_count += 1
        reachable_sizes.append(len(candidates))

    print(f"True cash-out account reachable (as of complaint time) in "
          f"{hit_count}/{len(predictive)} cases "
          f"({100 * hit_count / len(predictive):.1f}%)")
    print(f"Avg candidate accounts per complaint: "
          f"{sum(reachable_sizes) / len(reachable_sizes):.1f}")