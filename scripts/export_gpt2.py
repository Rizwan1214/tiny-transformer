"""Export real GPT-2 (small) attention maps and predictions for the "Real GPT-2" mode.

Run once (needs torch + transformers; downloads ~550 MB of GPT-2 weights):

    python3 scripts/export_gpt2.py

Writes public/gpt2/index.json plus one JSON file per preset sentence.
For every preset it also finds the heads that attend most strongly from a
chosen "query" token to a chosen "target" token, so the UI can point at
heads worth looking at instead of us hard-coding claims about them.
"""

from __future__ import annotations

import json
from pathlib import Path

import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

OUT = Path(__file__).resolve().parent.parent / "public" / "gpt2"
TOP_K = 10
POSITION_TOP_K = 3

# query/target: (token text, occurrence) matched against decoded tokens; "last" = final token.
PRESETS = [
    {
        "slug": "eiffel",
        "text": "The Eiffel Tower is located in the city of",
        "note": "Fact yaad karna: GPT-2 small ' Paris' ko sab se upar rakhta hai, lekin sirf thore se farq se, ' London' bilkul peeche hai. Chhota model (124M) hai, is liye yaqeen kam hai. Aakhri ' of' ki row mein dekho kaunse heads ' Tower' ko dekhte hain.",
        "note_en": "Fact recall: GPT-2 small ranks ' Paris' first, but only narrowly; ' London' is close behind. It's a small model (124M), so it isn't very confident. In the last ' of' row, see which heads look at ' Tower'.",
        "query": "last",
        "target": (" Tower", 1),
    },
    {
        "slug": "names",
        "text": "When Mary and John went to the store, John gave a drink to",
        "note": "Indirect object: 'John ne drink kisko di?' Sahi jawab ' Mary' hai, aur GPT-2 yahi predict karta hai. Research mein aakhri ' to' se ' Mary' ki taraf dekhne wale heads ko 'name mover' heads kaha gaya hai.",
        "note_en": "Indirect object: 'Who did John give the drink to?' The right answer is ' Mary', and GPT-2 predicts it. Research calls the heads that attend from the final ' to' to ' Mary' 'name mover' heads.",
        "query": "last",
        "target": (" Mary", 1),
    },
    {
        "slug": "repeat",
        "text": "Harry Potter went to Hogwarts. Harry Potter went to",
        "note": "Induction heads: doosri baar ' Potter' aane par kuch heads pichli baar ' Potter' ke BAAD wale token (' went') ko dekhte hain. Isi se model pattern copy karta hai.",
        "note_en": "Induction heads: when ' Potter' appears a second time, some heads look at the token that came AFTER ' Potter' last time (' went'). That's how the model copies patterns.",
        "query": (" Potter", 2),
        "target": (" went", 1),
    },
    {
        "slug": "pronoun",
        "text": "The cat sat on the mat because it was",
        "note": "Pronoun: ' it' kis ki taraf ishara karta hai? ' it' ki row mein dekho kaunse heads ' cat' ko dekhte hain.",
        "note_en": "Pronouns: what does ' it' refer to? In the ' it' row, see which heads look at ' cat'.",
        "query": (" it", 1),
        "target": (" cat", 1),
    },
    {
        "slug": "counting",
        "text": "1, 2, 3, 4, 5,",
        "note": "Ginti: GPT-2 bohat yaqeen se ' 6' predict karta hai. Kuch heads bas pichle token ko dekhte hain ('previous token' heads); aakhri ',' se ' 5' ko dekhne wale heads dekho.",
        "note_en": "Counting: GPT-2 predicts ' 6' with high confidence. Some heads simply look at the previous token ('previous token' heads); check which heads look from the last ',' to ' 5'.",
        "query": "last",
        "target": (" 5", 1),
    },
    {
        "slug": "lahore",
        "text": "Lahore is a city in the country of",
        "note": "Geography: GPT-2 ' Pakistan' ko sab se upar rakhta hai, aur ' India' doosre number par. 'Lahore' teen tokens (L, ah, ore) mein toot jata hai; aakhri ' of' se 'ore' ko dekhne wale heads dekho.",
        "note_en": "Geography: GPT-2 ranks ' Pakistan' first and ' India' second. 'Lahore' is split into three tokens (L, ah, ore); see which heads look from the final ' of' to 'ore'.",
        "query": "last",
        "target": ("ore", 1),
    },
]


