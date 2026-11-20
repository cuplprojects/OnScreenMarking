import sys
import os
import shutil
from PyQt6.QtCore import QRectF, QPointF, Qt, QMarginsF, QSize
from PyQt6.QtGui import (
    QGuiApplication, QPdfWriter, QPainter, QColor, QFont, QPen, QBrush,
    QLinearGradient, QPainterPath, QPixmap, QImage, QFontMetrics,
    QPageSize, QPageLayout
)
from PyQt6.QtPdf import QPdfDocument, QPdfDocumentRenderOptions

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


def create_painter(writer):
    painter = QPainter(writer)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
    painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)
    return painter


def draw_rounded_card(painter, rect, bg_color, border_color=None, border_width=1.0, radius=14):
    path = QPainterPath()
    path.addRoundedRect(rect, radius, radius)
    painter.fillPath(path, bg_color)
    if border_color and border_width > 0:
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.setPen(QPen(border_color, border_width))
        painter.drawPath(path)


def draw_gradient_card(painter, rect, color_start, color_end, border_color=None, border_width=1.0, radius=14):
    path = QPainterPath()
    path.addRoundedRect(rect, radius, radius)
    grad = QLinearGradient(rect.topLeft(), rect.bottomRight())
    grad.setColorAt(0, color_start)
    grad.setColorAt(1, color_end)
    painter.fillPath(path, grad)
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


def draw_window_frame(painter, rect, img_path, window_title, status_badge=None):
    draw_rounded_card(painter, rect, BG_CARD, BORDER_LIGHT, border_width=1.5, radius=12)

    titlebar_height = 42
    titlebar_rect = QRectF(rect.left(), rect.top(), rect.width(), titlebar_height)
    path_tb = QPainterPath()
    path_tb.moveTo(rect.left(), rect.top() + 12)
    path_tb.arcTo(QRectF(rect.left(), rect.top(), 24, 24), 180, -90)
    path_tb.lineTo(rect.right() - 12, rect.top())
    path_tb.arcTo(QRectF(rect.right() - 24, rect.top(), 24, 24), 90, -90)
    path_tb.lineTo(rect.right(), rect.top() + titlebar_height)
    path_tb.lineTo(rect.left(), rect.top() + titlebar_height)
    path_tb.closeSubpath()
    painter.fillPath(path_tb, BG_CARD_SUBTLE)

    painter.setPen(QPen(BORDER_LIGHT, 1))
    painter.drawLine(QPointF(rect.left(), rect.top() + titlebar_height), QPointF(rect.right(), rect.top() + titlebar_height))

    dot_colors = [QColor("#EF4444"), QColor("#F59E0B"), QColor("#10B981")]
    for i, col in enumerate(dot_colors):
        painter.setBrush(col)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(QPointF(rect.left() + 20 + i * 16, rect.top() + 21), 5, 5)

    font_t = get_font("Segoe UI", 15, bold=True)
    painter.setFont(font_t)
    painter.setPen(TEXT_SECONDARY)
    painter.drawText(QRectF(rect.left() + 80, rect.top(), rect.width() - 250, titlebar_height), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, window_title)

    if status_badge:
        draw_pill(painter, QRectF(rect.right() - 150, rect.top() + 8, 130, 26), status_badge, QColor("#EFF6FF"), ELECTRIC_BLUE, font_size=12, bold=True)

    image_rect = QRectF(rect.left() + 2, rect.top() + titlebar_height + 1, rect.width() - 4, rect.height() - titlebar_height - 3)
    if os.path.exists(img_path):
        pix = QPixmap(img_path)
        scaled_pix = pix.scaled(
            int(image_rect.width()),
            int(image_rect.height()),
            Qt.AspectRatioMode.KeepAspectRatioByExpanding,
            Qt.TransformationMode.SmoothTransformation
        )
        clip_path = QPainterPath()
        clip_path.moveTo(image_rect.left(), image_rect.top())
        clip_path.lineTo(image_rect.right(), image_rect.top())
        clip_path.lineTo(image_rect.right(), image_rect.bottom() - 10)
        clip_path.arcTo(QRectF(image_rect.right() - 20, image_rect.bottom() - 20, 20, 20), 0, -90)
        clip_path.lineTo(image_rect.left() + 10, image_rect.bottom())
        clip_path.arcTo(QRectF(image_rect.left(), image_rect.bottom() - 20, 20, 20), 270, -90)
        clip_path.closeSubpath()

        painter.save()
        painter.setClipPath(clip_path)
        painter.drawPixmap(image_rect.toRect(), scaled_pix)
        painter.restore()


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


