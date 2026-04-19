const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeInMemoryStore, jidDecode } = require("@whiskeysockets/baileys");
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const moment = require('moment-timezone');
require('./config');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('King Void_MDX is Online!');
        }
    });

    // Handle Messages
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const type = Object.keys(msg.message)[0];
        const content = JSON.stringify(msg.message);
        const body = (type === 'conversation') ? msg.message.conversation : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : (type === 'imageMessage') ? msg.message.imageMessage.caption : (type === 'videoMessage') ? msg.message.videoMessage.caption : '';
        const isCmd = body.startsWith(global.prefix);
        const command = isCmd ? body.slice(1).trim().split(' ')[0].toLowerCase() : '';

        // TIME AND DATE
        const time = moment.tz('Africa/Lagos').format('HH:mm:ss');
        const date = moment.tz('Africa/Lagos').format('DD/MM/YYYY');
        const day = moment.tz('Africa/Lagos').format('dddd');

        // COMMANDS
        if (isCmd) {
            switch (command) {
                case 'owner':
                    const vcard = 'BEGIN:VCARD\n'
                        + 'VERSION:3.0\n'
                        + 'FN:KING VOID DEV\n'
                        + 'ORG:King Void_MDX;\n'
                        + 'TEL;type=CELL;type=VOICE;waid=2349154472946:+234 915 447 2946\n'
                        + 'END:VCARD';
                    
                    await sock.sendMessage(from, {
                        contacts: {
                            displayName: 'KING VOID DEV',
                            contacts: [{ vcard }]
                        }
                    }, { quoted: msg });
                    break;

                case 'menu':
                    const menuText = `
╔═━━━━━✦✦✦━━━━━═╗
👑 *KING VOID_MDX* 👑
╚═━━━━━✦✦✦━━━━━═╝
╔═━━━━━━━━━━━━━━━━━━
┃◆ *OWNER:* ${global.ownerName}
┃◆ *VERSION:* ${global.version}
┃◆ *USER:* @${msg.key.remoteJid.split('@')[0]}
┃◆ *TIME:* ${time}
┃◆ *TODAY:* ${day}
┃◆ *DATE:* ${date}
┃◆ *MODE:* 🌍 Public
╚═━━━━━━━━━━━━━━━━━━

┏━❐〔 🤖 *AI Menu* 〕━━┈❐
┃➺│ .ai
┃➺│ .gpt4
┃➺│ .codeai
┃➺│ .photoai
╰━━━━━━━━━━━━━━━━┈❐

┏━❐〔 📌 *Group Menu* 〕┈❐
┃➺│ .hidetag 
┃➺│ .tagall 
┃➺│ .promote  
┃➺│ .demote 
┃➺│ .kick @tag   
┃➺│ .add 234xxx 
┃➺│ .mute  
┃➺│ .unmute  
┃➺│ .grouplink   
┃➺│ .antilink    
┗━━━━━━━━━━━━━━━━┈❐

┏━━❐〔 👨‍💻 *Owner Menu* 〕┈❐
┃➺│ .menu
┃➺│ .owner 
┃➺│ .broadcast
┃➺│ .setpp
┃➺│ .block
┃➺│ .unblock
┃➺│ .alive
┃➺│ .ping
┗━━━━━━━━━━━━━━━━┈❐

┏━❐〔 ⛓️‍💥 *Download Menu* 〕┈❐ 
┃➺│ .play 
┃➺│ .ytsearch
┃➺│ .tiktok
┃➺│ .igdl
┃➺│ .fbdl
┃➺│ .tomp3
┃➺│ .tomp4
┗━━━━━━━━━━━━━━━━┈❐

⚙️ Powered by *KING VOID DEV*`;
                    await sock.sendMessage(from, { text: menuText, mentions: [msg.key.remoteJid] }, { quoted: msg });
                    break;
            }
        }
    });

    // Group Notifications (Welcome/Goodbye)
    sock.ev.on('group-participants.update', async (anu) => {
        const metadata = await sock.groupMetadata(anu.id);
        const time = moment.tz('Africa/Lagos').format('HH:mm:ss');
        const date = moment.tz('Africa/Lagos').format('DD/MM/YYYY');
        
        if (anu.action == 'add') {
            sock.sendMessage(anu.id, { text: `👋 Welcome @${anu.participants[0].split('@')[0]} to *${metadata.subject}*!\n\n📅 Date: ${date}\n⏰ Time: ${time}\n👥 Member count: ${metadata.participants.length}`, mentions: [anu.participants[0]] });
        } else if (anu.action == 'remove') {
            sock.sendMessage(anu.id, { text: `👋 Goodbye @${anu.participants[0].split('@')[0]} from *${metadata.subject}*!\n\n📅 Date: ${date}\n⏰ Time: ${time}\n👥 Members left: ${metadata.participants.length}`, mentions: [anu.participants[0]] });
        }
    });
}

startBot();
