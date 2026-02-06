# Hate Speech Agent

This project is a content moderation agent demo that uses a language model to determine whether text content should be routed to a hate speech classifier. Enter text, the language models decides whether it should be tested for hate speech using the classifier, then runs the RoBERTa model if appropriate.

## Models

|Model | Provider | Purpose |
|-------|----------|---------|
| **gpt-4o-mini** | OpenAI | Decides if input is valid for hate speech classification. Returns JSON with `should_classify` (boolean) and `reasoning` (string) outputs.|
| **facebook/roberta-hate-speech-dynabench-r4-target** | HuggingFace (Meta) | RoBERTa-based text classifier; outputs `hate` and `nothate` confidence scores (floats). |

## How It Works

1. **Input** — User submits text to moderate.
2. **GPT-4o-mini routing** — The model decides if the input is valid and should be classified for hate speech (vs. code, spam, etc.).
3. **RoBERTa classification** — If routed, the text is sent to `facebook/roberta-hate-speech-dynabench-r4-target` via the HuggingFace Inference API.
4. **Result** — The app shows flagged or not flagged with a confidence score.
5. **Logging** — All inputs are saved to PostgreSQL with timestamps.

## Stack

- **Frontend** — Next.js 16, React 19, Tailwind CSS
- **Backend** — FastAPI, OpenAI API (gpt-4o-mini), HuggingFace Inference API (facebook/roberta-hate-speech-dynabench-r4-target)
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

Example:

```
postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/classify` | POST | Classify text. Body: `{"text": "..."}` |


## Future improvements

- Train and host a custom hate speech classification model.
- Add classification results (label, confidence) in the database alongside inputs.
- Support batch classification for multiple texts.

---