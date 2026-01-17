// Load environment variables
const path = require('path');
const fs = require('fs');
const envPath = path.resolve(__dirname, '.env');

try {
    require('dotenv').config({ path: envPath });
} catch (e) {
    // dotenv optional
}

// Fallback env loader
if (!process.env.OPENAI_API_KEY && fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
    content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
            const key = trimmed.slice(0, idx);
            const val = trimmed.slice(idx + 1);
            if (!process.env[key]) process.env[key] = val;
        }
    });
}

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set.');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Keywords
const CONSULTATION_KEYWORDS = [
    'consultation', 'consult', 'meeting', 'discuss', 'talk', 'speak',
    'quote', 'pricing', 'cost', 'price', 'estimate', 'project',
    'book', 'schedule', 'appointment', 'contact', 'reach out',
    'interested', 'learn more', 'details'
];

const DOMAIN_KEYWORDS = [
    'das', 'distributed antenna', 'in-building', 'signal', 'coverage',
    'carrier', 'cellular', '5g', 'lte', 'public safety', 'radio',
    'wifi', 'wireless', 'linkwave', 'network', 'installation',
    'design', 'testing', 'maintenance', 'deployment', 'building',
    'tunnel', 'transit', 'hospital', 'stadium', 'campus', 'office',
    'rf', 'antenna', 'website', 'services', 'careers', 'projects',
    'team', 'faq', 'learn', 'company'
];

// Detect consultation intent
function detectConsultationIntent(message, history) {
    const lower = message.toLowerCase();
    if (CONSULTATION_KEYWORDS.some(k => lower.includes(k))) return true;
    
    const recent = history.slice(-3).filter(m => m.role === 'user');
    return recent.some(m => 
        CONSULTATION_KEYWORDS.some(k => (m.content || '').toLowerCase().includes(k))
    );
}

// Check domain context
function hasDomainContext(history) {
    const recent = history.slice(-3).filter(m => m.role === 'user');
    return recent.some(m => 
        DOMAIN_KEYWORDS.some(k => (m.content || '').toLowerCase().includes(k))
    );
}

// Off-topic check
function isOffTopic(message, history) {
    const lower = message.toLowerCase().trim();
    
    // Allow greetings
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening))\b/i.test(lower)) {
        return false;
    }
    
    // Allow meta follow-ups with context
    if (/^(list|summarize|summary|bullet|outline)/i.test(lower) && hasDomainContext(history)) {
        return false;
    }
    
    // On-topic if contains domain keyword
    if (DOMAIN_KEYWORDS.some(k => lower.includes(k))) {
        return false;
    }
    
    // On-topic if recent context exists
    return !hasDomainContext(history);
}

// Repeated question check
function isRepeated(message, history) {
    const norm = message.toLowerCase().trim();
    const recent = history.filter(m => m.role === 'user').slice(-3);
    if (recent.length < 3) return false;
    return recent.every(m => (m.content || '').toLowerCase().trim() === norm);
}

// Fix numbered lists - simple and robust
function fixNumberedLists(text) {
    const lines = text.split('\n');
    let num = 1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match any line starting with a number followed by . or ) and content
        // Examples: "1. text", "1) text", "  1. text", "**1.** text"
        const match = line.match(/^(\s*)(\*\*)?(\d+)([.\)])(\*\*)?\s+(.*)$/);
        
        if (match) {
            const indent = match[1];
            const content = match[6];
            lines[i] = `${indent}${num}. ${content}`;
            num++;
        } else if (line.trim() === '') {
            // Reset on empty line (new list)
            num = 1;
        }
    }
    
    return lines.join('\n');
}

// Fix spacing after punctuation
function fixSpacing(text) {
    return text.replace(/([.!?])([A-Za-z])/g, '$1 $2');
}

// Limit list to 3 items
function limitList(text) {
    const lines = text.split('\n');
    const result = [];
    let listCount = 0;
    let inList = false;
    
    for (const line of lines) {
        const isListItem = /^\s*(\d+[.\)]|[-*])\s+/.test(line);
        
        if (isListItem) {
            if (!inList) {
                inList = true;
                listCount = 0;
            }
            listCount++;
            if (listCount <= 3) {
                result.push(line);
            }
        } else {
            if (line.trim() === '' && inList) {
                inList = false;
                listCount = 0;
            }
            result.push(line);
        }
    }
    
    return result.join('\n');
}

// Remove contact info when consultation intent detected
function removeContactInfo(text) {
    return text
        .replace(/\b\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '')
        .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '')
        .replace(/\b(call|phone)\s+(us\s+)?(directly\s+)?(at\s*)?\b/gi, '')
        .replace(/\bor\s+you\s+can\s+call\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.!?])/g, '$1')
        .trim();
}

