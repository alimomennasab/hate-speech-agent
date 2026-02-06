import json
import os
import re
import openai
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from huggingface_hub import InferenceClient
from db import save_input

load_dotenv()
OPENAI_KEY = os.getenv("OPENAI_KEY")
HF_KEY = os.getenv("HUGGINGFACE_KEY")
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextInput(BaseModel):
    text: str


def parse_json(text: str) -> dict:
    """Extract and parse JSON from GPT response."""
    text = text.strip()

    # Extract JSON from markdown code block if present
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        text = match.group(1).strip()

    # Find JSON object in text
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]

    return json.loads(text)


def call_gpt(user_input: str) -> str:
    """GPT API call: reasons whether input is valid for hate speech classification."""

    client = openai.OpenAI(api_key=OPENAI_KEY)

    prompt = f"""You are a content moderation routing agent. Analyze this text and decide if it should be sent to a hate speech classifier.
    Route to classifier IF:
    - It's user-generated content (comments, posts, messages)
    - It contains potentially harmful language targeting individuals/groups
    - It's in a natural language (not code, gibberish, etc.)
    - It contains non-letter characters emulating real characters (ex. @ for a)

    Do NOT route IF:
    - It's code, markup, or technical content
    - It's random characters with no meaning
    - It's clearly spam/commercial content
    - It's a factual/neutral statement with no harmful intent

    Text: "{user_input}"

    Respond in JSON only:
    {{"should_classify": true/false, "reasoning": "explanation"}}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150,
    )

    print("GPT response: ", response.choices[0].message.content)
    return response.choices[0].message.content


def call_roberta_hf(text: str) -> dict:
    """HuggingFace API: facebook/roberta-hate-speech-dynabench-r4-target classification"""

    client = InferenceClient(
        provider="hf-inference",
        api_key=os.environ["HUGGINGFACE_KEY"],
    )

    result = client.text_classification(
        text,
        model="facebook/roberta-hate-speech-dynabench-r4-target",
    )

    # Result: [TextClassificationOutputElement(label='nothate', score=0.99...), TextClassificationOutputElement(label='hate', score=0.00...)]
    print("HF result: ", result)
    if result and len(result) > 0:
        top = result[0]
        return {"label": top.label, "score": top.score}
    return {"label": "unknown", "score": 0}

@app.post("/classify")
async def classify_text(input: TextInput):
    text = input.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        save_input(text)
    except Exception as e:
        print(f"DB save failed: {e}")

    # GPT reasoning call
    gpt_output = call_gpt(text)
    routing_decision = parse_json(gpt_output)

    should_classify = routing_decision.get("should_classify", False)
    reasoning = routing_decision.get("reasoning", "")

    if not should_classify:
        return {"routed": False, "reasoning": reasoning}

    # HF classifier call
    classification = call_roberta_hf(text)
    return {
        "routed": True,
        "reasoning": reasoning,
        "classification": classification["label"],
        "confidence": classification["score"],
    }
