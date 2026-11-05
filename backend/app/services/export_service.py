import io
import csv
from datetime import datetime, timezone
from typing import Dict, Any, List

from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

import docx
from docx.shared import Inches, Pt, RGBColor


class ExportService:
    @staticmethod
    def generate_briefing_pdf(briefing: Dict[str, Any], case: Dict[str, Any]) -> bytes:
        """
        Generate formal government-formatted PDF briefing using ReportLab.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()

        # Formal Government Typography Styles
        title_style = ParagraphStyle(
            "GovTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#183153"),
            alignment=1,  # Center
            spaceAfter=10,
        )

        subtitle_style = ParagraphStyle(
            "GovSubTitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#334155"),
            alignment=1,
            spaceAfter=15,
        )

        heading_style = ParagraphStyle(
            "GovHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#183153"),
            spaceBefore=12,
            spaceAfter=6,
        )

        body_style = ParagraphStyle(
            "GovBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#1E293B"),
            spaceAfter=8,
        )

        meta_label_style = ParagraphStyle(
            "GovMeta",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#475569"),
        )

        story = []

        # Header Block
        story.append(Paragraph("GOVERNMENT OF INDIA / STATE INVESTIGATION COMMISSION", meta_label_style))
        story.append(Paragraph(briefing.get("title", "OFFICIAL INVESTIGATION BRIEFING"), title_style))
        story.append(Paragraph(f"CONFIDENTIAL & PRIVILEGED • CASE REF: {case.get('case_reference')} • VERSION {briefing.get('version', 1)}", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#183153"), spaceAfter=15))

        # Metadata Table
        meta_data = [
            [
                Paragraph("<b>Case Reference:</b>", meta_label_style),
                Paragraph(str(case.get("case_reference")), body_style),
                Paragraph("<b>Briefing ID:</b>", meta_label_style),
                Paragraph(str(briefing.get("briefing_id")), body_style),
            ],
            [
                Paragraph("<b>Classification:</b>", meta_label_style),
                Paragraph(str(case.get("category", "General")), body_style),
                Paragraph("<b>Status:</b>", meta_label_style),
                Paragraph(str(briefing.get("status", "Draft")), body_style),
            ],
            [
                Paragraph("<b>Created By:</b>", meta_label_style),
                Paragraph(str(briefing.get("created_by")), body_style),
                Paragraph("<b>Date Prepared:</b>", meta_label_style),
                Paragraph(briefing.get("created_at", "")[:10], body_style),
            ]
        ]
        meta_table = Table(meta_data, colWidths=[110, 140, 100, 140])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 15))

        # Sections
        section_data = briefing.get("section_data", {})
        for sec_name, content in section_data.items():
            story.append(Paragraph(sec_name.upper(), heading_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94A3B8"), spaceAfter=6))
            paragraphs = str(content).split("\n")
            for p_text in paragraphs:
                if p_text.strip():
                    story.append(Paragraph(p_text.strip(), body_style))
            story.append(Spacer(1, 8))

        # Sign-off / Approval Block
        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#183153"), spaceAfter=15))
        sign_data = [
            [
                Paragraph("<b>PREPARED BY:</b>", meta_label_style),
                Paragraph("<b>REVIEWED & APPROVED BY:</b>", meta_label_style),
            ],
            [
                Paragraph(f"Officer: {briefing.get('created_by')}<br/>Designation: Investigating Officer<br/>Date: {briefing.get('created_at', '')[:10]}", body_style),
                Paragraph(f"Officer: {briefing.get('approved_by') or 'Pending Authorization'}<br/>Designation: Supervisory Reviewer<br/>Date: {briefing.get('approval_date', 'Pending')}", body_style),
            ]
        ]
        sign_table = Table(sign_data, colWidths=[245, 245])
        sign_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(sign_table)

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    @staticmethod
    def generate_briefing_docx(briefing: Dict[str, Any], case: Dict[str, Any]) -> bytes:
        """
        Generate formal DOCX briefing using python-docx.
        """
        doc = docx.Document()

        # Title
        p_title = doc.add_paragraph()
        run_title = p_title.add_run(briefing.get("title", "OFFICIAL INVESTIGATION BRIEFING"))
        run_title.bold = True
        run_title.font.size = Pt(18)
        run_title.font.color.rgb = RGBColor(24, 49, 83)

        p_sub = doc.add_paragraph(f"CASE REF: {case.get('case_reference')} • VERSION {briefing.get('version', 1)} • STATUS: {briefing.get('status')}")
        p_sub.runs[0].font.size = Pt(10)
        p_sub.runs[0].font.color.rgb = RGBColor(100, 116, 139)

        doc.add_heading("Case Metadata", level=2)
        table = doc.add_table(rows=3, cols=2)
        table.cell(0, 0).text = f"Case Title: {case.get('title')}"
        table.cell(0, 1).text = f"Case Reference: {case.get('case_reference')}"
        table.cell(1, 0).text = f"Created By: {briefing.get('created_by')}"
        table.cell(1, 1).text = f"Date Prepared: {briefing.get('created_at', '')[:10]}"
        table.cell(2, 0).text = f"Approved By: {briefing.get('approved_by') or 'Pending'}"
        table.cell(2, 1).text = f"Approval Date: {briefing.get('approval_date') or 'Pending'}"

        section_data = briefing.get("section_data", {})
        for sec_name, content in section_data.items():
            doc.add_heading(sec_name, level=2)
            for line in str(content).split("\n"):
                if line.strip():
                    doc.add_paragraph(line.strip())

        buffer = io.BytesIO()
        doc.save(buffer)
        docx_bytes = buffer.getvalue()
        buffer.close()
        return docx_bytes

    @staticmethod
    def generate_csv_export(records: List[Dict[str, Any]], fieldnames: List[str]) -> bytes:
        """Generate CSV export from arbitrary tabular Mongo records."""
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for r in records:
            # Flatten lists or dicts for CSV
            clean_r = {}
            for k in fieldnames:
                val = r.get(k, "")
                if isinstance(val, (list, dict)):
                    clean_r[k] = str(val)
                else:
                    clean_r[k] = val
            writer.writerow(clean_r)

        return output.getvalue().encode("utf-8")
