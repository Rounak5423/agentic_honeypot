const express = require("express");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const app = express();
app.use(express.json());


// API KEY CONFIG

const API_KEY = "HACKATHON_DEMO_KEY";

// 🔐 API key middleware (MUST be after app creation)
app.use((req, res, next) => {
  const key = req.headers["x-api-key"];

  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }

  next();
});

const PORT = 3000;


// In-memory storage

const SESSIONS = {};


// Personas

const PERSONAS = {
  elderly_victim: {
    name: "Prince Hill",
    stallPhrases: [
      "Oh dear, this is all very confusing.",
      "My phone is acting strange again.",
      "Please be patient with me.",
      "I’m not very good with these things."
    ],
    questions: [
      "Why was my account blocked?",
      "Is this really from the bank?",
      "Can you explain it slowly?",
      "What should I do next?"
    ]
  }
};


// Logging helper

function logIntel(sessionId, from, message) {
  const logLine = `[${new Date().toISOString()}] ${sessionId} | ${from}: ${message}\n`;
  fs.appendFileSync("intel.log", logLine);
}


// Reply logic (NO repetition)

function pickUnused(options, used) {
  const unused = options.filter(o => !used.includes(o));
  if (unused.length === 0) return null;
  const choice = unused[Math.floor(Math.random() * unused.length)];
  used.push(choice);
  return choice;
}

function generateReply(session, incomingMessage) {
  const msg = incomingMessage.toLowerCase();

  // Safe exit for money intent
  if (
    msg.includes("send") ||
    msg.includes("money") ||
    msg.includes("upi") ||
    msg.includes("transfer")
  ) {
    return "I am not comfortable sharing financial details. I will go to the bank.";
  }

  const stall = pickUnused(
    session.persona.stallPhrases,
    session.usedStalls
  );

  const question = pickUnused(
    session.persona.questions,
    session.usedQuestions
  );

  if (!stall && !question) {
    return "Please give me some time, I am trying to understand this.";
  }

  return `${stall || ""} ${question || ""}`.trim();
}


// Routes


// Start session
app.post("/api/v1/session/start", (req, res) => {
  const { channel, persona } = req.body;

  if (!PERSONAS[persona]) {
    return res.status(400).json({ error: "Unknown persona" });
  }

  const sessionId = uuidv4();

  SESSIONS[sessionId] = {
    id: sessionId,
    channel,
    persona: PERSONAS[persona],
    messages: [],
    usedStalls: [],
    usedQuestions: [],
    createdAt: new Date()
  };

  console.log(`🧑 New session started with persona: ${PERSONAS[persona].name}`);

  res.json({
    session_id: sessionId,
    persona_name: PERSONAS[persona].name
  });
});

// Receive message
app.post("/api/v1/session/:id/message", async (req, res) => {
  const session = SESSIONS[req.params.id];
  if (!session) return res.status(404).json({ error: "Session not found" });

  const { from, message } = req.body;

  session.messages.push({
    from,
    message,
    timestamp: new Date()
  });

  logIntel(session.id, from, message);

  // Simulate human delay
  await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));

  const reply = generateReply(session, message);

  res.json({ reply });
});

// View intel
app.get("/api/v1/session/:id/intel", (req, res) => {
  const session = SESSIONS[req.params.id];
  if (!session) return res.status(404).json({ error: "Session not found" });

  res.json(session);
});

// Start server

app.listen(PORT, () => {
  console.log(`🛡️ Honeypot agent running at http://localhost:${PORT}`);
});
