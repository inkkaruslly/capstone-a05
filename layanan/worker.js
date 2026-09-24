require("dotenv").config();

const amqp = require("amqplib");
const { Pool } = require("pg");

// ================================
// Konfigurasi
// ================================
const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/capstone_a05";

const EXCHANGE = "support";
const QUEUE = "triage";
const ROUTING_KEY = "ticket.created";

const pool = new Pool({
  connectionString: DATABASE_URL,
});

// ================================
// Menentukan antrean layanan
// ================================
function classifyTicket(category) {
  if (category === "billing") {
    return "FINANCE";
  }

  if (category === "technical") {
    return "TECH";
  }

  return "GENERAL";
}

// ================================
// Menjalankan Worker
// ================================
async function startWorker() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE, "direct", {
    durable: true,
  });

  await channel.assertQueue(QUEUE, {
    durable: true,
  });

  await channel.bindQueue(
    QUEUE,
    EXCHANGE,
    ROUTING_KEY
  );

  // Worker memproses satu message dalam satu waktu
  channel.prefetch(1);

  console.log("====================================");
  console.log("A05 Worker started");
  console.log(`Queue : ${QUEUE}`);
  console.log("Waiting for ticket...");
  console.log("====================================");

  channel.consume(
    QUEUE,
    async (message) => {
      if (!message) return;

      const client = await pool.connect();

      try {
        const event = JSON.parse(
          message.content.toString()
        );

        console.log("\n------------------------------------");
        console.log("MESSAGE RECEIVED");
        console.log(JSON.stringify(event, null, 2));

        const {
          event_id,
          event_type,
          payload,
        } = event;

        // ================================
        // Validasi event
        // ================================
        if (
          !event_id ||
  event_type !== "ticket.created" ||
  !payload ||
  !payload.ticket_id
) {
  const reason = "ticket_id wajib diisi";

  console.log("------------------------------------");
  console.log("INVALID MESSAGE");
  console.log(`Event ID : ${event_id}`);
  console.log(`Reason   : ${reason}`);
  console.log("------------------------------------");

  await client.query(
    `
    INSERT INTO rejected_messages
      (event_id, reason, payload)
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
    `,
    [
      event_id,
      reason,
      JSON.stringify(event)
    ]
  );

  // Pesan invalid sudah dicatat.
  // Tidak perlu dikembalikan ke queue.
  channel.ack(message);

  return;
}

        const {
          ticket_id,
          customer_id,
          category,
          subject,
        } = payload;

        const serviceQueue =
          classifyTicket(category);

        // ================================
        // Transaksi database
        // ================================
        await client.query("BEGIN");

        // Cek apakah event sudah pernah diproses
        const existing = await client.query(
          `
          SELECT event_id
          FROM ticket_assignments
          WHERE event_id = $1
          `,
          [event_id]
        );

        if (existing.rowCount > 0) {
          // Event sudah pernah diproses
          await client.query("ROLLBACK");

          console.log(
            `DUPLICATE: ${event_id} sudah diproses`
          );

          // Duplicate tetap ACK karena tidak perlu
          // diproses lagi.
          channel.ack(message);

          return;
        }

        // ================================
        // Simpan assignment
        // ================================
        await client.query(
          `
          INSERT INTO ticket_assignments
          (
            event_id,
            ticket_id,
            customer_id,
            category,
            subject,
            service_queue,
            status
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          `,
          [
            event_id,
            ticket_id,
            customer_id,
            category,
            subject,
            serviceQueue,
            "ASSIGNED",
          ]
        );

        await client.query("COMMIT");

        // ================================
        // ACK SETELAH COMMIT
        // ================================
        channel.ack(message);

        console.log("TICKET ASSIGNED");
        console.log(`Event ID      : ${event_id}`);
        console.log(`Ticket ID     : ${ticket_id}`);
        console.log(`Category      : ${category}`);
        console.log(`Service Queue : ${serviceQueue}`);
        console.log(`Status        : ASSIGNED`);
        console.log("------------------------------------");

      } catch (error) {
        await client.query("ROLLBACK");

        console.error(
          "ERROR processing message:",
          error.message
        );

        // Requeue jika terjadi error teknis
        channel.nack(message, false, true);

      } finally {
        client.release();
      }
    },
    {
      noAck: false,
    }
  );
}

startWorker().catch((error) => {
  console.error("Worker gagal dijalankan:");
  console.error(error);
  process.exit(1);
});