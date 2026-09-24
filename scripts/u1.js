const http = require("http");

const HOST = "localhost";
const PORT = 3000;

// Dataset kategori dibuat bergantian agar
// FINANCE, TECH, dan GENERAL semuanya teruji.
const categories = [
  "billing",
  "technical",
  "general"
];

function sendTicket(ticket) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(ticket);

    const options = {
      hostname: HOST,
      port: PORT,
      path: "/tickets",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          body: data,
        });
      });
    });

    req.on("error", reject);

    req.write(body);
    req.end();
  });
}

async function runU1() {
  console.log("====================================");
  console.log("U1 - NORMAL PROCESSING");
  console.log("Mengirim 20 event N01-N20");
  console.log("====================================");

  for (let i = 1; i <= 20; i++) {
    const number = String(i).padStart(2, "0");

    const category =
      categories[(i - 1) % categories.length];

    const ticket = {
      event_id: `run01-N${number}`,
      ticket_id: `TKT-N${number}`,
      customer_id: `CUS-N${number}`,
      category: category,
      subject: `Tiket pengujian U1 N${number}`,
    };

    try {
      const response = await sendTicket(ticket);

      console.log(
        `${ticket.event_id} | ` +
        `${ticket.category} | ` +
        `HTTP ${response.statusCode}`
      );
    } catch (error) {
      console.error(
        `${ticket.event_id} GAGAL:`,
        error.message
      );
    }
  }

  console.log("====================================");
  console.log("U1 selesai.");
  console.log("Periksa Worker dan PostgreSQL.");
  console.log("====================================");
}

runU1();