def draw_feature_card(painter, rect, number, title, bullet_items, pills=None):
    draw_rounded_card(painter, rect, BG_CARD, BORDER_LIGHT, border_width=1.5, radius=14)

    draw_pill(painter, QRectF(rect.left() + 26, rect.top() + 26, 48, 48), str(number), ELECTRIC_BLUE, QColor("#FFFFFF"), font_size=22, bold=True)

    font_t = get_font("Segoe UI", 27, bold=True)
    painter.setFont(font_t)
    painter.setPen(DARK_NAVY)
    painter.drawText(QRectF(rect.left() + 90, rect.top() + 26, rect.width() - 116, 48), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, title)

    by = rect.top() + 98
    for header, desc in bullet_items:
        painter.setBrush(ELECTRIC_BLUE)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(QPointF(rect.left() + 32, by + 14), 5.5, 5.5)

        full_text = f"{header}: {desc}"
        font_b = get_font("Segoe UI", 18.5)
        fm = QFontMetrics(font_b)
        text_w = rect.width() - 65
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

        lh = fm.height() + 7
        for l_idx, line in enumerate(lines):
            line_r = QRectF(rect.left() + 48, by + l_idx * lh, text_w, fm.height())
            if l_idx == 0 and ":" in line:
                parts = line.split(":", 1)
                h_part = parts[0] + ":"
                r_part = parts[1]
                font_h = get_font("Segoe UI", 18.5, bold=True)
                painter.setFont(font_h)
                painter.setPen(DARK_NAVY)
                painter.drawText(line_r, Qt.AlignmentFlag.AlignLeft, h_part)
                hw = QFontMetrics(font_h).horizontalAdvance(h_part)
                painter.setFont(font_b)
                painter.setPen(TEXT_SECONDARY)
                rem_r = QRectF(line_r.left() + hw + 4, line_r.top(), line_r.width() - hw - 4, line_r.height())
                painter.drawText(rem_r, Qt.AlignmentFlag.AlignLeft, r_part)
            else:
                painter.setFont(font_b)
                painter.setPen(TEXT_SECONDARY)
                painter.drawText(line_r, Qt.AlignmentFlag.AlignLeft, line)

        by += len(lines) * lh + 20

    if pills:
        px = rect.left() + 32
        py = rect.bottom() - 48
        for p in pills:
            font_p = get_font("Segoe UI", 13, bold=True)
            fm_p = QFontMetrics(font_p)
            pw = fm_p.horizontalAdvance(p) + 22
            draw_pill(painter, QRectF(px, py, pw, 28), p, QColor("#F1F5F9"), DARK_NAVY, font_size=13, bold=True)
            px += pw + 12


