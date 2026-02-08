// ==================== TELEGRAM INTEGRATION BRIDGE ====================
// This file connects FileHunter with Telegram bot

// Global Telegram instance
let telegramBot = null;

class TelegramIntegration {
    constructor() {
        this.commands = {};
        this.messageQueue = [];
        this.isProcessing = false;
    }
    
    // Register command handlers
    registerCommand(command, handler) {
        this.commands[command.toLowerCase()] = handler;
        console.log(`✅ Command registered: ${command}`);
    }
    
    // Send message to Telegram
    async sendMessage(text, options = {}) {
        if (!TELEGRAM_CONFIG.BOT_TOKEN) {
            console.error('Bot token not configured');
            return null;
        }
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CONFIG.CHAT_ID,
                    text: text,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                    ...options
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Send message error:', error);
            return null;
        }
    }
    
    // Send file to Telegram
    async sendFile(file, filename, caption = '') {
        if (!TELEGRAM_CONFIG.BOT_TOKEN) {
            console.error('Bot token not configured');
            return null;
        }
        
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CONFIG.CHAT_ID);
        formData.append('document', file, filename);
        if (caption) formData.append('caption', caption);
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: formData
            });
            
            return await response.json();
        } catch (error) {
            console.error('Send file error:', error);
            return null;
        }
    }
    
    // Process incoming commands
    async processCommand(command, messageId) {
        const cmd = command.toLowerCase().trim();
        
        // Check registered commands
        if (this.commands[cmd]) {
            return await this.commands[cmd](command);
        }
        
        // Default commands
        switch(cmd) {
            case '/start':
                return `🚀 *System Active*\n\n` +
                       `🤖 Bot: ${TELEGRAM_CONFIG.APP_NAME}\n` +
                       `📱 Device: Online\n` +
                       `🕐 Time: ${new Date().toLocaleString()}\n\n` +
                       `Type /help for commands.`;
            
            case '/help':
                let helpText = `📋 *Available Commands*\n\n`;
                
                // Add registered commands
                Object.keys(this.commands).forEach(cmd => {
                    helpText += `• ${cmd}\n`;
                });
                
                helpText += `\n• /start - Start bot\n`;
                helpText += `• /help - This menu\n`;
                helpText += `• /status - System status`;
                
                return helpText;
            
            case '/status':
                return `⚙️ *System Status*\n\n` +
                       `• Bot: ${TELEGRAM_CONFIG.APP_NAME}\n` +
                       `• Token: ${TELEGRAM_CONFIG.BOT_TOKEN ? '✅ Set' : '❌ Missing'}\n` +
                       `• Chat ID: ${TELEGRAM_CONFIG.CHAT_ID ? '✅ Set' : '❌ Missing'}\n` +
                       `• Uptime: ${Math.floor(performance.now() / 1000)}s\n` +
                       `• Online: ${navigator.onLine ? '✅' : '❌'}\n` +
                       `• Time: ${new Date().toLocaleString()}`;
            
            default:
                return `❓ Unknown command: ${command}\n\n` +
                       `Type /help for available commands.`;
        }
    }
}

// Initialize Telegram integration
function initTelegramIntegration() {
    if (!telegramBot) {
        telegramBot = new TelegramIntegration();
        console.log('✅ Telegram Integration initialized');
    }
    return telegramBot;
}

// Auto-start Telegram integration
document.addEventListener('DOMContentLoaded', function() {
    initTelegramIntegration();
    
    // Start command polling
    startCommandPolling();
});

// Command polling function
async function startCommandPolling() {
    if (!TELEGRAM_CONFIG.BOT_TOKEN || !telegramBot) return;
    
    setInterval(async () => {
        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/getUpdates?offset=-1`);
            const data = await response.json();
            
            if (data.ok && data.result.length > 0) {
                const lastMsg = data.result[data.result.length - 1].message;
                if (lastMsg && lastMsg.text) {
                    const chatId = lastMsg.chat.id.toString();
                    
                    if (chatId === TELEGRAM_CONFIG.CHAT_ID) {
                        const response = await telegramBot.processCommand(lastMsg.text, lastMsg.message_id);
                        if (response) {
                            await telegramBot.sendMessage(response, {
                                reply_to_message_id: lastMsg.message_id
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.log('Polling error:', error);
        }
    }, 5000); // Check every 5 seconds
}

// Export for global use
window.TelegramIntegration = TelegramIntegration;
window.telegramBot = telegramBot;