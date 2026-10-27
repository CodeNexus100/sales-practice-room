# Sales Practice Room: project brief

## What this is
A voice roleplay trainer for our company's sales reps. A rep calls an **AI customer**, talks to it out loud like ChatGPT's voice mode, and gets a **scored review** afterwards. The goal is to train and evaluate reps on sales calls.

The founder will provide the **official evaluation parameters**. Until then the six parameters in the app are placeholders, editable in the UI and stored in localStorage.

## Current state (v0.1, working prototype)
- `server.js`: a zero-dependency Node server. It serves `public/index.html` and keeps API keys in `.env`. The first key found is used, in this order: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`. We're on Gemini for now because it's free.
  - `POST /api/ask {prompt, tier}` sends text prompts to the AI. Each tier has a list of fallback models, tried in order if one is overloaded.
    - `tier: "quick"` is the customer in basic mode (Gemini: `gemini-3.5-flash-lite`).
    - `tier: "default"` writes the review (Gemini: `gemini-3.8-flash`, then `gemini-3.5-flash`).
  - `POST /api/live-token` issues a short-lived, single-use Gemini Live token, so the browser never sees the real key. `LIVE_MODEL` defaults to `gemini-3.8-live`.
  - `GET /api/health` returns `{ok, live}`.
- `public/index.html`: the whole app in one file, with no build step.
  - **Setup:** three customer personas (Vikram: skeptical ops head; Ananya: friendly but won't commit; Rohit: tough procurement negotiator). Each persona has a personality, **hidden facts** revealed only to good discovery questions, and objections. You also choose difficulty (easy, medium, hard), language (Indian English or Hinglish), an editable product description, and an editable weighted rubric.
  - **Call:** the customer turn returns JSON `{say, mood 0-100, revealed:[fact numbers], hang_up}`. Coach view shows a temperature bar and the facts uncovered so far.
  - **Voice, live mode (the default when a Gemini key is set):** a real phone-call feel.
    - The browser streams mic audio (16 kHz PCM through an AudioWorklet) straight to the Gemini Live API over WebSocket, and plays the customer's 24 kHz audio as it arrives.
    - Gemini's voice activity detection decides when the rep has finished speaking. The rep can interrupt the customer.
    - The transcript for the review comes from Gemini's input and output transcription.
    - Mood, revealed facts and hang-up come from a silent, non-blocking `report_state` tool call after each reply.
    - The mic button mutes. Typing still works.
    - The first audio comes about 0.4–0.9 s after the rep stops talking.
  - **Voice, basic mode (the fallback):** Web Speech API recognition (Chrome only; a turn ends after 1.4 s of silence) plus browser `speechSynthesis`. It's used when there's no Gemini key or the live line drops.
  - **Review:** a JSON evaluation `{summary, scores[{parameter, score, evidence quote, feedback}], moments[{turn, said, issue, better}], strengths, next_focus}`. The weighted score out of 100 is computed in the page. The page also computes talk share, questions asked, longest turn and hidden facts found. It ships with a hard-coded example review.
  - The page calls AI through a `localSample()` shim with a `.json()` method. This shim was the artifact `sample` API in the earlier claude.ai prototype.

## Decisions so far
- Roles are flipped compared with a sales bot: the AI is the **customer** and the human is the **seller**.
- Feedback must quote the rep's own words as evidence and give a concrete "try instead" line. Reps won't trust scores without that.
- Hidden facts reward real discovery instead of pitching.
- Indian context: English and Hinglish, with Indian names and companies and ₹ pricing.

## Next steps (in priority order)
1. **Plug in the founder's parameters** as the default rubric. Allow importing them from JSON or CSV.
2. **Make the product and personas real:** our product, plus personas built from real objections and call recordings.
3. **Make the voice realistic.** Partly done: live mode uses Gemini Live speech-to-speech. Still to do: pick better voices, test the Hinglish voice, and handle the line dropping by reconnecting with session resumption. If Gemini Live falls short, the alternatives are OpenAI Realtime, or a pipeline: Deepgram or Sarvam for speech-to-text, Claude, then ElevenLabs, Cartesia or Sarvam for text-to-speech. LiveKit Agents or Pipecat can tie the pipeline together. Target under 1 s between the rep finishing and the customer speaking.
4. **Save sessions:** store reps, calls, transcripts and reviews (SQLite is fine to start) and show each rep's progress over time.
5. **Manager view:** a team leaderboard, the weakest parameters across the team, and assigned scenarios.
6. **Assessment mode:** a fixed scenario and settings so reps can be compared fairly.
7. **Audio-based metrics:** pace (words per minute), filler words, interruptions and silence.

## Running
`cp .env.example .env`, add a key (`GEMINI_API_KEY` gives the live voice call), run `node server.js`, then open http://localhost:3000 in Chrome.
