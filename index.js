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

/* ================================
   🌐 WEB SERVER
================================ */

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>${config.BOT_NAME}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <style>
        body {
            margin: 0;
            background: #050505;
            color: white;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            text-align: center;
        }

        .box {
            width: 90%;
            max-width: 500px;
            padding: 30px;
            border: 1px solid #333;
            border-radius: 20px;
            background: #101010;
            box-shadow: 0 0 30px rgba(255,255,255,0.08);
        }

        h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .online {
            color: #00ff88;
            font-size: 18px;
        }

        .info {
            margin-top: 20px;
            line-height: 1.8;
            color: #ccc;
        }
    </style>
</head>

<body>

<div class="box">

    <h1>👑 ${config.BOT_NAME}</h1>

    <div class="online">
        🟢 BOT SERVER ONLINE
    </div>

    <div class="info">
        👤 Owner: ${config.OWNER_NAME}<br>
        ⚡ Prefix: ${config.PREFIX}<br>
        🧩 Commands: ${commands.length}<br>
        🔐 Session: ${config.SESSION_ID ? "Configured" : "Not configured"}
    </div>

</div>

</body>
</html>
    `);
});


/* ================================
   📊 API STATUS
================================ */

app.get("/api/status", (req, res) => {

    const memory = process.memoryUsage();

    res.json({
        bot: config.BOT_NAME,
        owner: config.OWNER_NAME,
        ownerNumber: config.OWNER_NUMBER
            ? "Configured"
            : "Not configured",

        status: "online",

        uptime: Math.floor(process.uptime()),

        memory: {
            rss: memory.rss,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal
        },

        commands: commands.length,

        session: config.SESSION_ID
            ? "configured"
            : "not configured"
    });
});


/* ================================
   🚀 START WEB SERVER
================================ */

app.listen(config.PORT, () => {

    console.log("");
    console.log("╭────────────────────────────────╮");
    console.log("│        👑 QUEEN ANYA            │");
    console.log("├────────────────────────────────┤");
    console.log(`│ 🌐 PORT    : ${config.PORT}`);
    console.log(`│ 👤 OWNER   : ${config.OWNER_NAME}`);
    console.log(
        `│ 📱 NUMBER  : ${
            config.OWNER_NUMBER
                ? "CONFIGURED"
                : "NOT CONFIGURED"
        }`
    );
    console.log("│ 🟢 SERVER  : ONLINE");
    console.log("╰────────────────────────────────╯");
    console.log("");
});


/* ================================
   👤 OWNER CHECK
================================ */

function isOwner(msg) {

    if (!config.OWNER_NUMBER) {
        return false;
    }

    const ownerNumber = String(config.OWNER_NUMBER)
        .replace(/\D/g, "");

    const sender =
        msg.key.participant ||
        msg.key.remoteJid ||
        "";

    const senderNumber = String(sender)
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "");

    return senderNumber === ownerNumber;
}


/* ================================
   🤖 START BOT
================================ */

async function startBot() {

    console.log("");
    console.log("🚀 Starting QUEEN ANYA...");
    console.log("");


    /* ================================
       📁 SESSION DIRECTORY
    ================================= */

    const sessionPath =
        path.join(__dirname, "sessions");


    if (!fs.existsSync(sessionPath)) {

        fs.mkdirSync(
            sessionPath,
            {
                recursive: true
            }
        );

        console.log("📁 Session folder created.");
    }


    /* ================================
       🔐 AUTH STATE
    ================================= */

    const {
        state,
        saveCreds
    } = await useMultiFileAuthState(
        sessionPath
    );


    /* ================================
       📱 WHATSAPP SOCKET
    ================================= */

    const sock = makeWASocket({

        auth: state,

        logger: P({
            level: "silent"
        }),

        browser:
            Browsers.macOS("Chrome"),

        printQRInTerminal: false,

        syncFullHistory: false,

        generateHighQualityLinkPreview: true
    });


    /* ================================
       💾 SAVE SESSION
    ================================= */

    sock.ev.on(
        "creds.update",
        saveCreds
    );


    /* ================================
       🔌 CONNECTION UPDATE
    ================================= */

    sock.ev.on(
        "connection.update",
        async (update) => {

            const {
                connection,
                lastDisconnect
            } = update;


            /* ============================
               🟢 CONNECTED
            ============================ */

            if (connection === "open") {

                console.log("");

                console.log(
                    "╭────────────────────────────────╮"
                );

                console.log(
                    "│       👑 QUEEN ANYA             │"
                );

                console.log(
                    "├────────────────────────────────┤"
                );

                console.log(
                    "│ 🟢 STATUS : CONNECTED           │"
                );

                console.log(
                    `│ 👤 OWNER : ${config.OWNER_NAME}`
                );

                console.log(
                    `│ 📱 OWNER : ${
                        config.OWNER_NUMBER
                            ? "CONFIGURED"
                            : "NOT SET"
                    }`
                );

                console.log(
                    `│ ⚡ PREFIX: ${config.PREFIX}`
                );

                console.log(
                    "╰────────────────────────────────╯"
                );

                console.log("");
            }


            /* ============================
               🔴 CONNECTION CLOSED
            ============================ */

            if (connection === "close") {

                const statusCode =
                    lastDisconnect
                        ?.error
                        ?.output
                        ?.statusCode;


                const shouldReconnect =
                    statusCode !==
                    DisconnectReason.loggedOut;


                console.log("");
                console.log(
                    "❌ WhatsApp connection closed."
                );


                if (shouldReconnect) {

                    console.log(
                        "🔄 Reconnecting in 5 seconds..."
                    );

                    setTimeout(
                        startBot,
                        5000
                    );

                } else {

                    console.log(
                        "🔐 WhatsApp session logged out."
                    );

                    console.log(
                        "⚠️ Please create a new session."
                    );
                }
            }
        }
    );


    /* ================================
       💬 MESSAGE HANDLER
    ================================= */

    sock.ev.on(
        "messages.upsert",
        async ({ messages }) => {

            const msg = messages[0];


            if (!msg) return;

            if (!msg.message) return;


            try {

                const jid =
                    msg.key.remoteJid;


                if (!jid) return;


                /* ========================
                   📝 MESSAGE TEXT
                ======================== */

                const messageType =
                    Object.keys(
                        msg.message
                    )[0];


                let text = "";


                if (
                    messageType ===
                    "conversation"
                ) {

                    text =
                        msg.message
                            .conversation;
                }


                if (
                    messageType ===
                    "extendedTextMessage"
                ) {

                    text =
                        msg.message
                            .extendedTextMessage
                            .text;
                }


                if (
                    messageType ===
                    "imageMessage"
                ) {

                    text =
                        msg.message
                            .imageMessage
                            .caption ||
                        "";
                }


                if (
                    messageType ===
                    "videoMessage"
                ) {

                    text =
                        msg.message
                            .videoMessage
                            .caption ||
                        "";
                }


                if (!text) return;


                text =
                    String(text).trim();


                /* ========================
                   ⚡ PREFIX CHECK
                ======================== */

                if (
                    !text.startsWith(
                        config.PREFIX
                    )
                ) {
                    return;
                }


                /* ========================
                   🔎 COMMAND PARSE
                ======================== */

                const withoutPrefix =
                    text.slice(
                        config.PREFIX.length
                    ).trim();


                if (!withoutPrefix) return;


                const parts =
                    withoutPrefix
                        .split(/\s+/);


                const commandName =
                    parts.shift()
                        ?.toLowerCase();


                const args = parts;


                if (!commandName) return;


                /* ========================
                   🔍 FIND COMMAND
                ======================== */

                const command =
                    commands.find((cmd) => {

                        if (
                            cmd.pattern
                            instanceof RegExp
                        ) {

                            return cmd.pattern.test(
                                commandName
                            );
                        }


                        return String(
                            cmd.pattern
                        )
                        .toLowerCase() ===
                        commandName;
                    });


                if (!command) return;


                /* ========================
                   👤 OWNER STATUS
                ======================== */

                const ownerStatus =
                    isOwner(msg);


                /* ========================
                   📖 AUTO READ
                ======================== */

                if (
                    config.AUTO_READ
                ) {

                    try {

                        await sock.readMessages(
                            [msg.key]
                        );

                    } catch {}
                }


                /* ========================
                   ⚙️ COMMAND EXECUTION
                ======================== */

                await command.handler(
                    sock,
                    msg,
                    {
                        args,

                        text,

                        command:
                            commandName,

                        jid,

                        isOwner:
                            ownerStatus,

                        owner:
                            ownerStatus,

                        config
                    }
                );
            }


            /* ============================
               ❌ COMMAND ERROR
            ============================ */

            catch (error) {

                console.error(
                    "❌ Command Error:",
                    error
                );


                try {

                    await sock.sendMessage(
                        msg.key.remoteJid,
                        {
                            text:
                                `❌ Command execute කරන්න බැරි වුණා.\n\n👑 ${config.BOT_NAME}`
                        },
                        {
                            quoted: msg
                        }
                    );

                } catch {}
            }
        }
    );
}


/* ================================
   ▶️ START
================================ */

startBot().catch(
    (error) => {

        console.error(
            "❌ Bot startup error:",
            error
        );

        setTimeout(
            startBot,
            5000
        );
    }
);
