const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers
} = require("@whiskeysockets/baileys");

const P = require("pino");
const express = require("express");
const fs = require("fs");
const path = require("path");

const config = require("./config");
const { commands } = require("./command");

const app = express();

app.get("/", (req, res) => {
    res.send(`
        <html>
        <head>
            <title>${config.BOT_NAME}</title>
            <meta name="viewport" content="width=device-width,initial-scale=1">
        </head>
        <body style="background:#080808;color:white;text-align:center;font-family:Arial;padding-top:80px">
            <h1>🤖 ${config.BOT_NAME}</h1>
            <h2>🟢 Bot Server Online</h2>
            <p>Owner: ${config.OWNER_NAME}</p>
        </body>
        </html>
    `);
});

app.get("/api/status", (req, res) => {
    res.json({
        bot: config.BOT_NAME,
        owner: config.OWNER_NAME,
        status: "online",
        uptime: process.uptime(),
        memory: process.memoryUsage().rss,
        commands: commands.length
    });
});

app.listen(config.PORT, () => {
    console.log(`🌐 Server running on port ${config.PORT}`);
});

async function startBot() {

    console.log("🚀 Starting WhatsApp Bot...");

    const sessionPath = path.join(__dirname, "sessions");

    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    const {
        state,
        saveCreds
    } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
        auth: state,

        logger: P({
            level: "silent"
        }),

        browser: Browsers.macOS("Chrome"),

        printQRInTerminal: false,

        syncFullHistory: false,

        generateHighQualityLinkPreview: true
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {

        const {
            connection,
            lastDisconnect
        } = update;

        if (connection === "open") {

            console.log("");
            console.log("╭────────────────────────────╮");
            console.log("│      🤖 BOT CONNECTED       │");
            console.log("├────────────────────────────┤");
            console.log(`│ NAME   : ${config.BOT_NAME}`);
            console.log(`│ OWNER  : ${config.OWNER_NAME}`);
            console.log("│ STATUS : ONLINE 🟢");
            console.log("╰────────────────────────────╯");
            console.log("");

        }

        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            console.log("❌ WhatsApp connection closed.");

            if (shouldReconnect) {
                console.log("🔄 Reconnecting...");
                setTimeout(startBot, 5000);
            } else {
                console.log("🔐 Session logged out.");
            }
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0];

        if (!msg || !msg.message) return;

        try {

            const jid = msg.key.remoteJid;

            if (!jid) return;

            const messageType =
                Object.keys(msg.message)[0];

            let text = "";

            if (messageType === "conversation") {
                text = msg.message.conversation;
            }

            if (messageType === "extendedTextMessage") {
                text =
                    msg.message.extendedTextMessage.text;
            }

            if (!text) return;

            if (!text.startsWith(config.PREFIX)) return;

            const args = text
                .slice(config.PREFIX.length)
                .trim()
                .split(/\s+/);

            const commandName =
                args.shift()?.toLowerCase();

            if (!commandName) return;

            const command = commands.find((cmd) => {

                if (cmd.pattern instanceof RegExp) {
                    return cmd.pattern.test(commandName);
                }

                return String(cmd.pattern)
                    .toLowerCase() === commandName;
            });

            if (!command) return;

            if (config.AUTO_READ) {
                await sock.readMessages([msg.key]);
            }

            await command.handler(
                sock,
                msg,
                {
                    args,
                    text,
                    command: commandName,
                    jid
                }
            );

        } catch (error) {

            console.error(
                "Command Error:",
                error
            );

            try {
                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        text:
                            "❌ Command එක execute කරන්න බැරි වුණා."
                    }
                );
            } catch {}
        }
    });
}

startBot().catch((error) => {
    console.error("❌ Bot startup error:", error);
});