def render_page_1(painter, total_pages=5):
    painter.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, BG_LIGHT)

    logo_rect = QRectF(90, 70, 75, 75)
    draw_gradient_card(painter, logo_rect, ELECTRIC_BLUE, CYAN_ACCENT, border_color=CYAN_HIGHLIGHT, border_width=2, radius=16)
    font_logo = get_font("Segoe UI", 44, bold=True)
    painter.setFont(font_logo)
    painter.setPen(QColor("#FFFFFF"))
    painter.drawText(logo_rect, Qt.AlignmentFlag.AlignCenter, "S")

    font_b = get_font("Segoe UI", 32, bold=True)
    painter.setFont(font_b)
    painter.setPen(DARK_NAVY)
    painter.drawText(QRectF(185, 82, 400, 48), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, "Smart OSM")

    draw_pill(painter, QRectF(90, 180, 360, 36), "ON-SCREEN MARKING (OSM) SYSTEM", QColor("#EFF6FF"), ELECTRIC_BLUE, font_size=15, bold=True)

    font_hl = get_font("Segoe UI", 60, bold=True)
    painter.setFont(font_hl)
    painter.setPen(DARK_NAVY)
    painter.drawText(QRectF(90, 235, PAGE_WIDTH - 180, 150), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignTop, "Smart OSM\nScanning Software")

    font_sub = get_font("Segoe UI", 24)
    draw_multiline_text(
        painter,
        QRectF(90, 405, PAGE_WIDTH - 180, 95),
        "High-speed answer booklet digitization with intelligent page validation, secure transfer and complete on-screen evaluation.",
        font_sub,
        TEXT_SECONDARY,
        line_spacing=8
    )

    win_rect = QRectF(90, 520, PAGE_WIDTH - 180, 1060)
    draw_window_frame(
        painter,
        win_rect,
        r"d:\OnScreenMarking\OSMNew\extracted_screenshots\screenshot_1_1700x980.png",
        "OSM Scanner Studio | live capture",
        status_badge="LIVE STREAM"
    )

    metrics_y = 1620
    metrics_data = [
        ("1080p", "300 DPI", "Live camera capture"),
        ("Multi-pass", "Neural OCR", "Real-time page validation"),
        ("PDF/A", "Archival", "Tamper-evident output"),
        ("4 tiers", "Role-based", "Access control")
    ]
    col_w = (PAGE_WIDTH - 180 - 3 * 24) / 4.0
    for idx, (val1, val2, val3) in enumerate(metrics_data):
        mx = 90 + idx * (col_w + 24)
        mrect = QRectF(mx, metrics_y, col_w, 230)
        draw_rounded_card(painter, mrect, BG_CARD, BORDER_LIGHT, border_width=1.5, radius=14)

        font_v1 = get_font("Segoe UI", 50, bold=True)
        painter.setFont(font_v1)
        painter.setPen(DARK_NAVY)
        painter.drawText(QRectF(mx + 24, metrics_y + 24, col_w - 48, 56), Qt.AlignmentFlag.AlignLeft, val1)

        font_v2 = get_font("Segoe UI", 24, bold=True)
        painter.setFont(font_v2)
        painter.setPen(ELECTRIC_BLUE)
        painter.drawText(QRectF(mx + 24, metrics_y + 90, col_w - 48, 34), Qt.AlignmentFlag.AlignLeft, val2)

        font_v3 = get_font("Segoe UI", 18.5)
        painter.setFont(font_v3)
        painter.setPen(TEXT_MUTED)
        painter.drawText(QRectF(mx + 24, metrics_y + 132, col_w - 48, 70), Qt.AlignmentFlag.AlignLeft, val3)

    pillars_y = 1890
    pillars_h = 420
    pillars_rect = QRectF(90, pillars_y, PAGE_WIDTH - 180, pillars_h)
    draw_rounded_card(painter, pillars_rect, BG_CARD, BORDER_LIGHT, border_width=1.5, radius=14)

    draw_pill(painter, QRectF(120, pillars_y + 24, 270, 32), "ENTERPRISE CAPABILITIES", QColor("#EFF6FF"), ELECTRIC_BLUE, font_size=13.5, bold=True)
    font_pt = get_font("Segoe UI", 30, bold=True)
    painter.setFont(font_pt)
    painter.setPen(DARK_NAVY)
    painter.drawText(QRectF(120, pillars_y + 68, PAGE_WIDTH - 240, 42), Qt.AlignmentFlag.AlignLeft, "The Next Generation of Intelligent On-Screen Marking")

    font_pd = get_font("Segoe UI", 19)
    draw_multiline_text(
        painter,
        QRectF(120, pillars_y + 118, PAGE_WIDTH - 240, 68),
        "An integrated digital assessment platform designed to simplify examination management, enhance evaluation accuracy, improve transparency, and transform examination data into actionable intelligence.",
        font_pd,
        TEXT_SECONDARY,
        line_spacing=6
    )

    p_badges = [
        ("High-Speed Digitisation", "Native CZUR & TWAIN driver bridging with real-time spine curvature flattening and background whitening."),
        ("Multi-Pass Sequence OCR", "Instant neural page-order audit catches missing pages or sequence jumps directly at the scanner desk."),
        ("Blind Marking Governance", "Automated barcode pseudonymisation guarantees 100% unbiased, blind evaluation workflows."),
        ("Centralized Control Room", "Unified web portal tracking scanning batches, evaluator grading velocity, and regulatory audit compliance.")
    ]
    pb_w = (PAGE_WIDTH - 180 - 48 - 3 * 20) / 4.0
    for idx, (p_title, p_desc) in enumerate(p_badges):
        pbx = 120 + idx * (pb_w + 20)
        pby = pillars_y + 200
        pbrect = QRectF(pbx, pby, pb_w, 195)
        draw_rounded_card(painter, pbrect, BG_CARD_SUBTLE, BORDER_LIGHT, border_width=1, radius=10)

        painter.fillRect(QRectF(pbx + 16, pby + 18, 4, 22), ELECTRIC_BLUE)
        font_pbt = get_font("Segoe UI", 18, bold=True)
        painter.setFont(font_pbt)
        painter.setPen(DARK_NAVY)
        painter.drawText(QRectF(pbx + 26, pby + 16, pb_w - 40, 26), Qt.AlignmentFlag.AlignLeft, p_title)

        font_pbd = get_font("Segoe UI", 15.5)
        draw_multiline_text(
            painter,
            QRectF(pbx + 16, pby + 52, pb_w - 32, 130),
            p_desc,
            font_pbd,
            TEXT_SECONDARY,
            line_spacing=4
        )

    flow_box_y = 2350
    flow_box_h = 420
    flow_card_rect = QRectF(90, flow_box_y, PAGE_WIDTH - 180, flow_box_h)
    draw_gradient_card(painter, flow_card_rect, DARK_NAVY, HEADER_BG, border_color=QColor("#1E3A8A"), border_width=1.5, radius=14)

    draw_pill(painter, QRectF(120, flow_box_y + 24, 230, 32), "END-TO-END PLATFORM", ELECTRIC_BLUE, QColor("#FFFFFF"), font_size=13, bold=True)
    font_fl = get_font("Segoe UI", 24, bold=True)
    painter.setFont(font_fl)
    painter.setPen(QColor("#FFFFFF"))
    painter.drawText(QRectF(380, flow_box_y + 22, 600, 36), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, "ONE CONNECTED WORKFLOW")

    draw_workflow_strip(painter, flow_box_y + 80, active_stages=[1, 2, 3, 4, 5, 6, 7], is_dark=True)

    fw_details = [
        ("Intake", "Candidate Booklet"),
        ("Scan", "300 DPI Digitisation"),
        ("Validate", "Neural Sequence OCR"),
        ("Compile", "Tamper-Evident PDF/A"),
        ("Distribute", "Cloud / Web Portal"),
        ("Allocate", "Examiner Workload"),
        ("Grade", "On-Screen Marking")
    ]
    fw_step_w = (PAGE_WIDTH - 180) / 7.0
    for idx, (head_txt, desc_txt) in enumerate(fw_details):
        fx = 90 + idx * fw_step_w + 10
        fy = flow_box_y + 240
        frect = QRectF(fx, fy, fw_step_w - 20, 140)
        draw_rounded_card(painter, frect, QColor("#0F172A"), QColor("#1E3A8A"), border_width=1, radius=8)

        font_fwh = get_font("Segoe UI", 15, bold=True)
        painter.setFont(font_fwh)
        painter.setPen(CYAN_HIGHLIGHT)
        painter.drawText(QRectF(fx + 10, fy + 16, fw_step_w - 40, 24), Qt.AlignmentFlag.AlignCenter, head_txt)

        font_fwd = get_font("Segoe UI", 13.5)
        draw_multiline_text(
            painter,
            QRectF(fx + 10, fy + 48, fw_step_w - 40, 80),
            desc_txt,
            font_fwd,
            QColor("#E2E8F0"),
            line_spacing=2,
            align=Qt.AlignmentFlag.AlignCenter
        )

    draw_common_footer(painter, 1, total_pages)


