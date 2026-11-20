import sys
import os
from PyQt6.QtCore import QRectF, QPointF, Qt, QMarginsF
from PyQt6.QtGui import (
    QGuiApplication, QPdfWriter, QPainter, QColor, QFont, QPen, QBrush,
    QLinearGradient, QPainterPath, QPixmap, QImage, QFontMetrics,
    QPageSize, QPageLayout
)

PAGE_WIDTH = 2479
PAGE_HEIGHT = 3508

DARK_NAVY = QColor("#0A192F")
DEEP_SLATE = QColor("#0F172A")
HEADER_BG = QColor("#0B1E36")
ELECTRIC_BLUE = QColor("#1D4ED8")
ELECTRIC_BLUE_LIGHT = QColor("#2563EB")
CYAN_ACCENT = QColor("#0284C7")
CYAN_HIGHLIGHT = QColor("#38BDF8")
CYAN_GLOW = QColor("#E0F2FE")
TEAL_ACCENT = QColor("#0F766E")
TEAL_LIGHT = QColor("#14B8A6")

BG_LIGHT = QColor("#F8FAFC")
BG_CARD = QColor("#FFFFFF")
BG_CARD_SUBTLE = QColor("#F1F5F9")
BORDER_LIGHT = QColor("#CBD5E1")
BORDER_SUBTLE = QColor("#E2E8F0")

TEXT_PRIMARY = QColor("#0F172A")
TEXT_SECONDARY = QColor("#334155")
TEXT_MUTED = QColor("#64748B")


def get_font(family, pixel_size, bold=False, italic=False):
    font = QFont(family)
    font.setPixelSize(int(pixel_size))
    font.setBold(bold)
    font.setItalic(italic)
    return font


def draw_rounded_card(painter, rect, bg_color, border_color=None, border_width=1.0, radius=14):
    path = QPainterPath()
    path.addRoundedRect(rect, radius, radius)
    painter.fillPath(path, bg_color)
    if border_color and border_width > 0:
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.setPen(QPen(border_color, border_width))
        painter.drawPath(path)


def draw_pill(painter, rect, text, bg_color, text_color, font_size=15, bold=True):
    draw_rounded_card(painter, rect, bg_color, radius=rect.height() / 2.0)
    font = get_font("Segoe UI", font_size, bold=bold)
    painter.setFont(font)
    painter.setPen(text_color)
    painter.drawText(rect, Qt.AlignmentFlag.AlignCenter, text)


def draw_multiline_text(painter, rect, text, font, color, line_spacing=6, align=Qt.AlignmentFlag.AlignLeft):
    painter.setFont(font)
    painter.setPen(color)
    fm = QFontMetrics(font)
    words = text.split(" ")
    lines = []
    current_line = ""

    for word in words:
        test_line = f"{current_line} {word}".strip()
        if fm.horizontalAdvance(test_line) <= rect.width():
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)

    line_height = fm.height() + line_spacing
    total_text_height = len(lines) * line_height - line_spacing

    if align & Qt.AlignmentFlag.AlignVCenter:
        start_y = rect.top() + (rect.height() - total_text_height) / 2.0
    else:
        start_y = rect.top()

    for idx, line in enumerate(lines):
        line_rect = QRectF(rect.left(), start_y + idx * line_height, rect.width(), fm.height())
        painter.drawText(line_rect, align & ~Qt.AlignmentFlag.AlignVCenter, line)


