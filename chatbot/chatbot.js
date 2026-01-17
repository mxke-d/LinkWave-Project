// LinkWave Chatbot Frontend
class LinkWaveChatbot {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api/chat';
        this.isOpen = false;
        this.conversationHistory = [];
        this.storageKey = 'linkwave_chatbot_history';
        this.storageTimestampKey = 'linkwave_chatbot_timestamp';
        this.historyExpiryDays = 30; // Industry standard: 30 days
        this.loadHistory();
        this.init();
    }

    // Load chat history from localStorage
    loadHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            const timestamp = localStorage.getItem(this.storageTimestampKey);
            
            if (stored && timestamp) {
                const savedTime = parseInt(timestamp, 10);
                const now = Date.now();
                const daysSince = (now - savedTime) / (1000 * 60 * 60 * 24);
                
                // Only load if within expiry period
                if (daysSince < this.historyExpiryDays) {
                    this.conversationHistory = JSON.parse(stored);
                } else {
                    // Expired - clear old history
                    this.clearHistory();
                }
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.clearHistory();
        }
    }

    // Save chat history to localStorage
    saveHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.conversationHistory));
            localStorage.setItem(this.storageTimestampKey, Date.now().toString());
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    // Clear expired or invalid history
    clearHistory() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.storageTimestampKey);
        this.conversationHistory = [];
    }

    init() {
        this.createChatbotHTML();
        this.attachEventListeners();
        this.restoreMessages();
    }

    createChatbotHTML() {
        const chatbotHTML = `
            <div id="chatbot-container" class="chatbot-container">
                <div id="chatbot-window" class="chatbot-window">
                    <div class="chatbot-header">
                        <div class="chatbot-header-content">
                            <div class="chatbot-avatar">
                                <i class="fas fa-wifi" aria-hidden="true"></i>
                            </div>
                            <div class="chatbot-header-text">
                                <h3 class="chatbot-title">LinkWave Assistant</h3>
                                <p class="chatbot-subtitle">Ask me about DAS and wireless solutions</p>
                            </div>
                        </div>
                        <button id="chatbot-close" class="chatbot-close" aria-label="Close chatbot">
                            <i class="fas fa-times" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div id="chatbot-messages" class="chatbot-messages"></div>
                    <div class="chatbot-input-container">
                        <form id="chatbot-form" class="chatbot-form">
                            <input 
                                type="text" 
                                id="chatbot-input" 
                                class="chatbot-input" 
                                placeholder="Type your message..." 
                                autocomplete="off"
                                aria-label="Chatbot message input"
                            />
                            <button type="submit" class="chatbot-send" aria-label="Send message">
                                <i class="fas fa-paper-plane" aria-hidden="true"></i>
                            </button>
                        </form>
                        <div class="chatbot-quick-actions">
                            <button class="quick-action-btn" data-action="What is DAS?">What is DAS?</button>
                            <button class="quick-action-btn" data-action="Book a consultation">Book Consultation</button>
                            <button class="quick-action-btn" data-action="Tell me about your services">Our Services</button>
                        </div>
                    </div>
                </div>
                <button id="chatbot-toggle" class="chatbot-toggle" aria-label="Open chatbot">
                    <i class="fas fa-comments" aria-hidden="true"></i>
                    <span class="chatbot-toggle-text">Chat with us</span>
                </button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    // Restore messages from history
    restoreMessages() {
        const messagesContainer = document.getElementById('chatbot-messages');
        
        if (this.conversationHistory.length > 0) {
            // Restore all messages from history
            this.conversationHistory.forEach(msg => {
                if (msg.role === 'assistant') {
                    this.addMessage('assistant', msg.content, false);
                } else if (msg.role === 'user') {
                    this.addMessage('user', msg.content, false);
                }
            });
        } else {
            // Only show greeting if no history exists
            this.addMessage('assistant', 'Hello! I\'m your LinkWave assistant. I can answer questions about DAS systems, wireless solutions, and help you book a consultation with our team. How can I help you today?');
        }
    }

    attachEventListeners() {
        const toggle = document.getElementById('chatbot-toggle');
        const close = document.getElementById('chatbot-close');
        const form = document.getElementById('chatbot-form');
        const input = document.getElementById('chatbot-input');
        const quickActions = document.querySelectorAll('.quick-action-btn');

        toggle.addEventListener('click', () => this.toggleChatbot());
        close.addEventListener('click', () => this.closeChatbot());
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = input.value.trim();
            if (message) {
                this.sendMessage(message);
                input.value = '';
            }
        });

        quickActions.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                this.sendMessage(action);
            });
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeChatbot();
            }
        });
    }

    toggleChatbot() {
        this.isOpen = !this.isOpen;
        const container = document.getElementById('chatbot-container');
        const window = document.getElementById('chatbot-window');
        
        if (this.isOpen) {
            container.classList.add('chatbot-open');
            window.classList.add('chatbot-window-open');
            document.getElementById('chatbot-input').focus();
        } else {
            this.closeChatbot();
        }
    }

    closeChatbot() {
        this.isOpen = false;
        const container = document.getElementById('chatbot-container');
        const window = document.getElementById('chatbot-window');
        container.classList.remove('chatbot-open');
        window.classList.remove('chatbot-window-open');
    }

    // Convert markdown to HTML for proper formatting
    markdownToHTML(text) {
        if (!text) return '';
        
        // Escape HTML to prevent XSS
        const escapeHtml = (unsafe) => {
            const div = document.createElement('div');
            div.textContent = unsafe;
            return div.innerHTML;
        };
        
        const lines = text.split('\n');
        const result = [];
        let currentList = null; // 'ol', 'ul', or null
        let listItems = [];
        
        const closeCurrentList = () => {
            if (currentList && listItems.length > 0) {
                result.push(`<${currentList}>${listItems.join('')}</${currentList}>`);
                listItems = [];
            }
            currentList = null;
        };
        
        for (let line of lines) {
            const trimmed = line.trim();
            
            // Check for numbered list (1. 2. 3.)
            const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
            if (numberedMatch) {
                if (currentList !== 'ol') {
                    closeCurrentList();
                    currentList = 'ol';
                }
                // Process bold within list item
                let itemText = escapeHtml(numberedMatch[2]);
                itemText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                listItems.push(`<li>${itemText}</li>`);
                continue;
            }
            
            // Check for bullet list (- or *)
            const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
            if (bulletMatch) {
                if (currentList !== 'ul') {
                    closeCurrentList();
                    currentList = 'ul';
                }
                // Process bold within list item
                let itemText = escapeHtml(bulletMatch[1]);
                itemText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                listItems.push(`<li>${itemText}</li>`);
                continue;
            }
            
            // Not a list item - close any open list
            closeCurrentList();
            
            // Regular text line
            if (trimmed) {
                let processedLine = escapeHtml(trimmed);
                // Convert bold **text**
                processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                result.push(processedLine);
            }
        }
        
        // Close any remaining list
        closeCurrentList();
        
        // Join lines with proper spacing
        const joined = result
            .filter(line => line.trim())
            .map((line, index, array) => {
                const prev = array[index - 1];
                // Add spacing between lists and text
                if (index > 0 && prev && (prev.includes('<ol>') || prev.includes('<ul>'))) {
                    if (line && !line.startsWith('<')) {
                        return '<br>' + line;
                    }
                }
                return line;
            })
            .join('');
        
        // Wrap in paragraph tags if there's content and no lists
        if (joined && !joined.includes('<ol>') && !joined.includes('<ul>')) {
            return `<p>${joined}</p>`;
        }
        
        return joined || '';
    }

    addMessage(role, content, isTyping = false) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message chatbot-message-${role}`;
        
        if (isTyping) {
            messageDiv.classList.add('chatbot-message-typing');
            messageDiv.innerHTML = `
                <div class="chatbot-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;
        } else {
            messageDiv.innerHTML = this.markdownToHTML(content);
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageDiv;
    }

    async addMessageWithTyping(role, content) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message chatbot-message-${role}`;
        messagesContainer.appendChild(messageDiv);
        
        const typingSpeed = 20; // milliseconds per character
        
        // Split content into lines to process more intelligently
        const lines = content.split('\n');
        let displayedLines = [];
        
        // Type out line by line for better list handling
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const needsNewline = lineIndex < lines.length - 1;
            
            // Type out this line character by character
            for (let i = 0; i <= line.length; i++) {
                const currentLine = line.substring(0, i);
                const partialContent = [...displayedLines, currentLine].join('\n');
                messageDiv.innerHTML = this.markdownToHTML(partialContent);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                await new Promise(resolve => setTimeout(resolve, typingSpeed));
            }
            
            displayedLines.push(line);
        }
        
        // Final render to ensure all markdown is properly formatted
        messageDiv.innerHTML = this.markdownToHTML(content);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageDiv;
    }

    async sendMessage(message) {
        // Add user message
        this.addMessage('user', message);
        this.conversationHistory.push({ role: 'user', content: message });
        this.saveHistory(); // Save after each message

        // Show typing indicator
        const typingMessage = this.addMessage('assistant', '', true);

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    conversationHistory: this.conversationHistory
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            
            // Remove typing indicator
            typingMessage.remove();
            
            // Add assistant response with typing effect
            await this.addMessageWithTyping('assistant', data.response);
            this.conversationHistory.push({ role: 'assistant', content: data.response });
            this.saveHistory(); // Save after each message

            // Show consultation CTA if intent detected
            if (data.consultationIntent) {
                setTimeout(() => {
                    this.showConsultationCTA();
                }, 500);
            }

        } catch (error) {
            console.error('Chatbot error:', error);
            typingMessage.remove();
            this.addMessage('assistant', 'I apologize, but I\'m having trouble connecting right now. Please contact us directly at 1-888-859-2673 or info@linkwavewireless.com for immediate assistance.');
        }
    }

    showConsultationCTA() {
        const messagesContainer = document.getElementById('chatbot-messages');
        const ctaDiv = document.createElement('div');
        ctaDiv.className = 'chatbot-cta';
        ctaDiv.innerHTML = `
            <div class="chatbot-cta-content">
                <p>Ready to discuss your wireless needs?</p>
                <div class="chatbot-cta-buttons">
                    <a href="contact_us.html" class="chatbot-cta-btn chatbot-cta-btn-primary">Book Consultation</a>
                    <a href="tel:1-888-859-2673" class="chatbot-cta-btn chatbot-cta-btn-secondary">Call Us: 1-888-859-2673</a>
                </div>
            </div>
        `;
        messagesContainer.appendChild(ctaDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof LinkWaveChatbot !== 'undefined') {
        window.linkwaveChatbot = new LinkWaveChatbot();
    }
});
