from datetime import datetime, time
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends

from apps.api.monoscope_api.dependencies import get_account_service
from apps.api.monoscope_api.errors import ApiError
from apps.api.monoscope_api.schemas import (
    AccountResponse,
    AccountsResponse,
    AccountTransactionResponse,
    StatementRequest,
    StatementResponse,
)
from monoscope.accounts import AccountNotFoundError, AccountService

KYIV = ZoneInfo("Europe/Kyiv")

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=AccountsResponse)
def list_accounts(
    service: Annotated[AccountService, Depends(get_account_service)],
) -> AccountsResponse:
    return AccountsResponse(
        accounts=[
            AccountResponse.model_validate(account, from_attributes=True)
            for account in service.list_fop_accounts()
        ]
    )


@router.post("/{account_id}/statement", response_model=StatementResponse)
def get_statement(
    account_id: str,
    request: StatementRequest,
    service: Annotated[AccountService, Depends(get_account_service)],
) -> StatementResponse:
    now = datetime.now(KYIV)
    start = datetime.combine(request.date_from, time.min, tzinfo=KYIV)
    requested_end = datetime.combine(request.date_to, time.max, tzinfo=KYIV)
    end = min(requested_end, now) if request.date_to == now.date() else requested_end

    try:
        transactions = service.get_statement(
            account_id,
            int(start.timestamp()),
            int(end.timestamp()),
        )
    except AccountNotFoundError as exc:
        raise ApiError(
            status_code=404,
            code="ACCOUNT_NOT_FOUND",
            message="FOP account not found.",
        ) from exc

    return StatementResponse(
        account_id=account_id,
        date_from=request.date_from,
        date_to=request.date_to,
        transactions=[
            AccountTransactionResponse(
                id=item.id,
                occurred_at=datetime.fromtimestamp(item.occurred_at, tz=KYIV),
                description=item.description,
                comment=item.comment,
                amount=item.amount,
                currency=item.currency,
                operation_amount=item.operation_amount,
                operation_currency=item.operation_currency,
                balance_after=item.balance_after,
                hold=item.hold,
                direction=item.direction,
                counter_name=item.counter_name,
                counter_edrpou=item.counter_edrpou,
                counter_iban=item.counter_iban,
                invoice_id=item.invoice_id,
                receipt_id=item.receipt_id,
            )
            for item in transactions
        ],
    )
