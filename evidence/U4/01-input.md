# U4 - Input

Script: `node scripts/u4.js`

X01 invalid, tanpa `ticket_id`:

```json
{"event_id":"run01-X01","customer_id":"CUS-X01","category":"billing","subject":"Tiket invalid tanpa ticket_id"}
```

V01 valid:

```json
{"event_id":"run01-V01","ticket_id":"TKT-V01","customer_id":"CUS-V01","category":"billing","subject":"Tiket valid setelah pesan invalid"}
```
