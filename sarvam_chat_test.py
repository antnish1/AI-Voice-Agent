"""One Sarvam chat completion; no request is made without SARVAM_API_KEY."""
import os
from pathlib import Path

env_file = Path(__file__).with_name(".env")
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("SARVAM_API_KEY="):
            os.environ.setdefault(
                "SARVAM_API_KEY",
                line.split("=", 1)[1].strip().strip('"').strip("'"),
            )

api_key = os.environ.get("SARVAM_API_KEY")
if not api_key:
    raise SystemExit("Add SARVAM_API_KEY to .env before running.")

from sarvamai import SarvamAI

client = SarvamAI(api_subscription_key=api_key)
response = client.chat.completions(
    model="sarvam-105b-conversations",
    messages=[{"role": "user", "content": "Say hello in one short sentence."}],
)
print(response.choices[0].message.content)
