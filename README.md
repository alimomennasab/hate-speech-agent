# Content Moderation Agent

This project is a content moderation agent demo that uses a language model to determine whether text content should be routed to a hate speech classifier or spam classifier. Rather than sending all inputs directly to both classifier, or relying entirely on the agent's language model to perform classification without safeguards, the agent first evaluates whether content is worth classifying, which filters out code/spam/other non-relevant text. This reduces unnecessary API calls and computational costs, while providing a second layer of content classification to truly ensure that the input does not violate content policies.


**Live demo:** [https://hate-speech-agent.netlify.app](https://hate-speech-agent.netlify.app)

<img width="1440" height="900" alt="Screenshot 2026-02-12 at 10 30 50 AM" src="https://github.com/user-attachments/assets/c97e0082-28ec-412d-8f8a-e51cb7a1b519" />

## Models

|Model | Provider | Purpose |
|-------|----------|---------|
| **gpt-4o-mini** | OpenAI | Decides if input is valid for hate speech classification. Returns JSON with `should_classify` (boolean) and `reasoning` (string) outputs.|
| **facebook/roberta-hate-speech-dynabench-r4-target** | HuggingFace (Meta) | RoBERTa-based text classifier; outputs `hate` and `nothate` confidence scores (floats). |
| **mrm8488/bert-tiny-finetuned-sms-spam-detection** | HuggingFace | BERT-based text classifier; outputs `LABEL_1` (spam) and `LABEL_0` (not spam) confidence scores (floats). |

## How It Works

1. **Input** — User submits text to moderate.
2. **GPT-4o-mini routing** — The model decides if the input is valid and should be classified for hate speech or spam.
3. **RoBERTa classification** — If routed to the hate speech classifier, the text is sent to `facebook/roberta-hate-speech-dynabench-r4-target` via the HuggingFace Inference API.
4. **Spam classification** — If routed to the spam classifier, the text is sent to `facebook/mrm8488/bert-tiny-finetuned-sms-spam-detection` via the HuggingFace Inference API.
5. **Result** — The app shows flagged or not flagged with a confidence score, and whether the content is hate/spam.
6. **Logging** — All inputs are saved to PostgreSQL with timestamps.

## Stack

- **Frontend** — Next.js 16, React 19, Tailwind CSS (deployed on Netlify)
- **Backend** — FastAPI, OpenAI API (gpt-4o-mini), HuggingFace Inference API (facebook/roberta-hate-speech-dynabench-r4-target) (deployed on Render)
- **Database** — PostgreSQL (Supabase hosting)

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

Create `backend/.env`:

```
OPENAI_KEY=sk-...
HUGGINGFACE_KEY=hf_...
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Run the API:

```bash
uvicorn api:app --reload
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local` (optional, defaults to `http://localhost:8000`):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

The backend uses SQLAlchemy. Set `DATABASE_URL` to a PostgreSQL connection string. The `inputs` table is created automatically on startup.

Example (Supabase pooler):

```
postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Deployment

- **Frontend** — Netlify: static export, build from `frontend/`, publish `dist/`
- **Backend** — Render: Python web service, root `backend/`, start `uvicorn api:app --host 0.0.0.0 --port 8000`
- Set `NEXT_PUBLIC_API_URL` in Netlify to the Render API URL so the frontend can call the backend.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/classify` | POST | Classify text. Body: `{"text": "..."}` |


## Future improvements

- Train and host a custom hate speech classification model.
- Add classification results (label, confidence) in the database alongside inputs.
- Support batch classification for multiple texts.
- Same for spam.
- More detailed input logging in Postgres.

---
