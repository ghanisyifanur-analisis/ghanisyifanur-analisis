import "dotenv/config";
import express from "express";
import pg from "pg";

const app = express();
const port = Number(process.env.PORT || 3000);
const botName = process.env.BOT_NAME || "WhatsApp Assistant";
const botPhone = process.env.BOT_PHONE_NUMBER || "";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json({ limit: "1mb" }));

const replies = [
  { keys: ["halo", "hai", "hello", "hi"], reply: `Halo! 👋 Terima kasih sudah menghubungi ${botName}. Ada yang bisa saya bantu?` },
  { keys: ["harga", "biaya", "tarif"], reply: "Untuk informasi harga, silakan jelaskan layanan/produk yang Anda maksud. Admin akan membantu." },
  { keys: ["alamat", "lokasi"], reply: "Silakan sebutkan lokasi atau cabang yang ingin Anda ketahui." },
  { keys: ["admin", "manusia", "operator"], reply: "Baik, pesan Anda akan diteruskan kepada admin. Mohon tunggu balasan." },
  { keys: ["jam", "buka", "operasional"], reply: "Silakan informasikan hari atau tanggal yang ingin Anda tanyakan mengenai jam operasional." },
  { keys: ["terima kasih", "makasih", "thanks"], reply: "Sama-sama. Jika ada pertanyaan lain, silakan kirim pesan kembali. 😊" },
];

function buildReply(message = "") {
  const text = String(message).trim().toLowerCase();
  if (!text) return "";
  if (text === "/stop" || text === "stop") return "Baik, balasan otomatis dihentikan untuk percakapan ini. Hubungi admin jika ingin mengaktifkannya kembali.";
  const match = replies.find((item) => item.keys.some((key) => text.includes(key)));
  return match?.reply || "Terima kasih sudah menghubungi kami. Pesan Anda sudah diterima. Admin akan membalas secepatnya. Ketik *admin* jika ingin meminta bantuan admin.";
}

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "whatsapp-bot", database: "connected", botPhone: botPhone || "not-configured" });
  } catch {
    res.status(503).json({ status: "degraded", service: "whatsapp-bot", database: "disconnected" });
  }
});

// Endpoint kompatibel dengan fitur Server pada aplikasi WhatsAuto.
// Payload yang diharapkan: { app, sender, phone, message, group_name }.
// Respons: { reply: "..." }.
app.post("/reply", async (req, res) => {
  const { app: sourceApp = "unknown", sender = "", phone = "", message = "", group_name: groupName = "" } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Field 'message' wajib berupa teks." });
  }

  const reply = buildReply(message);
  try {
    await pool.query(
      "INSERT INTO inbound_messages (source_app, sender_name, sender_phone, group_name, message, reply) VALUES ($1,$2,$3,$4,$5,$6)",
      [String(sourceApp).slice(0,100), String(sender).slice(0,200), String(phone).slice(0,40), String(groupName).slice(0,200), message.slice(0,10000), reply]
    );
  } catch (error) {
    console.error("Gagal menyimpan pesan:", error.message);
    return res.status(503).json({ error: "Database belum siap. Coba lagi beberapa saat." });
  }
  return res.json({ reply });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`WhatsApp bot server aktif pada port ${port}`);
  console.log("Health: /health | WhatsAuto callback: POST /reply");
});
