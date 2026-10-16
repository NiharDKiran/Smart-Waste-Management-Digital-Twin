from io import BytesIO
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from app.twin.engine import TwinEngine
from app.schemas import RecommendationResponse


PRIMARY = HexColor("#2D6A4F")
AMBER = HexColor("#E07B39")
DARK = HexColor("#2C2C2C")
LIGHT = HexColor("#F5F0EB")
GRAY = HexColor("#666666")


def generate_report(
    engine: TwinEngine,
    recommendations: RecommendationResponse | None = None,
) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=25 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "Title_Custom", parent=styles["Title"],
        fontSize=22, textColor=PRIMARY, spaceAfter=4 * mm,
    ))
    styles.add(ParagraphStyle(
        "Heading_Custom", parent=styles["Heading2"],
        fontSize=14, textColor=PRIMARY, spaceBefore=6 * mm, spaceAfter=3 * mm,
    ))
    styles.add(ParagraphStyle(
        "Body_Custom", parent=styles["Normal"],
        fontSize=10, textColor=DARK, leading=14,
    ))
    styles.add(ParagraphStyle(
        "Small", parent=styles["Normal"],
        fontSize=8, textColor=GRAY,
    ))

    elements = []

    elements.append(Paragraph("EcoTwin: Waste Management Report", styles["Title_Custom"]))
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    elements.append(Paragraph(f"Generated: {now}", styles["Small"]))
    elements.append(Paragraph(
        "All data in this report is simulated unless otherwise noted.",
        styles["Small"],
    ))
    elements.append(Spacer(1, 6 * mm))
    elements.append(HRFlowable(width="100%", color=PRIMARY, thickness=1))
    elements.append(Spacer(1, 4 * mm))

    summary = engine.get_twin_state_summary()
    elements.append(Paragraph("Twin State Summary", styles["Heading_Custom"]))

    summary_data = [
        ["Metric", "Value"],
        ["Total Bins", str(summary["total_bins"])],
        ["Average Fill Level", f"{summary['avg_fill_level_pct']}%"],
        ["Bins at Overflow Risk", str(summary["bins_at_overflow_risk"])],
        ["Bins Currently Overflowing", str(summary["bins_currently_overflowing"])],
        ["High Contamination Bins", str(summary["bins_high_contamination"])],
        ["Average Contamination Score", f"{summary['avg_contamination_score']:.3f}"],
    ]

    table = Table(summary_data, colWidths=[100 * mm, 60 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), LIGHT),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, GRAY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT, HexColor("#FFFFFF")]),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 4 * mm))

    elements.append(Paragraph("Zone Breakdown", styles["Heading_Custom"]))
    zone_data = [["Zone", "Type", "Bins", "Avg Fill %", "Avg Contamination", "At Risk"]]
    for name, z in summary["zones"].items():
        zone_data.append([
            name, z["type"], str(z["bin_count"]),
            f"{z['avg_fill_pct']}%", f"{z['avg_contamination']:.3f}",
            str(z["bins_at_risk"]),
        ])

    zone_table = Table(zone_data, colWidths=[35 * mm, 25 * mm, 15 * mm, 25 * mm, 30 * mm, 20 * mm])
    zone_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), LIGHT),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, GRAY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT, HexColor("#FFFFFF")]),
        ("ALIGN", (2, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(zone_table)
    elements.append(Spacer(1, 4 * mm))

    if summary["at_risk_bins"]:
        elements.append(Paragraph("Bins at Overflow Risk", styles["Heading_Custom"]))
        risk_data = [["ID", "Name", "Zone", "Fill %", "Hours to Overflow", "Contamination"]]
        for b in summary["at_risk_bins"]:
            risk_data.append([
                str(b["id"]), b["name"], b["zone"],
                f"{b['fill_pct']}%", f"{b['hours_until_overflow']}h",
                f"{b['contamination']:.3f}",
            ])

        risk_table = Table(risk_data, colWidths=[12 * mm, 35 * mm, 30 * mm, 20 * mm, 30 * mm, 25 * mm])
        risk_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), AMBER),
            ("TEXTCOLOR", (0, 0), (-1, 0), LIGHT),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, GRAY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT, HexColor("#FFFFFF")]),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("ALIGN", (3, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(risk_table)

    if recommendations and not isinstance(recommendations, dict):
        elements.append(Spacer(1, 6 * mm))
        elements.append(HRFlowable(width="100%", color=PRIMARY, thickness=1))
        elements.append(Paragraph("AI Recommendations", styles["Heading_Custom"]))

        if recommendations.is_cached:
            elements.append(Paragraph(
                "(Cached response: the LLM was unavailable when this was generated.)",
                styles["Small"],
            ))

        for issue in recommendations.issues:
            severity_color = {"critical": "#D32F2F", "warning": "#E07B39", "info": "#2D6A4F"}
            elements.append(Paragraph(
                f'<font color="{severity_color.get(issue.severity, "#2C2C2C")}">'
                f"[{issue.severity.upper()}]</font> {issue.title}",
                styles["Body_Custom"],
            ))
            elements.append(Paragraph(issue.description, styles["Body_Custom"]))
            elements.append(Spacer(1, 2 * mm))

        elements.append(Spacer(1, 3 * mm))
        elements.append(Paragraph("Recommended Actions", styles["Heading_Custom"]))

        for action in recommendations.actions:
            elements.append(Paragraph(
                f"[{action.priority.upper()}] {action.title}", styles["Body_Custom"],
            ))
            elements.append(Paragraph(action.description, styles["Body_Custom"]))
            if action.estimated_impact:
                elements.append(Paragraph(
                    f"Expected: {action.estimated_impact}", styles["Small"],
                ))
            elements.append(Spacer(1, 2 * mm))

        elements.append(Spacer(1, 3 * mm))
        elements.append(Paragraph("Assumptions", styles["Heading_Custom"]))
        for assumption in recommendations.assumptions:
            elements.append(Paragraph(f"- {assumption}", styles["Body_Custom"]))

    elements.append(Spacer(1, 10 * mm))
    elements.append(HRFlowable(width="100%", color=GRAY, thickness=0.5))
    elements.append(Paragraph(
        "EcoTwin is a hackathon prototype. All data is simulated. Recommendations are advisory.",
        styles["Small"],
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer
