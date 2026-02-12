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
    allow_origins=[
        "https://hate-speech-agent.netlify.app",
        "https://www.hate-speech-agent.netlify.app",
        "http://localhost:3000",
    ],
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
    """GPT API call: reasons whether input is valid for hate speech classification or spam classification."""

    client = openai.OpenAI(api_key=OPENAI_KEY)

    prompt = f"""You are a content moderation routing agent. Analyze this text and decide if it should be sent to a hate speech classifier,
    or a spam classifier. If the content is to be classified, you must choose either the hate speech or spam classifier,
    not both. 

    Route to a hate speech classifier IF:
    - It contains potentially harmful language targeting individuals/groups
    - It's in a natural language (not code, gibberish, etc.)
    - It contains non-letter characters emulating real characters (ex. @ for a)

    Route to a spam classifier IF:
    - It's clearly spam/commercial content
    - It includes personal content like phone numbers/addresses

    Do NOT route IF:
    - It's code, markup, or technical content
    - It's random characters with no meaning
    - It's a factual/neutral statement with no harmful intent

    Text: "{user_input}"

    Respond in JSON only:
    {{"should_classify": classify_hate/classify_spam/no_classifying, "reasoning": "explanation"}}
    Remember, should_classify can only be those 3 exact values: classify_hate, classify_spam, or no_classifying. 
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
    print("HF hate result: ", result)
    if result and len(result) > 0:
        top = result[0]
        return {"label": top.label, "score": top.score}
    return {"label": "unknown", "score": 0}

def call_bert_spam_hf(text: str) -> dict:
    """HuggingFace API: https://huggingface.co/mrm8488/bert-tiny-finetuned-sms-spam-detection"""
    client = InferenceClient(
        provider="hf-inference",
        api_key=os.environ["HUGGINGFACE_KEY"],
    )

    result = client.text_classification(
        text,
        model="mrm8488/bert-tiny-finetuned-sms-spam-detection",
    )

    # HF spam result:  [TextClassificationOutputElement(label='LABEL_1', score=0.9020029902458191), TextClassificationOutputElement(label='LABEL_0', score=0.0979970395565033)]
    # LABEL_1 = spam, LABEL_0 = not spam
    print("HF spam result: ", result)
    if result and len(result) > 0:
        top = result[0]
        return {"label": top.label, "score": top.score}
    return {"label": "unknown", "score": 0}

@app.get("/")
async def health_check():
    return {"status": "ok"}

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

    # TODO: change how the GPT call is handled 
    should_classify = routing_decision.get("should_classify", "no_classifying")
    reasoning = routing_decision.get("reasoning") or ""

    if should_classify == "no_classifying":
        return {"routed": False, "reasoning": reasoning}

    # HF classifier call
    if should_classify == "classify_hate":
        classification = call_roberta_hf(text)
        reasoning = f"{reasoning} We will double check by sending the input to the hate speech classifier."
    elif should_classify == "classify_spam":
        classification = call_bert_spam_hf(text)
        reasoning = f"{reasoning} We will double check by sending the input to the spam classifier."
    else:
        print("Error: should_classify is not in the desired format")
        raise HTTPException(status_code=500, detail="Invalid routing decision")

    return {
        "routed": True,
        "reasoning": reasoning,
        "classification_type": should_classify,
        "classification": classification["label"],
        "confidence": classification["score"],
    }
