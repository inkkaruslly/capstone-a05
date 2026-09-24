const http = require("http");

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

async function runU2() {
  console.log("====================================");
  console.log("U2 - CONSUMER FAILURE");
  console.log("Pastikan WORKER dalam keadaan STOP");
  console.log("Mengirim G01-G05");
  console.log("====================================");

  const categories = [
    "billing",
    "technical",
    "general",
    "billing",
    "technical",
  ];

  for (let i = 1; i <= 5; i++) {
    const number = String(i).padStart(2, "0");

    const ticket = {
      event_id: `run01-G${number}`,
      ticket_id: `TKT-G${number}`,
      customer_id: `CUS-G${number}`,
      category: categories[i - 1],
      subject: `Tiket pengujian gangguan G${number}`,
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
  console.log("5 event selesai dipublish.");
  console.log("JANGAN hidupkan worker dulu!");
  console.log("Periksa RabbitMQ Management.");
  console.log("====================================");
}

runU2();