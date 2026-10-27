# Sales Practice Room

Sales reps call an AI customer, talk to it with their voice, and get a scored review: a score per parameter with quotes as evidence, the lines they should have said differently, and what the customer was hiding.

## Run it (5 minutes)

1. Install Node.js 18 or newer from https://nodejs.org (check with `node --version`).
2. Get a free Gemini API key from https://aistudio.google.com (this also enables the live voice call). OpenAI or Anthropic keys also work, in basic voice mode.
3. In this folder, copy `.env.example` to `.env` and paste your key after `GEMINI_API_KEY=`.
4. Start it:
   ```
   node server.js
   ```
5. Open **http://localhost:3000 in Google Chrome** and allow the microphone when asked.

## Using it

- **Set up:** pick a customer, difficulty and language. Edit "What the rep is selling" and the scoring parameters.
- **Call:** press Start. The customer answers, then you just talk. After you pause for about 1.5 seconds, your words are sent and the customer replies out loud. The mic switches off while the customer speaks and back on after.
  - Tap the mic while the customer is talking to cut them off.
  - Tap it during your turn to pause or resume listening.
  - Typing still works.
- **Review:** press End call and get feedback.

## Notes

- Speech recognition uses Chrome's built-in engine. Other browsers may not support it.
- Use headphones if the customer's voice is picked up by the mic.
- Hinglish: Chrome's Hindi recognition may write Hindi words in Devanagari. The customer still understands.
## Deploy to Vercel (Client Demo)

1. Push this folder to a GitHub repository (or run `npx vercel` in this folder).
2. On [Vercel](https://vercel.com), import your repository.
3. In **Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your Gemini API key (or OpenAI/Anthropic keys).
4. Click **Deploy**. Vercel gives you an HTTPS URL (e.g. `https://your-project.vercel.app`) with automatic SSL so microphone access works seamlessly.