def find(token_texts: list[str], spec) -> int:
    if spec == "last":
        return len(token_texts) - 1
    text, occurrence = spec
    seen = 0
    for i, t in enumerate(token_texts):
        if t == text:
            seen += 1
            if seen == occurrence:
                return i
    raise ValueError(f"token {text!r} #{occurrence} not in {token_texts}")


def rounded(x: torch.Tensor, places: int = 3):
    return torch.round(x * 10**places).div(10**places).tolist()


def main() -> None:
    torch.manual_seed(0)
    tokenizer = GPT2TokenizerFast.from_pretrained("gpt2")
    model = GPT2LMHeadModel.from_pretrained("gpt2", attn_implementation="eager")
    model.eval()
    OUT.mkdir(parents=True, exist_ok=True)

    index = []
    for preset in PRESETS:
        enc = tokenizer(preset["text"], return_tensors="pt")
        with torch.no_grad():
            out = model(**enc, output_attentions=True)

        ids = enc["input_ids"][0].tolist()
        texts = [tokenizer.decode([i]) for i in ids]
        # attentions: tuple(layers) of [batch, heads, n, n] → [layers][heads][n][n]
        att = torch.stack(out.attentions)[:, 0]
        n_layers, n_heads = att.shape[0], att.shape[1]

        probs = torch.softmax(out.logits[0], dim=-1)
        top = torch.topk(probs[-1], TOP_K)
        next_tokens = [
            {"id": int(i), "text": tokenizer.decode([int(i)]), "p": round(float(p), 4)}
            for p, i in zip(top.values, top.indices)
        ]
        per_pos = torch.topk(probs, POSITION_TOP_K, dim=-1)
        position_top = [
            [{"text": tokenizer.decode([int(i)]), "p": round(float(p), 3)} for p, i in zip(ps, is_)]
            for ps, is_ in zip(per_pos.values, per_pos.indices)
        ]

        q = find(texts, preset["query"])
        t = find(texts, preset["target"])
        scores = att[:, :, q, t]  # [layers, heads]
        flat = torch.topk(scores.flatten(), 3)
        top_heads = [
            {"layer": int(k // n_heads), "head": int(k % n_heads), "weight": round(float(w), 3)}
            for w, k in zip(flat.values, flat.indices)
        ]

        data = {
            "slug": preset["slug"],
            "text": preset["text"],
            "note": preset["note"],
            "noteEn": preset["note_en"],
            "tokens": [{"id": i, "text": s} for i, s in zip(ids, texts)],
            "layers": n_layers,
            "heads": n_heads,
            "attentions": rounded(att),
            "nextTokens": next_tokens,
            "positionTop": position_top,
            "highlight": {"query": q, "target": t, "topHeads": top_heads},
        }
        (OUT / f"{preset['slug']}.json").write_text(json.dumps(data, separators=(",", ":")))
        index.append({"slug": preset["slug"], "text": preset["text"]})
        print(
            f"{preset['slug']:9} {len(ids):2} tokens  next={next_tokens[0]['text']!r} "
            f"({next_tokens[0]['p']:.2f})  top head L{top_heads[0]['layer'] + 1}·H{top_heads[0]['head'] + 1}="
            f"{top_heads[0]['weight']}  tokens={texts}"
        )

    meta = {"model": "gpt2", "params": "124M", "layers": 12, "heads": 12, "dModel": 768, "presets": index}
    (OUT / "index.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
