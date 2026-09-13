from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Account
from app.schemas import AccountCreate, AccountResponse


router = APIRouter(
    prefix="/accounts",
    tags=["Accounts"]
)


@router.post("/", response_model=AccountResponse)
def create_account(
    account: AccountCreate,
    db: Session = Depends(get_db)
):
    existing_account = db.query(Account).filter(
        Account.account_number == account.account_number
    ).first()

    if existing_account:
        raise HTTPException(
            status_code=400,
            detail="Account already exists"
        )

    new_account = Account(
        account_number=account.account_number,
        holder_name=account.holder_name
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    return new_account


@router.get("/", response_model=list[AccountResponse])
def get_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()