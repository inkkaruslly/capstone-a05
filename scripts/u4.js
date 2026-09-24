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

async function runU4() {
  console.log("====================================");
  console.log("U4 - INVALID + VALID MESSAGE");
  console.log("====================================");

  // ====================================
  // X01 - INVALID
  // ticket_id sengaja DIHILANGKAN
  // ====================================

  const invalidTicket = {
    event_id: "run01-X01",
    customer_id: "CUS-X01",
    category: "billing",
    subject: "Tiket invalid tanpa ticket_id"
  };

  console.log("\nMengirim X01 (INVALID)...");

  const x01 = await sendTicket(invalidTicket);

  console.log(
    `run01-X01 | HTTP ${x01.statusCode}`
  );

  // Tunggu sebentar sebelum V01
  await new Promise(resolve =>
    setTimeout(resolve, 1000)
  );

  // ====================================
  // V01 - VALID
  // ====================================

  const validTicket = {
    event_id: "run01-V01",
    ticket_id: "TKT-V01",
    customer_id: "CUS-V01",
    category: "billing",
    subject: "Tiket valid setelah pesan invalid"
  };

  console.log("\nMengirim V01 (VALID)...");

  const v01 = await sendTicket(validTicket);

  console.log(
    `run01-V01 | HTTP ${v01.statusCode}`
  );

  console.log("\n====================================");
  console.log("U4 selesai.");
  console.log("Target:");
  console.log("X01 = rejected");
  console.log("V01 = FINANCE / ASSIGNED");
  console.log("Total assignment = 26");
  console.log("====================================");
}

runU4().catch(console.error);