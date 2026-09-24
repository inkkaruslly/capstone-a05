const http = require("http");

const categories = [
  "billing",
  "technical",
  "general"
];

function sendTicket(ticket) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(ticket);

    const options = {
      hostname: "localhost",
      port: 3000,
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

async function runU3() {
  console.log("====================================");
  console.log("U3 - IDEMPOTENCY / REPLAY TEST");
  console.log("Replay N01-N05");
  console.log("====================================");

  for (let i = 1; i <= 5; i++) {
    const number = String(i).padStart(2, "0");

    // HARUS sama seperti data U1
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
        `${ticket.event_id} | REPLAY | HTTP ${response.statusCode}`
      );
    } catch (error) {
      console.error(
        `${ticket.event_id} GAGAL:`,
        error.message
      );
    }
  }

  console.log("====================================");
  console.log("Replay selesai.");
  console.log("Target database: tetap 25");
  console.log("====================================");
}

runU3();