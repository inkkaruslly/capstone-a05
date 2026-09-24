# U1 - Observasi Broker

Exchange: `support`
Routing key: `ticket.created`
Queue: `triage`

Binding yang teramati:

```text
support -> triage | ticket.created
```

Setelah worker selesai memproses, queue berada pada kondisi kosong (`messages_ready=0`, `messages_unacknowledged=0`).
