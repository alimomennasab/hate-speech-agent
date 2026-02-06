# Is This Hate Speech?

A content moderation demo that uses an LLM to route text to a hate speech classifier. Enter text, and the system decides whether it should be classified, then runs the RoBERTa model when appropriate.

## Models

| Role | Model | Provider | Purpose |
|------|-------|----------|---------|
| Routing | **gpt-4o-mini** | OpenAI | Decides if input is valid for hate speech classification; returns JSON with `should_classify` and `reasoning` |
| Classification | **facebook/roberta-hate-speech-dynabench-r4-target** | HuggingFace (Meta) | RoBERTa-based text classifier; outputs `hate` or `nothate` with confidence scores |

## How It Works

1. **Input** — User submits text to moderate
2. **GPT-4o-mini routing** — The model decides if the input is valid and should be classified for hate speech (vs. code, spam, etc.)
3. **RoBERTa classification** — If routed, the text is sent to `facebook/roberta-hate-speech-dynabench-r4-target` via the HuggingFace Inference API
4. **Result** — The app shows flagged or not flagged with a confidence score
5. **Logging** — All inputs are saved to PostgreSQL with timestamps

## Stack

- **Frontend** — Next.js 16, React 19, Tailwind CSS
- **Backend** — FastAPI, OpenAI API (gpt-4o-mini), HuggingFace Inference API (facebook/roberta-hate-speech-dynabench-r4-target)
- **Database** — PostgreSQL (e.g. Supabase)

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

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/classify` | POST | Classify text. Body: `{"text": "..."}` |
| `/health` | GET | Health check |

## Project Structure

```
hate-speech-agent/
├── backend/
│   ├── api.py      # FastAPI app, GPT + HuggingFace logic
│   ├── db.py       # SQLAlchemy models, save/query
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx    # Main UI
│   │   └── hooks/
│   └── package.json
└── README.md
```

## Future improvements

- Train and host a custom hate speech classification model (replace or augment the off-the-shelf RoBERTa model)
- Persist classification results (label, confidence) in the database alongside inputs
- Add rate limiting and input sanitization for production use
- Restrict CORS to the frontend URL instead of `allow_origins=["*"]`
- Add an API endpoint to query logged inputs (e.g. for analytics or moderation review)
- Support batch classification for multiple texts
- Add unit and integration tests for the API and classification pipeline

## License

MIT