// Add a CTA nudge when consultation intent is detected
function appendConsultationCTA(text) {
    const base = (text || '').trim();
    const cta = 'Please click the "Book Consultation" button below to connect with our team.';
    if (!base) {
        return `Thanks for your interest. ${cta}`;
    }
    if (base.includes('Book Consultation')) {
        return base;
    }
    return `${base}\n\n${cta}`;
}

// System prompt
const SYSTEM_PROMPT = `You are the Linkwave Wireless assistant. You specialize in DAS (Distributed Antenna Systems), in-building wireless coverage, public safety radio systems, and related wireless infrastructure.

Your primary business goal is to guide users toward Linkwave services and sales opportunities, but your tone must remain casual, helpful, and non-pushy. Never pressure users into a consultation unless they ask for it or there is a smooth, natural opening.

The brand name is "Linkwave" (lowercase w). Always use that exact capitalization. Represent Linkwave as a professional, reliable, solutions-driven partner with grounded, credible statements.

Your mission is to provide accurate, practical, easy-to-understand DAS guidance. Explain coverage challenges, solution options, and next steps. Gently move the user forward without friction or pressure.

Keep answers clear, concise, and insightful. Use simple language first. Add technical depth only when the user asks or seems technical. Maintain a friendly, confident, professional voice that feels human and not scripted. Prefer short paragraphs and scannable structure.

Stay on-topic with DAS fundamentals, in-building coverage challenges, private 5G networks, public safety radio considerations, and the core Linkwave services: DAS systems, private 5G, and public safety radio. Also cover carrier coordination and neutral-host concepts, RF design and site surveys, installation and commissioning, testing, optimization, maintenance, and Linkwave offerings.

You can also help with Linkwave website questions about services, projects, team, contact, careers, learn, and FAQ pages. If a question is unrelated to DAS, wireless coverage, or the Linkwave website, politely redirect and offer relevant help. Do not answer unrelated questions beyond a brief redirect.

Sales guidance must be soft and contextual. Be helpful first, then introduce services only when relevant. Use gentle transitions like "If you want, I can outline how Linkwave typically approaches this" or "If this is a live project, I can help map next steps." Do not be forceful or repetitive. Do not push a consult unless the user asks or there is a natural opening.

When consultation intent is detected (mentions of quotes, pricing, timelines, proposals, site surveys, design support, deployments, or asking to speak with someone), acknowledge it and direct the user to click the "Book Consultation" button below. Do NOT ask for additional details in the conversation.

Response quality rules are strict. Answer the user's question directly first, then add context. Ask one brief clarifying question if critical details are missing (building type, size, carriers, public safety requirements, existing infrastructure). Keep responses practical and actionable rather than generic.

IMPORTANT: If a list is appropriate, provide at most 3 main points. Keep list items concise. When you write a numbered list, number them correctly as 1. 2. 3. not 1. 1. 1. Avoid overlong responses. Aim for clarity over volume.

Use short paragraphs of 1-3 sentences each. Avoid excessive punctuation or emojis. Do not provide legal, regulatory, or engineering sign-off advice. Give general guidance and recommend professional review when needed. Avoid guarantees about coverage, carrier approvals, or outcomes. If unsure, say so briefly and offer to help clarify.

If the user repeats the same question multiple times, politely ask them to rephrase or ask a different question. Do not claim certifications or specific project wins unless the user provides them. Do not derail into unrelated topics.`;

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Linkwave Chatbot API' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message required' });
        }

        // Check for repeated question
        if (isRepeated(message, conversationHistory)) {
            return res.json({
                response: "I want to be helpful, but I can't keep repeating the same answer. Could you rephrase or ask a different question about DAS, wireless coverage, or the Linkwave website?",
                consultationIntent: false
            });
        }

        const consultationIntent = detectConsultationIntent(message, conversationHistory);

        // Check for off-topic (allow consultation intent through)
        if (!consultationIntent && isOffTopic(message, conversationHistory)) {
            return res.json({
                response: "I'm here to help with DAS, wireless coverage, and Linkwave services. If you have a question about those topics or the website, I'd be happy to help.",
                consultationIntent: false
            });
        }

        // Build messages for OpenAI
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...conversationHistory.slice(-10),
            { role: 'user', content: message }
        ];

        // Call OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 500
        });

        let response = completion.choices[0].message.content;

        // Post-process response
        response = fixSpacing(response);
        response = fixNumberedLists(response);
        response = limitList(response);
        
        if (consultationIntent) {
            response = removeContactInfo(response);
            response = appendConsultationCTA(response);
        }

        res.json({ response, consultationIntent });

    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'An error occurred. Please try again later.'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Linkwave Chatbot API running on http://localhost:${PORT}`);
});
