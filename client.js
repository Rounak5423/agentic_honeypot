const readline = require("readline");

// For Node.js fetch support
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const BASE_URL = "http://localhost:3000"; // or your deployed URL
const API_KEY = "HACKATHON_DEMO_KEY";

// Start session function
async function startSession() {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/session/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
      },
      body: JSON.stringify({
        channel: "web",
        persona: "elderly_victim"
      })
    });

    const data = await res.json();
    if (res.status !== 200) {
      console.error("Error starting session:", data);
      return;
    }

    console.log(`🧑 Persona: ${data.persona_name}`);
    console.log("💬 Start typing scam messages. Press Ctrl+C to exit.\n");

    return data.session_id;
  } catch (err) {
    console.error("Error:", err);
  }
}

// Send message to server
async function sendMessage(sessionId, message) {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/session/${sessionId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
      },
      body: JSON.stringify({
        from: "scammer",
        message
      })
    });

    const data = await res.json();

    if (res.status === 401) {
      console.log("❌ Invalid API key!");
    } else if (res.status !== 200) {
      console.log("❌ Error:", data);
    } else {
      console.log("🤖 Agent:", data.reply);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

// Interactive CLI
async function main() {
  const sessionId = await startSession();
  if (!sessionId) return;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("line", async (input) => {
    if (!input.trim()) return;
    await sendMessage(sessionId, input.trim());
  });
}

main();
