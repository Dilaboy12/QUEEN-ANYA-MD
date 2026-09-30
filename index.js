const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

// ===== CONFIGURATION (මෙතනින් විස්තර වෙනස් කරගන්න) =====
const OWNER_NUMBER = "94740534738"; // ඔයාගේ Phone Number එක (Country code එකත් එක්ක + නැතුව)
const BOT_NAME = "queen Anya";
const OWNER_NAME = "Dilshan Ashinsa";
// ========================================================

async function startBot() {
    // Session State එක Save කරගැනීමට
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state
    });

    sock.ev.on('creds.update', saveCreds);

    // Connection Status Check කිරීම
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('සම්බන්ධතාවය බිඳ වැටුණා. නැවත උත්සාහ කරයි...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log(`✅ ${BOT_NAME} සාර්ථකව WhatsApp සමඟ සම්බන්ධ වුණා!`);
        }
    });

    // Messages Receive වෙන කොටස
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

            // .contact හෝ .highway Command එක දුන් විට vCard යැවීම
            if (text.toLowerCase() === '.contact' || text.toLowerCase() === '.highway' || text.toLowerCase() === '.owner') {
                
                // vCard Structure එක නිර්මාණය කිරීම
                const vcard = 'BEGIN:VCARD\n'
                    + 'VERSION:3.0\n'
                    + `FN:${OWNER_NAME}\n`
                    + `ORG:${BOT_NAME};\n`
                    + `TEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:+${OWNER_NUMBER.slice(0, 2)} ${OWNER_NUMBER.slice(2, 4)} ${OWNER_NUMBER.slice(4, 7)} ${OWNER_NUMBER.slice(7)}\n`
                    + 'END:VCARD';

                // Contact Message එක යැවීම
                await sock.sendMessage(from, {
                    contacts: {
                        displayName: OWNER_NAME,
                        contacts: [{ vcard }]
                    }
                });
            }

            // Simple Alive Check Command එකක්
            if (text.toLowerCase() === '.ping' || text.toLowerCase() === '.alive') {
                await sock.sendMessage(from, { text: `👋 ${BOT_NAME} සක්‍රියව පවතී!` });
            }

        } catch (err) {
            console.error('Error handling message:', err);
        }
    });
}

startBot();
