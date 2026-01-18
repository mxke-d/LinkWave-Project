# LinkWave Chatbot Setup Guide

This guide will help you set up and run the LinkWave hybrid AI + ruleset chatbot.

## Features

- **Hybrid AI + Ruleset**: Combines OpenAI GPT with a ruleset system for quick DAS answers
- **Consultation Funnel**: Automatically detects consultation intent and guides users to book consultations
- **Brand-Aligned Design**: Uses LinkWave brand colors (Pumpkin #F57822, Dark Purple #200029, Sandy Orange #FF9E4E)
- **Responsive**: Works on desktop, tablet, and mobile devices
- **Secure**: API key stored on backend server, never exposed to client

## Setup Instructions

### 1. Install Dependencies

**IMPORTANT:** You must navigate to the `chatbot` folder first before running npm commands, since that's where `package.json` is located.

From the project root directory:
```bash
cd chatbot
npm install
```

Or if you're already in the chatbot folder, just run:
```bash
npm install
```

This will install:
- `express` - Web server framework
- `cors` - Cross-Origin Resource Sharing middleware
- `openai` - OpenAI API client

### 2. Start the Backend Server

**Make sure you're in the `chatbot` folder**, then start the API server:

```bash
cd chatbot  # If not already in chatbot folder
npm start
```

Or for development with auto-restart:

```bash
cd chatbot  # If not already in chatbot folder
npm run dev
```

The server will run on `http://localhost:3000`

### 3. Verify Server is Running

Open your browser and visit:
```
http://localhost:3000/health
```

You should see:
```json
{"status":"ok","service":"LinkWave Chatbot API"}
```

### 4. Open Your Website

Open any HTML page in your browser (e.g., `../index.html` from the chatbot folder, or `index.html` from the project root). The chatbot should appear as a floating button in the bottom-right corner.

## How It Works

### Ruleset System

The chatbot uses a ruleset to quickly answer common DAS questions:
- "What is DAS?"
- Questions about coverage, carriers, industries, services
- Public safety information

### AI Enhancement

For questions not covered by the ruleset, the chatbot uses OpenAI GPT-4o-mini to provide intelligent, contextual responses.

### Consultation Detection

The system automatically detects when users are interested in:
- Booking consultations
- Getting quotes
- Discussing projects
- Needing help

When consultation intent is detected, the chatbot:
1. Provides relevant information
2. Shows a call-to-action with consultation booking options
3. Guides users to the contact form or phone number

## Integration

The chatbot is already integrated into `../index.html`. To add it to other pages:

1. Add the chatbot script before the closing `</body>` tag:
```html
<script src="chatbot/chatbot.js"></script>
```

2. The CSS styles are already in `../style.css`, so no additional styling is needed.

## API Configuration

The API key is currently stored in `server.js`. For production, consider:

1. Using environment variables:
```javascript
apiKey: process.env.OPENAI_API_KEY
```

2. Creating a `.env` file (make sure to add it to `.gitignore`):
```
OPENAI_API_KEY=your-api-key-here
```

3. Using a package like `dotenv`:
```bash
npm install dotenv
```

Then at the top of `server.js`:
```javascript
require('dotenv').config();
```

## Customization

### Changing the Chatbot API URL

If you deploy the server to a different URL, update `chatbot.js`:

```javascript
this.apiUrl = 'https://your-domain.com/api/chat';
```

### Modifying the Ruleset

Edit the `DAS_KNOWLEDGE` object in `server.js` to add or modify quick answers.

### Adjusting Consultation Keywords

Modify the `CONSULTATION_KEYWORDS` array in `server.js` to change how consultation intent is detected.

## Troubleshooting

### Chatbot Not Appearing

1. Check that `chatbot/chatbot.js` is loaded (check browser console for errors)
2. Verify the CSS is loading (check `style.css` is linked in HTML)
3. Check browser console for JavaScript errors

### API Errors

1. **Make sure you're in the `chatbot` folder** when running `npm start` - the `package.json` is located there
   ```bash
   cd chatbot
   npm start
   ```
2. Check the API key is correct in `chatbot/server.js`
3. Check network tab in browser DevTools for API call errors
4. Verify CORS is enabled (should be handled by `cors` middleware)

### Connection Issues

1. Make sure the backend server is running on port 3000
2. If using a different port, update `chatbot/chatbot.js` with the correct URL
3. Check firewall settings if accessing from a different machine

## Production Deployment

For production:

1. **Use environment variables** for the API key
2. **Enable HTTPS** for secure API communication
3. **Configure CORS** properly for your domain
4. **Add rate limiting** to prevent abuse
5. **Monitor API usage** to track costs
6. **Set up error logging** for debugging

See `DEPLOYMENT.md` or `QUICK_DEPLOY.md` for detailed deployment instructions.

## Support

For issues or questions, contact:
- Email: info@linkwavewireless.com
- Phone: 1-888-859-2673
