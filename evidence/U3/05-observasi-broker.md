# U3 - Observasi Broker

Kelima replay diterima producer dengan HTTP 202 dan dirutekan melalui `support` / `ticket.created` ke queue `triage`.

Setelah worker memproses replay, pesan di-ACK dan tidak tersisa di queue. Deduplication dilakukan berdasarkan `event_id` di worker sebelum insert assignment.
