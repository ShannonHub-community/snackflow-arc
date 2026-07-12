import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.crud.base import CRUDBase
from src.models.payment import Payment, Refund


class CRUDPayment(CRUDBase[Payment]):
    async def get_by_order_id(self, db: AsyncSession, order_id: uuid.UUID) -> Payment | None:
        result = await db.execute(select(Payment).where(Payment.order_id == order_id))
        return result.scalar_one_or_none()

    async def get_by_gateway_order_id(
        self, db: AsyncSession, gateway_order_id: str
    ) -> Payment | None:
        result = await db.execute(
            select(Payment).where(Payment.gateway_order_id == gateway_order_id)
        )
        return result.scalar_one_or_none()

    async def get_by_gateway_payment_id(
        self, db: AsyncSession, gateway_payment_id: str
    ) -> Payment | None:
        result = await db.execute(
            select(Payment).where(Payment.gateway_payment_id == gateway_payment_id)
        )
        return result.scalar_one_or_none()


class CRUDRefund(CRUDBase[Refund]):
    async def get_by_transaction_id(self, db: AsyncSession, transaction_id: str) -> Refund | None:
        result = await db.execute(
            select(Refund).where(Refund.transaction_id == transaction_id)
        )
        return result.scalar_one_or_none()


payment_crud = CRUDPayment(Payment)
refund_crud = CRUDRefund(Refund)