def draw_common_header(painter, stage_text="ON-SCREEN MARKING (OSM) SYSTEM"):
    logo_rect = QRectF(90, 60, 56, 56)
    draw_rounded_card(painter, logo_rect, ELECTRIC_BLUE, radius=12)
    font_logo = get_font("Segoe UI", 32, bold=True)
    painter.setFont(font_logo)
    painter.setPen(QColor("#FFFFFF"))
    painter.drawText(logo_rect, Qt.AlignmentFlag.AlignCenter, "S")

    font_b = get_font("Segoe UI", 24, bold=True)
    painter.setFont(font_b)
    painter.setPen(DARK_NAVY)
    painter.drawText(QRectF(162, 64, 300, 48), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, "Smart OSM")

    font_s = get_font("Segoe UI", 15, bold=True)
    painter.setFont(font_s)
    painter.setPen(TEXT_MUTED)
    painter.drawText(QRectF(PAGE_WIDTH - 90 - 500, 64, 500, 48), Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter, stage_text)

    painter.setPen(QPen(BORDER_LIGHT, 2))
    painter.drawLine(QPointF(90, 136), QPointF(PAGE_WIDTH - 90, 136))


def draw_common_footer(painter, current_page, total_pages=5):
    sep_y = 3410
    painter.setPen(QPen(BORDER_LIGHT, 2))
    painter.drawLine(QPointF(90, sep_y), QPointF(PAGE_WIDTH - 90, sep_y))

    font_ft = get_font("Segoe UI", 16)
    painter.setFont(font_ft)
    painter.setPen(TEXT_MUTED)
    painter.drawText(QRectF(90, sep_y + 16, 1300, 32), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, "Smart OSM Scanning Software | High-speed answer booklet digitization & verification")

    font_pn = get_font("Segoe UI", 18, bold=True)
    painter.setFont(font_pn)
    painter.setPen(DARK_NAVY)
    painter.drawText(QRectF(PAGE_WIDTH - 90 - 200, sep_y + 16, 200, 32), Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter, f"{current_page:02d} / {total_pages:02d}")


def draw_workflow_strip(painter, y, active_stages=[1], is_dark=False):
    flow_rect = QRectF(90, y, PAGE_WIDTH - 180, 110)

    stages = [
        (1, "Physical\nBooklet"),
        (2, "High-Speed\nScanning"),
        (3, "Page\nValidation"),
        (4, "PDF\nGeneration"),
        (5, "Archival\nTransfer"),
        (6, "Centralized\nServer"),
        (7, "Verification\nAudit")
    ]

    total_w = flow_rect.width()
    step_w = total_w / 7.0

    line_y = y + 30
    line_col = QColor("#1E3A8A") if is_dark else QColor("#CBD5E1")
    painter.setPen(QPen(line_col, 4))
    painter.drawLine(QPointF(flow_rect.left() + step_w / 2.0, line_y), QPointF(flow_rect.right() - step_w / 2.0, line_y))

    for i in range(6):
        if (i + 1 in active_stages) and (i + 2 in active_stages):
            lx1 = flow_rect.left() + i * step_w + step_w / 2.0
            lx2 = flow_rect.left() + (i + 1) * step_w + step_w / 2.0
            painter.setPen(QPen(CYAN_HIGHLIGHT if is_dark else ELECTRIC_BLUE, 4))
            painter.drawLine(QPointF(lx1, line_y), QPointF(lx2, line_y))

    for idx, (num, label) in enumerate(stages):
        cx = flow_rect.left() + idx * step_w + step_w / 2.0
        is_active = num in active_stages

        node_r = 24
        painter.setPen(Qt.PenStyle.NoPen)
        if is_active:
            painter.setBrush(CYAN_HIGHLIGHT if is_dark else ELECTRIC_BLUE)
        else:
            painter.setBrush(QColor("#1E293B") if is_dark else QColor("#E2E8F0"))
        painter.drawEllipse(QPointF(cx, line_y), node_r, node_r)

        font_n = get_font("Segoe UI", 16, bold=True)
        painter.setFont(font_n)
        if is_dark:
            painter.setPen(DARK_NAVY if is_active else QColor("#94A3B8"))
        else:
            painter.setPen(QColor("#FFFFFF") if is_active else TEXT_SECONDARY)
        painter.drawText(QRectF(cx - node_r, line_y - node_r, node_r * 2, node_r * 2), Qt.AlignmentFlag.AlignCenter, str(num))

        font_lbl = get_font("Segoe UI", 14.5, bold=is_active)
        painter.setFont(font_lbl)
        if is_dark:
            painter.setPen(QColor("#FFFFFF") if is_active else QColor("#94A3B8"))
        else:
            painter.setPen(DARK_NAVY if is_active else TEXT_MUTED)
        lbl_rect = QRectF(cx - step_w / 2.0 + 4, line_y + node_r + 8, step_w - 8, 52)
        painter.drawText(lbl_rect, Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignTop, label)


