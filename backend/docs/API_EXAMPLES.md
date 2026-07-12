# SnackFlow API -- Sample Requests & Responses

All examples assume the API is running at `http://localhost:8000` and that
`X-Admin-Key` matches the `ADMIN_API_KEY` configured in `.env` for
staff-only endpoints.

---

## 1. Store Status

### GET /api/store/status
```bash
curl http://localhost:8000/api/store/status
```
```json
{ "is_open": true, "message": null }
```

### PATCH /api/store/status (staff only)
```bash
curl -X PATCH http://localhost:8000/api/store/status \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your_admin_key" \
  -d '{"is_open": false, "message": "Back in 15 minutes"}'
```
```json
{ "is_open": false, "message": "Back in 15 minutes" }
```

---

## 2. Menu

### GET /api/menu (public -- only in_stock = true items)
```bash
curl http://localhost:8000/api/menu
```
```json
[
  {
    "id": "5a93021a-a418-478b-a45e-6b8f2ed18741",
    "category_id": "6081a292-50bd-4efa-ac13-270e8673b4ee",
    "name": "Veg Burger",
    "description": "Tasty",
    "price": "120.50",
    "image_url": null,
    "in_stock": true,
    "prep_time_minutes": 8
  }
]
```

### GET /api/menu/{id}
```bash
curl http://localhost:8000/api/menu/5a93021a-a418-478b-a45e-6b8f2ed18741
```

### POST /api/menu (staff only)
```bash
curl -X POST http://localhost:8000/api/menu \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your_admin_key" \
  -d '{
    "name": "Veg Burger",
    "description": "Tasty",
    "price": 120.50,
    "in_stock": true,
    "prep_time_minutes": 8,
    "category_id": "6081a292-50bd-4efa-ac13-270e8673b4ee"
  }'
```
Response: `201 Created` with the created `MenuItemOut`.

### PUT /api/menu/{id} (staff only, partial update)
```bash
curl -X PUT http://localhost:8000/api/menu/5a93021a-a418-478b-a45e-6b8f2ed18741 \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your_admin_key" \
  -d '{"in_stock": false}'
```

### DELETE /api/menu/{id} (staff only)
```bash
curl -X DELETE http://localhost:8000/api/menu/5a93021a-a418-478b-a45e-6b8f2ed18741 \
  -H "X-Admin-Key: your_admin_key"
```
Response: `204 No Content`.

---

## 3. Orders

### POST /api/orders -- CASH order
```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "session_uuid": "fbce5df3-bb01-45b3-80eb-bfd8ae0fd060",
    "table_number": "T5",
    "order_type": "CASH",
    "items": [
      {"menu_item_id": "5a93021a-a418-478b-a45e-6b8f2ed18741", "quantity": 2}
    ]
  }'
```
```json
{
  "order": {
    "id": "34caf662-7605-498c-a4cd-db09136d265c",
    "daily_order_id": "A1",
    "session_uuid": "fbce5df3-bb01-45b3-80eb-bfd8ae0fd060",
    "table_number": "T5",
    "order_type": "CASH",
    "status": "UNPAID_CASH",
    "total_amount": "241.00",
    "eta_minutes": 8,
    "special_instructions": null,
    "items": [
      {
        "id": "...", "menu_item_id": "5a93021a-a418-478b-a45e-6b8f2ed18741",
        "quantity": 2, "unit_price": "120.50", "subtotal": "241.00", "notes": null
      }
    ],
    "created_at": "2026-07-07T04:24:07Z",
    "updated_at": "2026-07-07T04:24:07Z"
  },
  "razorpay_order_id": null,
  "razorpay_key_id": null,
  "amount_paise": null
}
```

**Cash Lock in action** -- placing a second CASH order from the same
`session_uuid` before the first is settled:
```json
{
  "success": false,
  "error_code": "CASH_LOCK_ACTIVE",
  "message": "This session already has an unpaid cash order. Please settle it before placing another cash order."
}
```
`HTTP 409 Conflict`

**Rate limit in action** -- a 4th POST /api/orders from the same IP within 15 minutes:
```json
{
  "success": false,
  "error_code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many order requests. Maximum 3 orders per 15 minutes allowed per IP."
}
```
`HTTP 429 Too Many Requests`

