"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = void 0;
class Payment {
}
exports.Payment = Payment;
Payment.SPENT_TYPE = {
    ORDER: 1,
    ACTION: 2,
    ACTION_REFUND: 3,
    ORDER_REFUND: 4,
};
Payment.STATUS = {
    NEW: 1,
    PENDING: 2,
    COMPLETED: 3,
    EXPIRED: 4,
    CANCELLED: 5,
    FAILED: 6,
    PENDING_PAID: 7,
    PENDING_CONFIRMED: 8,
    USER_ACTION_PENDING: 9,
    INSUFFICIENT_FUNDS: 10,
    CHARGE_FAILED: 11,
    BLOCKED: 12,
};
