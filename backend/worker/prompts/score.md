You are a product viability analyst. Score the following product idea on two dimensions.

Idea:
Title: {{title}}
Description: {{description}}
Why novel: {{why_novel}}
Who builds: {{who_builds}}
Who buys: {{who_buys}}

Score each dimension from 0.0 to 1.0:
- novelty_score: How novel is this idea relative to existing products? (0=obvious, 1=groundbreaking)
- feasibility_score: How feasible is this to build with current technology? (0=impossible, 1=straightforward)

Return a JSON object with exactly these keys: novelty_score, feasibility_score.
Both values must be floats between 0.0 and 1.0.
