import json
from cerebras.cloud.sdk import Cerebras
from app.core.config import settings

client = Cerebras(api_key=settings.CEREBRAS_API_KEY)

SYSTEM_PROMPT = """
You are a task parser for a virtual assistant tool.
Extract task details from natural language input and return ONLY a JSON object.
No explanation, no markdown, no extra text — just raw JSON.

JSON format:
{
  "title": "short action title",
  "description": "more detail if mentioned",
  "priority": 3,
  "client_name": "name if mentioned or null",
  "status": "todo"
}

Priority rules:
- Use 1 for urgent words: urgent, ASAP, immediately, critical
- Use 2 for soon: today, this morning, by EOD
- Use 3 for normal: no time mention (default)
- Use 4 for low: sometime, eventually, when you can
- Use 5 for someday: no rush, backlog
"""

def parse_task_from_text(user_input: str, context_notes: list[str] = []) -> dict:
    context_block = ""
    if context_notes:
        joined = "\n".join(f"- {n}" for n in context_notes)
        context_block = f"\n\nRelevant client context:\n{joined}"

    response = client.chat.completions.create(
        model="gpt-oss-120b",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_input + context_block}
        ],
        max_tokens=300
    )

    raw = response.choices[0].message.content.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "title": user_input,
            "description": None,
            "priority": 3,
            "client_name": None,
            "status": "todo"
        }