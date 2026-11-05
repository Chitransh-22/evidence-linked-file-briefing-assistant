from typing import List, Optional
from pydantic import BaseModel, Field


class ExtractedFact(BaseModel):
    statement: str = Field(..., description="Fact or evidentiary statement directly grounded in source text")
    exact_source_excerpt: str = Field(..., description="Exact textual excerpt from the document page")
    evidence_category: str = Field(
        default="Factual Finding",
        description="Category: Financial Transaction, Official Communication, Eyewitness Statement, Audit Observation, Contractual Agreement, etc."
    )
    associated_entities: List[str] = Field(default_factory=list, description="Names of entities mentioned")
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    ambiguity_flag: bool = Field(default=False, description="Flagged for human officer review if ambiguous")


class ExtractedEventRecord(BaseModel):
    event_title: str = Field(..., description="Concise title of the event")
    description: str = Field(..., description="Detailed description of what occurred")
    event_date: Optional[str] = Field(None, description="ISO format date YYYY-MM-DD if determinable")
    original_date_expression: str = Field(..., description="Exact date phrase as written in text, e.g., '14th August 2023'")
    date_precision: str = Field(default="exact", description="exact, approximate, month_year, range, unknown")
    associated_entities: List[str] = Field(default_factory=list)
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)


class StructuredExtractionResult(BaseModel):
    document_id: str
    page_number: int
    facts: List[ExtractedFact] = Field(default_factory=list)
    events: List[ExtractedEventRecord] = Field(default_factory=list)
    summary_of_page: str = Field(default="", description="Factual executive summary of this page")
    model_name: str
    model_version: str