def draw_balanced_feature_card(painter, rect, number, title, bullet_items, spec_box=None, pills=None):
    draw_rounded_card(painter, rect, BG_CARD, BORDER_LIGHT, border_width=1.5, radius=16)

    # Top Header
    draw_pill(painter, QRectF(rect.left() + 32, rect.top() + 32, 56, 56), str(number), ELECTRIC_BLUE, QColor("#FFFFFF"), font_size=26, bold=True)

    font_t = get_font("Segoe UI", 32, bold=True)
    painter.setFont(font_t)
    painter.setPen(DARK_NAVY)
    painter.drawText(QRectF(rect.left() + 104, rect.top() + 32, rect.width() - 136, 56), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, title)

    # Bullets - spaced out to fill top 70% of card
    by = rect.top() + 125
    for header, desc in bullet_items:
        # bullet circle
        painter.setBrush(ELECTRIC_BLUE)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(QPointF(rect.left() + 38, by + 16), 6.5, 6.5)

        full_text = f"{header}: {desc}"
        font_b = get_font("Segoe UI", 21)
        fm = QFontMetrics(font_b)
        text_w = rect.width() - 85
        words = full_text.split(" ")
        lines = []
        curr = ""
        for w in words:
            t = f"{curr} {w}".strip()
            if fm.horizontalAdvance(t) <= text_w:
                curr = t
            else:
                if curr:
                    lines.append(curr)
                curr = w
        if curr:
            lines.append(curr)

        lh = fm.height() + 10
        for l_idx, line in enumerate(lines):
            line_r = QRectF(rect.left() + 58, by + l_idx * lh, text_w, fm.height())
            if l_idx == 0 and ":" in line:
                parts = line.split(":", 1)
                h_part = parts[0] + ":"
                r_part = parts[1]
                font_h = get_font("Segoe UI", 21, bold=True)
                painter.setFont(font_h)
                painter.setPen(DARK_NAVY)
                painter.drawText(line_r, Qt.AlignmentFlag.AlignLeft, h_part)
                hw = QFontMetrics(font_h).horizontalAdvance(h_part)
                painter.setFont(font_b)
                painter.setPen(TEXT_SECONDARY)
                rem_r = QRectF(line_r.left() + hw + 6, line_r.top(), line_r.width() - hw - 6, line_r.height())
                painter.drawText(rem_r, Qt.AlignmentFlag.AlignLeft, r_part)
            else:
                painter.setFont(font_b)
                painter.setPen(TEXT_SECONDARY)
                painter.drawText(line_r, Qt.AlignmentFlag.AlignLeft, line)

        by += len(lines) * lh + 62

    # Technical Parameter Box (Deep & prominent)
    if spec_box:
        box_y = rect.bottom() - 200
        box_h = 115
        box_rect = QRectF(rect.left() + 32, box_y, rect.width() - 64, box_h)
        draw_rounded_card(painter, box_rect, QColor("#F8FAFC"), BORDER_LIGHT, border_width=1.0, radius=12)

        font_sh = get_font("Segoe UI", 18, bold=True)
        painter.setFont(font_sh)
        painter.setPen(DARK_NAVY)
        painter.drawText(QRectF(box_rect.left() + 20, box_rect.top() + 14, box_rect.width() - 40, 30), Qt.AlignmentFlag.AlignLeft, spec_box[0])

        font_sd = get_font("Segoe UI", 16.5)
        painter.setFont(font_sd)
        painter.setPen(TEXT_SECONDARY)
        painter.drawText(QRectF(box_rect.left() + 20, box_rect.top() + 52, box_rect.width() - 40, 50), Qt.AlignmentFlag.AlignLeft | Qt.TextFlag.TextWordWrap, spec_box[1])

    # Bottom Pills
    if pills:
        px = rect.left() + 32
        py = rect.bottom() - 60
        for p in pills:
            font_p = get_font("Segoe UI", 15, bold=True)
            fm_p = QFontMetrics(font_p)
            pw = fm_p.horizontalAdvance(p) + 28
            draw_pill(painter, QRectF(px, py, pw, 36), p, QColor("#F1F5F9"), DARK_NAVY, font_size=15, bold=True)
            px += pw + 16


