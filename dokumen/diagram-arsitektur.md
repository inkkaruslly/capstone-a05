# Diagram Arsitektur dan Alur Acknowledgment

## Capstone A05 - Kelompok 3

```mermaid
flowchart LR
    C[Client / Script U1-U4]
    G[Gateway / Producer\nPOST /tickets]
    X((Exchange\nsupport\ndirect))
    R{{Routing key\nticket.created}}
    Q[(Queue durable\ntriage)]
    W[Worker / Consumer\nlayanan/worker.js]
    V{Validasi event\n ticket_id tersedia?}
    T[(PostgreSQL\ncapstone_a05)]
    A1((ACK\nsetelah COMMIT))
    A2((ACK\ninvalid dicatat))
    N((NACK + requeue\nerror teknis))
    RJ[(rejected_messages)]
    TA[(ticket_assignments)]
    E1[HTTP 202\nditerima broker]
    E2[HTTP 400\nREJECTED]

    C -->|JSON ticket| G
    G -->|event ticket.created| X
    X -->|binding| R
    R --> Q
    Q -->|consume, prefetch 1| W
    W --> V

    V -->|Valid| T
    T --> TA
    TA -->|INSERT berhasil| A1
    A1 -->|channel.ack(message)| Q
    A1 --> W

    V -->|Invalid dari broker| RJ
    RJ --> A2
    A2 -->|channel.ack(message)\ntidak di-requeue| Q
    A2 --> W

    T -->|error teknis| N
    N -->|channel.nack(message, false, true)| Q

    G -->|ticket_id kosong| E2
    G -->|publish berhasil| E1
```

## Keterangan Komponen

| Komponen | Peran |
|---|---|
| Client / script | Mengirim request tiket dan menjalankan skenario U1-U4. |
| Gateway / producer | Menerima `POST /tickets`, memvalidasi input minimum, membentuk event, dan publish ke RabbitMQ. |
| Exchange `support` | Menerima event dan meneruskan pesan berdasarkan routing key. |
| Routing key `ticket.created` | Kunci routing untuk event tiket baru. |
| Queue `triage` | Antrean durable yang menahan pesan saat worker berhenti. |
| Worker / consumer | Mengambil pesan, memvalidasi, mengklasifikasikan, dan menyimpan assignment. |
| `ticket_assignments` | Menyimpan tiket valid yang berhasil ditugaskan. `event_id` bersifat unik untuk idempotensi. |
| `rejected_messages` | Menyimpan event invalid dan alasan penolakannya. |

## Alur Acknowledgment

1. Gateway mengembalikan **HTTP 400** untuk request tanpa `ticket_id`; request tersebut tidak dipublish ke broker.
2. Gateway mengembalikan **HTTP 202** setelah event berhasil dipublish ke exchange.
3. Worker memproses event valid dalam transaksi PostgreSQL.
4. Setelah `COMMIT` berhasil, worker mengirim `channel.ack(message)` sehingga pesan dihapus dari queue.
5. Event invalid yang terlanjur masuk broker dicatat ke `rejected_messages`, lalu di-ACK agar tidak masuk retry loop.
6. Error teknis pada pemrosesan menggunakan `channel.nack(message, false, true)` agar pesan dikembalikan ke queue untuk dicoba lagi.

## Invariant Operasional

- Pesan valid tidak di-ACK sebelum hasil database di-commit.
- Pesan invalid tidak di-requeue setelah berhasil dicatat.
- Queue `triage` dapat menahan pesan saat worker berhenti.
- Replay dengan `event_id` yang sama tidak membuat assignment duplikat.
