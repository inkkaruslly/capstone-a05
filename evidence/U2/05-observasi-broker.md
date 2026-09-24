# U2 - Observasi Broker

Saat worker berhenti setelah publish:

```text
queue  messages_ready  messages_unacknowledged  consumers
triage 5               0                        0
```

Setelah worker hidup kembali, kelima pesan dikonsumsi dan queue kembali kosong. Ini membuktikan RabbitMQ menahan pesan durable sampai consumer pulih.
