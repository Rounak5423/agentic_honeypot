const express = require("express");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const app = express();
app.use(express.json());



app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Agentic Honeypot API",
    message: "Service is running"
  });
});


const API_KEY = "HACKATHON_DEMO_KEY";


app.use((req, res, next) => {
  // allow health check without API key
  if (req.path === "/") return next();

  const key = req.headers["x-api-key"];
  if (!key || key !== "HACKATHON_DEMO_KEY") {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  next();
});


const PORT = 3000;




const SESSIONS = {};



const PERSONAS = {
  elderly_victim: {
    name: "Prince yadav",
    stallPhrases: [
      " this is all very confusing.",
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




function logIntel(sessionId, from, message) {
  const logLine = `[${new Date().toISOString()}] ${sessionId} | ${from}: ${message}\n`;
  fs.appendFileSync("intel.log", logLine);
}



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

  console.log(` New session started with persona: ${PERSONAS[persona].name}`);

  res.json({
    session_id: sessionId,
    persona_name: PERSONAS[persona].name
  });
});


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


  await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));

  const reply = generateReply(session, message);

  res.json({ reply });
});


app.get("/api/v1/session/:id/intel", (req, res) => {
  const session = SESSIONS[req.params.id];
  if (!session) return res.status(404).json({ error: "Session not found" });

  res.json(session);
});

app.listen(PORT, () => {
  console.log(` Honeypot agent running at http://localhost:${PORT}`);
});