def render_page_2(painter, total_pages=5):
    painter.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, BG_LIGHT)
    draw_common_header(painter, "ON-SCREEN MARKING (OSM) SYSTEM")

    draw_pill(painter, QRectF(90, 180, 390, 36), "STAGES 02 - 03 | CAPTURE & VALIDATE", QColor("#EFF6FF"), ELECTRIC_BLUE, font_size=15, bold=True)

    font_hl = get_font("Segoe UI", 54, bold=True)
    painter.setFont(font_hl)
    painter.setPen(DARK_NAVY)
    painter.drawText(QRectF(90, 225, PAGE_WIDTH - 180, 70), Qt.AlignmentFlag.AlignLeft, "Scan fast. Validate every page.")

    font_sub = get_font("Segoe UI", 23)
    draw_multiline_text(
        painter,
        QRectF(90, 305, PAGE_WIDTH - 180, 70),
        "Camera and TWAIN scanning that audits page order in real time, so errors are caught at the scanning desk, not at evaluation.",
        font_sub,
        TEXT_SECONDARY,
        line_spacing=6
    )

    draw_workflow_strip(painter, 390, active_stages=[2, 3], is_dark=False)

    cards_y = 540
    cards_h = 750
    card_w = (PAGE_WIDTH - 180 - 24) / 2.0

    c1_rect = QRectF(90, cards_y, card_w, cards_h)
    draw_feature_card(
        painter,
        c1_rect,
        1,
        "High-Speed Document Scanning",
        [
            ("Native Hardware Integration", "direct driver and SDK bridging with high-speed camera scanners (CZUR, overhead production units) and high-volume TWAIN document scanners."),
            ("Ergonomic Operator Triggers", "hands-free foot pedal, keyboard spacebar and hardware USB buttons for bulk paper turnover."),
            ("Zero-Latency Multi-Threading", "background I/O separates video capture from disk writing for continuous scanning without stutter."),
            ("Curvature & Whitening Engine", "real-time flattening of booklet spines, finger removal and paper background purification.")
        ],
        pills=["Direct SDK Bridging", "Foot Pedal Support", "Multi-Threaded I/O", "Background Whitening"]
    )

    c2_rect = QRectF(90 + card_w + 24, cards_y, card_w, cards_h)
    draw_feature_card(
        painter,
        c2_rect,
        2,
        "Intelligent Page Number Validation",
        [
            ("Multi-Pass Neural OCR", "reads and validates printed page numbers on every booklet scan."),
            ("Parity & Sequence Auditing", "detects missing pages, duplicate captures, order reversals and abnormal sequence jumps in real time."),
            ("Two-Page Facing Spread Support", "dual-page geometry evaluation (2k, 2k+1) prevents false jump warnings on open spreads."),
            ("Instant Sequence OCR Toggle", "one-click banner toggle between strict page auditing and rapid continuous intake.")
        ],
        pills=["Neural OCR Engine", "Parity Auditing", "Spread Geometry (2k+1)", "Zero Stutter"]
    )

    sec_y = 1320
    painter.fillRect(QRectF(90, sec_y + 4, 6, 34), ELECTRIC_BLUE)
    font_st = get_font("Segoe UI", 28, bold=True)
    painter.setFont(font_st)
    painter.setPen(DARK_NAVY)
    painter.drawText(QRectF(110, sec_y, 750, 42), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, "Interactive Template & ROI Editor")

    font_ss = get_font("Segoe UI", 20, italic=True)
    painter.setFont(font_ss)
    painter.setPen(TEXT_MUTED)
    painter.drawText(QRectF(PAGE_WIDTH - 90 - 800, sec_y, 800, 42), Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter, "Calibrate once, scan thousands of booklets consistently")

    win_rect = QRectF(90, 1380, PAGE_WIDTH - 180, 950)
    draw_window_frame(
        painter,
        win_rect,
        r"d:\OnScreenMarking\OSMNew\extracted_screenshots\screenshot_2_1645x1087.png",
        "Interactive Visual Template Editor & Creator (OSM)",
        status_badge="TEMPLATE EDITOR"
    )

    call_y = 2370
    call_h = 340
    call_w = (PAGE_WIDTH - 180 - 3 * 20) / 4.0
    callout_data = [
        ("Draw tools", "Mark page dimension, page-number area, barcode area and starting blur area directly on the scan.", "Precision Calibration"),
        ("Template selection", "Choose an existing template or create a new one for each booklet design.", "Multi-Paper Formats"),
        ("Specifications", "Template name, A4 preset, crop margin, page-number area, total pages and Auto-Set All Defaults.", "Auto-Set Defaults"),
        ("Capture settings", "Page capture format, skip cover, page range and barcode availability on the candidate page.", "Format Governance")
    ]

    for idx, (ctitle, cdesc, ctag) in enumerate(callout_data):
        cx = 90 + idx * (call_w + 20)
        crect = QRectF(cx, call_y, call_w, call_h)
        draw_rounded_card(painter, crect, BG_CARD, BORDER_LIGHT, border_width=1.5, radius=12)

        painter.fillRect(QRectF(cx + 20, call_y + 24, 6, 26), ELECTRIC_BLUE)

        font_ct = get_font("Segoe UI", 23, bold=True)
        painter.setFont(font_ct)
        painter.setPen(DARK_NAVY)
        painter.drawText(QRectF(cx + 34, call_y + 20, call_w - 50, 34), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, ctitle)

        font_cd = get_font("Segoe UI", 18)
        draw_multiline_text(
            painter,
            QRectF(cx + 20, call_y + 70, call_w - 40, 190),
            cdesc,
            font_cd,
            TEXT_SECONDARY,
            line_spacing=6
        )

        draw_pill(painter, QRectF(cx + 20, call_y + call_h - 48, call_w - 40, 28), ctag, QColor("#F1F5F9"), ELECTRIC_BLUE, font_size=13, bold=True)

    draw_common_footer(painter, 2, total_pages)


