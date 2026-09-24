# U4 - Observasi Broker

X01 ditolak oleh gateway sebelum publish karena `ticket_id` wajib diisi, sehingga tidak masuk queue dan tidak memicu retry loop.

V01 diterima dengan HTTP 202, dipublish ke routing key `ticket.created`, diproses worker, lalu di-ACK setelah commit database.

Kondisi queue setelah pengujian: `messages_ready=0`, `messages_unacknowledged=0`.