### POST /api/orders -- ONLINE order
```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "session_uuid": "4f0db75e-59d5-4681-95bd-15b37c7c8acc",
    "table_number": "T9",
    "order_type": "ONLINE",
    "items": [{"menu_item_id": "5a93021a-a418-478b-a45e-6b8f2ed18741", "quantity": 1}]
  }'
```
```json
{
  "order": { "...": "...", "status": "PENDING_PAYMENT", "daily_order_id": "A2" },
  "razorpay_order_id": "order_Nb1XYZ...",
  "razorpay_key_id": "rzp_test_xxxxxxxxxxxx",
  "amount_paise": 12050
}
```
The frontend uses `razorpay_order_id` + `razorpay_key_id` to open Razorpay Checkout.

### GET /api/orders
```bash
curl "http://localhost:8000/api/orders?status=PAID&limit=20"
curl "http://localhost:8000/api/orders?session_uuid=4f0db75e-59d5-4681-95bd-15b37c7c8acc"
```

### GET /api/orders/{id}
```bash
curl http://localhost:8000/api/orders/34caf662-7605-498c-a4cd-db09136d265c
```

### PATCH /api/orders/{id} (staff only -- status transition)
```bash
curl -X PATCH http://localhost:8000/api/orders/34caf662-7605-498c-a4cd-db09136d265c \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your_admin_key" \
  -d '{"status": "PREPARING"}'
```
Valid transitions: `PENDING_PAYMENT|UNPAID_CASH -> PAID -> PREPARING -> READY -> COMPLETED`,
and any non-terminal state `-> CANCELLED`. Invalid transitions return
`422 VALIDATION_ERROR`.

### DELETE /api/orders/{id} (staff only -- soft cancel)
```bash
curl -X DELETE http://localhost:8000/api/orders/34caf662-7605-498c-a4cd-db09136d265c \
  -H "X-Admin-Key: your_admin_key"
```
Response: `204 No Content`. Sets `status = CANCELLED` (record is preserved for audit/finance history).

---

## 4. Payments

### POST /api/payments/create-order
```bash
curl -X POST http://localhost:8000/api/payments/create-order \
  -H "Content-Type: application/json" \
  -d '{"order_id": "34caf662-7605-498c-a4cd-db09136d265c"}'
```
```json
{
  "razorpay_order_id": "order_Nb1XYZ...",
  "razorpay_key_id": "rzp_test_xxxxxxxxxxxx",
  "amount_paise": 12050,
  "currency": "INR"
}
```

### POST /api/payments/webhook (called by Razorpay, not the frontend)
Header: `X-Razorpay-Signature: <hmac-sha256 of raw body>`
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": { "id": "pay_xyz", "order_id": "order_Nb1XYZ...", "amount": 12050, "status": "captured" }
    }
  }
}
```
Response (verified + processed):
```json
{ "status": "processed", "order_id": "34caf662-7605-498c-a4cd-db09136d265c" }
```
Invalid signature -> `402 PAYMENT_ERROR: Invalid webhook signature`.
Duplicate delivery of an already-processed event -> `{"status": "already_processed"}`.

### POST /api/payments/refund (staff only)
```bash
curl -X POST http://localhost:8000/api/payments/refund \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your_admin_key" \
  -d '{"transaction_id": "pay_xyz", "reason": "Customer cancelled after payment"}'
```
```json
{
  "id": "...", "payment_id": "...", "transaction_id": "pay_xyz",
  "gateway_refund_id": "rfnd_abc", "amount": "120.50",
  "reason": "Customer cancelled after payment", "status": "PROCESSED"
}
```

---

## 5. WebSocket -- Real-time Order Tracking

Connect (JavaScript example):
```javascript
const ws = new WebSocket(`ws://localhost:8000/ws/session/${sessionUuid}`);
// or, for a single order tracking link:
const ws = new WebSocket(`ws://localhost:8000/ws/order/${orderId}`);

ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  console.log(payload.event, payload.data);
};
```

Example event payloads pushed by the server:
```json
{"event": "order_created", "order_id": "...", "daily_order_id": "A1", "data": {"status": "UNPAID_CASH", "eta_minutes": 8}, "timestamp": "2026-07-07T04:24:07Z"}
{"event": "payment_success", "order_id": "...", "daily_order_id": "A2", "data": {"status": "PAID"}, "timestamp": "..."}
{"event": "order_status_changed", "order_id": "...", "daily_order_id": "A1", "data": {"previous_status": "PAID", "status": "PREPARING"}, "timestamp": "..."}
{"event": "order_ready", "order_id": "...", "daily_order_id": "A1", "data": {"status": "READY"}, "timestamp": "..."}
```

---

## 6. Health Check
```bash
curl http://localhost:8000/health
```
```json
{ "status": "ok", "app": "SnackFlow API", "env": "development" }
```
