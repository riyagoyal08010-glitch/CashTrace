from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    account_id = Column(String(50), primary_key=True, index=True)
    holder_name = Column(String(100), nullable=False)
    bank = Column(String(100))
    opened_date = Column(DateTime)
    is_mule = Column(Boolean, default=False)
    is_victim = Column(Boolean, default=False)


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String(50), primary_key=True, index=True)

    from_account = Column(
        String(50),
        ForeignKey("accounts.account_id"),
        nullable=False
    )

    to_account = Column(
        String(50),
        ForeignKey("accounts.account_id"),
        nullable=False
    )

    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)

    sender = relationship(
        "Account",
        foreign_keys=[from_account]
    )

    receiver = relationship(
        "Account",
        foreign_keys=[to_account]
    )


class Complaint(Base):
    __tablename__ = "complaints"

    complaint_id = Column(String(50), primary_key=True, index=True)

    victim_account = Column(
        String(50),
        ForeignKey("accounts.account_id"),
        nullable=False
    )

    reported_amount = Column(Float)
    first_transaction_timestamp = Column(DateTime)
    filed_timestamp = Column(DateTime)
    state = Column(String(100))
    is_predictive_case = Column(Boolean, default=False)

    # Ground-truth fields — useful for evaluation,
    # not to be used as prediction inputs.
    true_cashout_account = Column(String(50))
    true_withdrawal_event = Column(String(50))

    victim = relationship(
        "Account",
        foreign_keys=[victim_account]
    )


class Location(Base):
    __tablename__ = "locations"

    location_id = Column(String(50), primary_key=True, index=True)

    name = Column(String(150), nullable=False)
    type = Column(String(50))
    city = Column(String(100))

    latitude = Column(Float)
    longitude = Column(Float)

    coordinates = Column(
        Geometry(
            geometry_type="POINT",
            srid=4326
        )
    )


class WithdrawalEvent(Base):
    __tablename__ = "withdrawal_events"

    event_id = Column(String(50), primary_key=True, index=True)

    account_id = Column(
        String(50),
        ForeignKey("accounts.account_id")
    )

    location_id = Column(
        String(50),
        ForeignKey("locations.location_id")
    )

    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)

    is_fraud_linked = Column(Boolean, default=False)
    ring_id = Column(String(50))

    account = relationship("Account")
    location = relationship("Location")