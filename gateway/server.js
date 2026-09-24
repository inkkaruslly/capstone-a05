require("dotenv").config();

const express = require("express");
const amqp = require("amqplib");
const { randomUUID } = require("crypto");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

const EXCHANGE = "support";
const QUEUE = "triage";
const ROUTING_KEY = "ticket.created";

let connection;
let channel;

// ======================================================
// Koneksi ke RabbitMQ
// ======================================================
async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);

    // Confirm channel agar producer dapat memastikan
    // broker menerima publish.
    channel = await connection.createConfirmChannel();

    // Exchange durable
    await channel.assertExchange(EXCHANGE, "direct", {
      durable: true,
    });

    // Queue durable
    await channel.assertQueue(QUEUE, {
      durable: true,
    });

    // Binding queue ke exchange
    await channel.bindQueue(
      QUEUE,
      EXCHANGE,
      ROUTING_KEY
    );

    console.log("====================================");
    console.log("RabbitMQ connected");
    console.log(`Exchange    : ${EXCHANGE}`);
    console.log(`Queue       : ${QUEUE}`);
    console.log(`Routing Key : ${ROUTING_KEY}`);
    console.log("====================================");
  } catch (error) {
    console.error("Gagal terhubung ke RabbitMQ:");
    console.error(error);

    process.exit(1);
  }
}

// ======================================================
// Health check
// ======================================================
app.get("/", (req, res) => {
  res.status(200).json({
    service: "A05 Ticket Producer",
    status: "UP",
  });
});

// ======================================================
// Endpoint untuk membuat tiket
// ======================================================
app.post("/tickets", async (req, res) => {
  try {
    const {
      event_id,
      ticket_id,
      customer_id,
      category,
      subject,
    } = req.body;

    // --------------------------------------------------
    // Validasi minimum
    // --------------------------------------------------

    if (!ticket_id) {
      return res.status(400).json({
        status: "REJECTED",
        message: "ticket_id wajib diisi",
      });
    }

    if (!category) {
      return res.status(400).json({
        status: "REJECTED",
        message: "category wajib diisi",
      });
    }

    if (!subject) {
      return res.status(400).json({
        status: "REJECTED",
        message: "subject wajib diisi",
      });
    }

    // --------------------------------------------------
    // Membentuk event
    // --------------------------------------------------

    const event = {
      // Jika event_id diberikan oleh script pengujian,
      // gunakan event_id tersebut.
      // Jika tidak, buat UUID.
      event_id: event_id || randomUUID(),

      event_type: "ticket.created",

      occurred_at: new Date().toISOString(),

      payload: {
        ticket_id,
        customer_id: customer_id || null,
        category,
        subject,
      },
    };

    const message = Buffer.from(JSON.stringify(event));

    // --------------------------------------------------
    // Publish ke RabbitMQ
    // --------------------------------------------------

    channel.publish(
      EXCHANGE,
      ROUTING_KEY,
      message,
      {
        persistent: true,
        contentType: "application/json",

        // mandatory membantu mendeteksi pesan
        // yang tidak berhasil diroute.
        mandatory: true,
      }
    );

    // Tunggu publisher confirm dari RabbitMQ
    await channel.waitForConfirms();

    console.log("------------------------------------");
    console.log("EVENT PUBLISHED");
    console.log(JSON.stringify(event, null, 2));
    console.log("------------------------------------");

    return res.status(202).json({
      status: "DITERIMA_BROKER",
      message: "Tiket berhasil dipublish ke RabbitMQ",
      event,
    });

  } catch (error) {
    console.error("Publish error:", error);

    return res.status(500).json({
      status: "ERROR",
      message: "Gagal mempublish tiket",
    });
  }
});

// ======================================================
// Menjalankan aplikasi
// ======================================================

async function start() {
  await connectRabbitMQ();

  app.listen(PORT, () => {
    console.log(`A05 Gateway berjalan di http://localhost:${PORT}`);
    console.log(`POST tiket: http://localhost:${PORT}/tickets`);
  });
}

start();