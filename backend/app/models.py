from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String(50), unique=True, nullable=False)
    holder_name = Column(String(100), nullable=False)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String(50), nullable=False)
    timestamp = Column(DateTime, nullable=False)

    account = relationship("Account")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    complaint_text = Column(Text)
    timestamp = Column(DateTime)

    account = relationship("Account")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)

    coordinates = Column(
        Geometry(
            geometry_type="POINT",
            srid=4326
        )
    )


class WithdrawalEvent(Base):
    __tablename__ = "withdrawal_events"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)

    account = relationship("Account")
    location = relationship("Location")