def render_page_3_balanced(painter, total_pages=5):
    painter.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, BG_LIGHT)
    draw_common_header(painter, "ON-SCREEN MARKING (OSM) SYSTEM")

    draw_pill(painter, QRectF(90, 180, 460, 36), "STAGES 04 - 05 | ARCHIVE & QUALITY CONTROL", QColor("#EFF6FF"), ELECTRIC_BLUE, font_size=15, bold=True)

    font_hl = get_font("Segoe UI", 56, bold=True)
    painter.setFont(font_hl)
    painter.setPen(DARK_NAVY)
    painter.drawText(QRectF(90, 225, PAGE_WIDTH - 180, 70), Qt.AlignmentFlag.AlignLeft, "From scan to secure archive.")

    font_sub = get_font("Segoe UI", 23)
    draw_multiline_text(
        painter,
        QRectF(90, 305, PAGE_WIDTH - 180, 70),
        "Every booklet becomes a validated, organized digital file with tamper-evident PDF/A compilation and multi-pass quality control.",
        font_sub,
        TEXT_SECONDARY,
        line_spacing=6
    )

    draw_workflow_strip(painter, 390, active_stages=[4, 5], is_dark=False)

    card_w = (PAGE_WIDTH - 180 - 24) / 2.0
    cards_h = 1380
    row1_y = 540
    row2_y = 1960

    # Card 3: Automated PDF Generation (6 rich items)
    c3_rect = QRectF(90, row1_y, card_w, cards_h)
    draw_balanced_feature_card(
        painter,
        c3_rect,
        3,
        "Automated PDF Generation",
        [
            ("On-The-Go PDF Assembly", "builds candidate PDF progressively as each page is captured, removing post-scan batch delays."),
            ("Roll Number & Barcode Binding", "decodes Code 128 / QR barcodes on cover pages and embeds identifiers directly in metadata."),
            ("Tamper-Evident Compilation", "PDF/A archival standards with verified page ordering, confidentiality masking and audit timestamps."),
            ("Automated Directory Partitioning", "sorts PDFs automatically by Examination Year, Center Code, Subject Paper ID and Roll Number."),
            ("Lossless Image Compression", "dynamic algorithms balance compact file sizes for instant cloud sync with forensic print clarity."),
            ("Embedded Cryptographic XMP", "injects station serial, operator credentials, and SHA-256 content hashes into unalterable headers.")
        ],
        spec_box=("Production Archival Compliance & Storage Standards", "ISO PDF/A-1b & PDF/A-2u certified. Structured directory routing with automated integrity checks."),
        pills=["Progressive Assembly", "Barcode Metadata", "PDF/A Standard", "Directory Partitioning"]
    )

    # Card 4: Scanning Quality & Error Management (6 rich items)
    c4_rect = QRectF(90 + card_w + 24, row1_y, card_w, cards_h)
    draw_balanced_feature_card(
        painter,
        c4_rect,
        4,
        "Scanning Quality & Error Management",
        [
            ("Proactive Lighting Verification", "brightness thresholding blocks captures in underexposed, glare, or shadowy conditions."),
            ("Interactive Sequence Correction", "side-by-side ROI close-ups, horizontal nudge buttons and single-click spread splitting."),
            ("Non-Destructive Page Rescanning", "discard and replace defective pages on the fly without re-scanning the whole booklet."),
            ("Traceability & Audit Logging", "machine-level logs record scanner ID, operator, scan duration and optical confidence scores."),
            ("Neural Sequence Jump Detection", "instant multi-pass OCR audits printed page numbers, alerting operators to sequence gaps."),
            ("Two-Page Spread Auditing", "mathematical parity checking (2k, 2k+1) handles facing pages without false jump warnings.")
        ],
        spec_box=("Ingestion Safeguards & Operator Error Prevention", "Optical sensor thresholding blocks defective frames. Single-page rescan protects document custody."),
        pills=["Lighting Thresholding", "Single-Page Rescan", "ROI Nudge Tools", "Machine Audit Logs"]
    )

    # Card 5: Secure Local-to-Server Sync (6 rich items)
    c5_rect = QRectF(90, row2_y, card_w, cards_h)
    draw_balanced_feature_card(
        painter,
        c5_rect,
        5,
        "Secure Local-to-Server Sync",
        [
            ("Automated Duplex Synchronization", "transmits finalized PDFs from local scanning stations to central institutional servers seamlessly."),
            ("Metadata & Candidate Hash Binding", "embeds roll numbers, barcode values, subject codes, and cryptographic SHA-256 hashes in metadata."),
            ("Transactional Batch Commits", "multi-stage atomic verification ensures no partial, corrupted, or duplicate booklets are ever committed."),
            ("End-to-End Transport Encryption", "TLS 1.3 / HTTPS encrypted pipes guarantee total confidentiality and chain of custody across network segments."),
            ("Resilient Connection Recovery", "chunked upload protocol with exponential backoff survives intermittent regional broadband dropouts."),
            ("Cloud Handshake Verification", "central server validates cryptographic checksum against origin scan before acknowledging receipt.")
        ],
        spec_box=("Cryptographic Transport & Handshake Verification", "TLS 1.3 encrypted transfer with atomic rollback protection. Zero data loss across regional scan centers."),
        pills=["Duplex Sync", "SHA-256 Hashes", "Transactional Commits", "TLS Security"]
    )

    # Card 6: Hardware Telemetry & Control (6 rich items)
    c6_rect = QRectF(90 + card_w + 24, row2_y, card_w, cards_h)
    draw_balanced_feature_card(
        painter,
        c6_rect,
        6,
        "Hardware Telemetry & Control",
        [
            ("Machine-Level Operator Logging", "tracks workstation ID, camera serial, operator login, scan timestamp, and duration per booklet."),
            ("OCR Confidence Scoring", "records confidence metrics for every detected page number and barcode decode event in real time."),
            ("Proactive Environmental Monitoring", "thresholding alerts for uneven ambient lighting, optical tilt, or physical lens obstruction."),
            ("Non-Destructive Quality Reruns", "supervisors can inspect and replace specific defective scans without voiding the entire booklet audit trail."),
            ("Live Station Health Monitoring", "central room tracks camera frame rate, USB bus latency, disk write velocity, and device health."),
            ("Tamper-Evident Forensic Audit", "every administrative override or rescan is sealed with supervisor signature and forensic timestamp.")
        ],
        spec_box=("Forensic Audit Ledger & Supervisory Control Console", "Unbroken chain-of-custody logging. Flags low-confidence optical scans for supervisory inspection."),
        pills=["Operator Telemetry", "Confidence Scores", "Lighting Alerts", "Zero Audit Void"]
    )

    draw_common_footer(painter, 3, total_pages)


def main():
    app = QGuiApplication(sys.argv)
    img = QImage(PAGE_WIDTH, PAGE_HEIGHT, QImage.Format.Format_ARGB32_Premultiplied)
    img.fill(Qt.GlobalColor.white)
    painter = QPainter(img)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
    painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)
    render_page_3_balanced(painter, total_pages=5)
    painter.end()
    img.save("test_p3_balanced.png")
    print("Saved test_p3_balanced.png!")

if __name__ == "__main__":
    main()
