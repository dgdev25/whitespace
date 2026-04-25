from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class MonetisationPattern(BaseModel):
    name: str
    description: str
    fit: str


class Risk(BaseModel):
    title: str
    description: str


class ProductSketch(BaseModel):
    value_prop_headline: str
    value_prop_body: str
    buyer_profile: str
    buyer_signals: list[str]
    risks: list[Risk]
    monetisation: list[MonetisationPattern]
    caveat: str


class BuildOutputOut(BaseModel):
    id: str
    idea_id: str
    product_sketch: ProductSketch | dict
    technical_plan: str
    status: str
    created_at: datetime