def draw_balanced_feature_card(painter, rect, number, title, bullet_items, spec_box=None, pills=None):
    draw_rounded_card(painter, rect, BG_CARD, BORDER_LIGHT, border_width=1.5, radius=16)

    draw_pill(painter, QRectF(rect.left() + 32, rect.top() + 32, 56, 56), str(number), ELECTRIC_BLUE, QColor("#FFFFFF"), font_size=26, bold=True)

    font_t = get_font("Segoe UI", 32, bold=True)
    painter.setFont(font_t)
    painter.setPen(DARK_NAVY)
    painter.drawText(QRectF(rect.left() + 104, rect.top() + 32, rect.width() - 136, 56), Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter, title)

    by = rect.top() + 125
    for header, desc in bullet_items:
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

    # Card 3: Automated PDF Generation
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

    # Card 4: Scanning Quality & Error Management
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

    # Card 5: Secure Local-to-Server Sync
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

    # Card 6: Hardware Telemetry & Control
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

    out_pdf = r"D:\OnScreenMarking\Smart_OSM_Corporate_Brochure_5Pages.pdf"
    writer = QPdfWriter(out_pdf)
    writer.setPageSize(QPageSize(QPageSize.PageSizeId.A4))
    writer.setPageOrientation(QPageLayout.Orientation.Portrait)
    layout = QPageLayout(QPageSize(QPageSize.PageSizeId.A4), QPageLayout.Orientation.Portrait, QMarginsF(0, 0, 0, 0))
    writer.setPageLayout(layout)
    writer.setResolution(300)

    painter = create_painter(writer)

    print("Rendering Page 1 of 5 (Smart OSM Scanning Software)...")
    render_page_1(painter, total_pages=5)

    print("Rendering Page 2 of 5 (Capture & Validate)...")
    writer.newPage()
    render_page_2(painter, total_pages=5)

    print("Rendering Page 3 of 5 (Archive & Quality Control - Summary Removed)...")
    writer.newPage()
    render_page_3_balanced(painter, total_pages=5)

    # Load 2nd PDF for Portal Pages
    portal_pdf_path = r"C:\Users\Administrator\.gemini\antigravity\brain\5dc4ce2f-3fd2-4fea-b100-79f5328c2216\.user_uploaded\media_1795014785805_823e0753.pdf"
    doc_portal = QPdfDocument(None)
    doc_portal.load(portal_pdf_path)
    render_opts = QPdfDocumentRenderOptions()

    print("Rendering Page 4 of 5 (OSM Portal Enterprise Edition)...")
    writer.newPage()
    img_p4 = doc_portal.render(0, QSize(PAGE_WIDTH, PAGE_HEIGHT), render_opts)
    painter.drawImage(QRectF(0, 0, PAGE_WIDTH, PAGE_HEIGHT), img_p4)

    # Clean footer update on Page 4 to "Page 4 of 5"
    footer_mask_rect4 = QRectF(2210, 3380, 180, 42)
    painter.fillRect(footer_mask_rect4, QColor("#FFFFFF"))
    font_pn = get_font("Plus Jakarta Sans", 16, bold=True)
    painter.setFont(font_pn)
    painter.setPen(QColor("#64748B"))
    painter.drawText(footer_mask_rect4, Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter, "Page 4 of 5")

    print("Rendering Page 5 of 5 (OSM Portal Evaluation & Governance)...")
    writer.newPage()
    img_p5 = doc_portal.render(1, QSize(PAGE_WIDTH, PAGE_HEIGHT), render_opts)
    painter.drawImage(QRectF(0, 0, PAGE_WIDTH, PAGE_HEIGHT), img_p5)

    # Clean footer update on Page 5 to "Page 5 of 5"
    footer_mask_rect5 = QRectF(2210, 3380, 180, 42)
    painter.fillRect(footer_mask_rect5, QColor("#FFFFFF"))
    painter.setFont(font_pn)
    painter.setPen(QColor("#64748B"))
    painter.drawText(footer_mask_rect5, Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter, "Page 5 of 5")

    painter.end()
    print(f"Successfully compiled 5-page brochure: {out_pdf}")
    print(f"File size: {os.path.getsize(out_pdf)} bytes")

    # Copy to destination paths
    shutil.copyfile(out_pdf, r"D:\OnScreenMarking\OSM_Corporate_Brochure_A4.pdf")
    shutil.copyfile(out_pdf, r"C:\Users\Administrator\.gemini\antigravity\brain\5dc4ce2f-3fd2-4fea-b100-79f5328c2216\Smart_OSM_Corporate_Brochure_5Pages.pdf")
    shutil.copyfile(out_pdf, r"C:\Users\Administrator\.gemini\antigravity\brain\5dc4ce2f-3fd2-4fea-b100-79f5328c2216\OSM_Corporate_Brochure_A4.pdf")

    # Render PNGs for visual inspection
    doc_out = QPdfDocument(None)
    doc_out.load(out_pdf)
    print("Exporting inspection PNGs for all 5 pages...")
    for i in range(doc_out.pageCount()):
        page_sz = doc_out.pagePointSize(i)
        scale = 1.0
        sz = QSize(int(page_sz.width() * scale), int(page_sz.height() * scale))
        img = doc_out.render(i, sz, render_opts)
        p_path = f"D:/OnScreenMarking/final_brochure_page_{i+1}.png"
        img.save(p_path)
        shutil.copyfile(p_path, f"C:/Users/Administrator/.gemini/antigravity/brain/5dc4ce2f-3fd2-4fea-b100-79f5328c2216/final_brochure_page_{i+1}.png")
        print(f"Saved {p_path}")

if __name__ == "__main__":
    main()
