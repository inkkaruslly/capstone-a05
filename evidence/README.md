# Evidence Pengujian

Folder ini berisi bukti pengujian untuk Capstone A05. Bukti dipisahkan berdasarkan unit uji agar setiap klaim dapat ditelusuri dari input, proses broker, sampai hasil persisten di PostgreSQL.

## Struktur

| Folder | Skenario | Hasil utama |
|---|---|---|
| `U1` | Normal processing N01-N20 | 20 assignment unik |
| `U2` | Worker berhenti lalu dipulihkan | G01-G05 tertahan di broker dan kemudian diproses; total 25 assignment |
| `U3` | Replay N01-N05 | Tidak ada assignment duplikat; total tetap 25 |
| `U4` | Pesan invalid dan valid | X01 ditolak, V01 diproses; total akhir 26 assignment |

## Isi setiap folder

- `01-input.md`: event atau kondisi awal pengujian.
- `02-output-persisten.md`: hasil yang tersimpan di PostgreSQL.
- `03-perbandingan-id.md`: perbandingan ID input dengan ID yang tersimpan.
- `04-log-penting.md`: potongan log gateway dan worker yang relevan.
- `05-observasi-broker.md`: exchange, routing key, queue, dan kondisi pesan RabbitMQ.

## Urutan membaca

1. Baca `01-input.md` untuk mengetahui data dan kondisi awal.
2. Cocokkan ID pada `03-perbandingan-id.md`.
3. Periksa hasil database pada `02-output-persisten.md`.
4. Gunakan `04-log-penting.md` untuk menghubungkan proses dengan output.
5. Gunakan `05-observasi-broker.md` untuk memeriksa buffering, routing, ACK, dan kondisi queue.

## Ringkasan hasil akhir

- `ticket_assignments`: 26 record.
- `rejected_messages`: 1 record untuk `run01-X01`.
- `run01-X01`: ditolak karena `ticket_id wajib diisi`.
- `run01-V01`: berhasil menjadi `FINANCE / ASSIGNED`.
- Queue `triage`: kosong setelah worker selesai memproses pesan.
