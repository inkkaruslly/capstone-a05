# Capstone A05 - Tiket Bantuan Pelanggan

## Identitas

- Kelompok: Kelompok 3
- Kode kasus: A05
- Teknologi: Node.js, RabbitMQ, PostgreSQL, dan Docker Compose

### Anggota dan kontribusi

| Anggota | Kontribusi |
|---|---|
| Floribertus Yericho Pramudya | Implementasi gateway/producer, endpoint HTTP `/tickets`, dan publikasi event ke RabbitMQ. |
| Inkka Ruslly Dwitama | Implementasi worker/consumer, validasi event, klasifikasi antrean layanan, dan idempotensi berdasarkan `event_id`. |
| Luqman Adhi Kuncoro | Implementasi skema PostgreSQL dan Docker Compose, penyusunan skenario U1-U4, dokumentasi, dan evidence. |

## Arsitektur

```text
HTTP client
	-> gateway/server.js
	-> exchange support
	-> routing key ticket.created
	-> queue triage
	-> layanan/worker.js
	-> PostgreSQL
```

Aturan klasifikasi:

- `billing` -> `FINANCE`
- `technical` -> `TECH`
- kategori lainnya -> `GENERAL`

## Prasyarat

- Docker Desktop aktif
- Node.js dan npm terpasang
- Port lokal tersedia: `3000`, `5432`, `5672`, dan `15672`
- PowerShell atau terminal lain untuk menjalankan beberapa proses

## Konfigurasi contoh

Nilai default berikut sudah tersedia di source code dan dapat dioverride dengan environment variable:

```text
PORT=3000
RABBITMQ_URL=amqp://guest:guest@localhost:5672
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/capstone_a05
```

RabbitMQ Management: `http://localhost:15672` dengan user `guest` dan password `guest`.

Database: `capstone_a05`, user `postgres`, password `postgres`.

## Urutan setup

Jalankan dari root repository:

```powershell
cd "D:\Message Broker\capstone-a05"
npm install
docker compose up -d
```

Periksa service Docker:

```powershell
docker compose ps
```

## Urutan start

Buka dua terminal dari root repository.

Terminal worker:

```powershell
npm run worker
```

Terminal gateway:

```powershell
npm run gateway
```

Gateway tersedia di `http://localhost:3000`.

## Urutan publish

Dengan gateway dan worker aktif, jalankan script berikut secara berurutan:

```powershell
node scripts/u1.js
node scripts/u3.js
node scripts/u4.js
```

U2 menguji ketahanan broker saat worker berhenti. Urutannya harus seperti ini:

1. Hentikan worker dengan `Ctrl+C`.
2. Jalankan `node scripts/u2.js`.
3. Periksa RabbitMQ bahwa lima pesan berada di queue `triage`.
4. Jalankan kembali `npm run worker`.
5. Tunggu sampai G01-G05 diproses.

## Urutan test

Target hasil pengujian:

| Uji | Skenario | Hasil yang diharapkan |
|---|---|---|
| U1 | Kirim N01-N20 | 20 assignment unik |
| U2 | Worker berhenti, kirim G01-G05, worker dipulihkan | Total assignment menjadi 25 |
| U3 | Replay N01-N05 dengan payload dan `event_id` yang sama | Total tetap 25, tanpa duplikasi |
| U4 | Kirim X01 tanpa `ticket_id`, lalu V01 valid | X01 rejected, V01 assigned, total menjadi 26 |

Script uji:

```powershell
node scripts/u1.js
node scripts/u2.js
node scripts/u3.js
node scripts/u4.js
```

## Cara memeriksa hasil

Periksa jumlah assignment dan pesan rejected:

```powershell
docker exec a05-postgres psql -U postgres -d capstone_a05 -P pager=off -c "SELECT COUNT(*) AS assignments FROM ticket_assignments; SELECT COUNT(*) AS rejected FROM rejected_messages;"
```

Periksa cakupan ID U1-U4:

```powershell
docker exec a05-postgres psql -U postgres -d capstone_a05 -P pager=off -c "SELECT event_id, ticket_id, service_queue, status FROM ticket_assignments ORDER BY event_id; SELECT event_id, reason FROM rejected_messages ORDER BY event_id;"
```

Hasil akhir yang diharapkan:

```text
ticket_assignments: 26 record
rejected_messages: 1 record, yaitu run01-X01
run01-X01: ticket_id wajib diisi
run01-V01: FINANCE / ASSIGNED
```

Periksa kondisi broker:

```powershell
docker exec a05-rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
docker exec a05-rabbitmq rabbitmqctl list_bindings source_name destination_name routing_key
```

Setelah worker selesai, queue `triage` seharusnya memiliki `messages_ready=0` dan `messages_unacknowledged=0`. Binding yang diharapkan adalah exchange `support` ke queue `triage` dengan routing key `ticket.created`.

Evidence lengkap tersedia di folder [evidence](evidence), dipisahkan menjadi U1, U2, U3, dan U4. Setiap folder berisi input, output persisten, perbandingan ID, log penting, dan observasi broker.

## Urutan stop

1. Hentikan gateway dengan `Ctrl+C`.
2. Hentikan worker dengan `Ctrl+C`.
3. Matikan container setelah selesai memeriksa data:

```powershell
docker compose down
```

Perintah tersebut mempertahankan volume database dan RabbitMQ. Untuk menghapus seluruh data pengujian secara sengaja, gunakan `docker compose down -v`.
