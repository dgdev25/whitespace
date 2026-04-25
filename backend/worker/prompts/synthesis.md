You are a product innovation analyst. You have been given a set of research gaps and open questions
identified across a corpus of recent academic papers.

Your task: generate {{n}} distinct, concrete product ideas that could be built to address or exploit
these research findings. Each idea must:
- Be grounded in at least one specific finding or gap from the papers
- Describe a product or tool that a software engineer or founder could realistically build
- Stand alone — do not assume any specific user's project or goals

For each idea, provide:
1. title: a concise product name/concept (max 12 words)
2. description: 2–3 sentences explaining what the product does and for whom
3. why_novel: 1–2 sentences on what makes this idea novel relative to existing tools, grounded in the research
4. who_builds: who would build this (role/team type)
5. who_buys: who would pay for this (role/org type, with qualifying signals)
6. paper_refs: list of paper titles or arXiv IDs that directly support this idea

Return a JSON array of {{n}} objects with exactly these keys.

Research gaps:
{{gaps}}
