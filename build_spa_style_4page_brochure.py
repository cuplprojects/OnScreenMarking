import base64
import os
import subprocess
import shutil

print("Reading images and encoding to base64...")

def get_base64_img(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode("utf-8")

img_scanner = get_base64_img(r"d:\OnScreenMarking\OSMNew\extracted_screenshots\screenshot_1_1700x980.png")
img_template = get_base64_img(r"d:\OnScreenMarking\OSMNew\extracted_screenshots\screenshot_2_1645x1087.png")
img_papers = get_base64_img(r"d:\OnScreenMarking\extracted_assets\cropped\app_content_3.png")
img_batch = get_base64_img(r"d:\OnScreenMarking\extracted_assets\cropped\batch_configure_modal.png")
img_marking = get_base64_img(r"d:\OnScreenMarking\extracted_assets\cropped\app_content_4.png")
img_settings = get_base64_img(r"d:\OnScreenMarking\extracted_assets\cropped\app_content_1.png")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OSM Platform - Smart On-Screen Marking & Evaluation Suite</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');

  @page {{
    size: A4 portrait;
    margin: 0;
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  body {{
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  .page {{
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    overflow: hidden;
    padding: 13mm 16mm 12mm 16mm;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #ffffff;
    position: relative;
  }}

  /* Top Running Header */
  .page-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2.2px solid #2563eb;
    padding-bottom: 7px;
    margin-bottom: 11px;
  }}

  .brand-group {{
    display: flex;
    align-items: center;
    gap: 9px;
  }}

  .brand-logo-icon {{
    width: 26px;
    height: 26px;
    background: #2563eb;
    color: #ffffff;
    font-weight: 800;
    font-size: 11px;
    letter-spacing: 0.5px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .brand-titles {{
    display: flex;
    flex-direction: column;
  }}

  .brand-main {{
    font-size: 13pt;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: 0.3px;
    line-height: 1.1;
  }}

  .brand-sub {{
    font-size: 7.2pt;
    font-weight: 700;
    color: #2563eb;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }}

  .header-right-tag {{
    font-size: 9.2pt;
    font-weight: 600;
    color: #475569;
  }}

  /* Content Containers */
  .content-area {{
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  /* Kicker & Title Block */
  .header-kicker {{
    font-size: 8.4pt;
    font-weight: 800;
    color: #1e40af;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 3px;
  }}

  .headline-main {{
    font-size: 18pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.22;
    margin-bottom: 6px;
    letter-spacing: -0.3px;
  }}

  .lead-desc {{
    font-size: 8.4pt;
    font-weight: 400;
    color: #334155;
    line-height: 1.46;
    text-align: justify;
    margin-bottom: 11px;
  }}

  .lead-desc strong {{
    color: #0f172a;
    font-weight: 700;
  }}

  /* Stat Metric Bar (Page 1) */
  .stat-grid-bar {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    padding: 8px 12px;
    text-align: center;
    margin-bottom: 12px;
  }}

  .stat-col {{
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }}

  .stat-val {{
    font-size: 20pt;
    font-weight: 800;
    color: #2563eb;
    line-height: 1.05;
  }}

  .stat-lbl {{
    font-size: 7.4pt;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-top: 2px;
  }}

  /* Numbered Section Header */
  .sec-heading {{
    font-size: 10.4pt;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 7px;
    display: flex;
    align-items: center;
    gap: 4px;
  }}

  .sec-heading span.num {{
    color: #2563eb;
  }}

  /* 2-Column Feature Grid with Left Accent Borders */
  .features-accent-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
    margin-bottom: 12px;
  }}

  .accent-item {{
    border-left: 3px solid #2563eb;
    padding-left: 9px;
  }}

  .accent-item-title {{
    font-size: 8.6pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 1px;
  }}

  .accent-item-desc {{
    font-size: 7.9pt;
    color: #475569;
    line-height: 1.36;
  }}

  /* 4-Column Clean Cards (Ingestion Hub) */
  .four-cols-card-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 9px;
    margin-bottom: 12px;
  }}

  .soft-card {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
  }}

  .soft-card-title {{
    font-size: 8.2pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }}

  .soft-card-desc {{
    font-size: 7.4pt;
    color: #475569;
    line-height: 1.34;
  }}

  /* App Screenshot Window Frame */
  .screenshot-card {{
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }}

  .screenshot-topbar {{
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 5px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8pt;
    font-weight: 700;
    color: #1e293b;
  }}

  .screenshot-filename {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.5pt;
    color: #475569;
    font-weight: 600;
  }}

  .screenshot-img-wrap {{
    width: 100%;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }}

  .screenshot-img {{
    display: block;
    width: 100%;
    height: auto;
    max-height: 155px;
    object-fit: cover;
  }}

  .screenshot-img-tall {{
    display: block;
    width: 100%;
    height: auto;
    max-height: 150px;
    object-fit: cover;
  }}

  .screenshot-caption {{
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 6px 12px;
    font-size: 7.8pt;
    color: #334155;
    line-height: 1.36;
  }}

  .screenshot-caption strong {{
    color: #0f172a;
  }}

  /* Page 2: 8 Numbered Audits */
  .audits-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
    margin-bottom: 12px;
  }}

  .audit-item {{
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }}

  .audit-num {{
    width: 18px;
    height: 18px;
    background: #2563eb;
    color: #ffffff;
    font-size: 7.6pt;
    font-weight: 800;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }}

  .audit-text {{
    flex: 1;
  }}

  .audit-title {{
    font-size: 8.5pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 1px;
  }}

  .audit-desc {{
    font-size: 7.8pt;
    color: #475569;
    line-height: 1.35;
  }}

  /* Highlight Banner (Green / Emerald) */
  .highlight-banner {{
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 12px;
  }}

  .banner-top {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3px;
  }}

  .banner-title {{
    font-size: 8.8pt;
    font-weight: 800;
    color: #166534;
  }}

  .banner-pill {{
    background: #16a34a;
    color: #ffffff;
    font-size: 7.2pt;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    letter-spacing: 0.3px;
  }}

  .banner-desc {{
    font-size: 7.9pt;
    color: #15803d;
    line-height: 1.37;
  }}

  /* Side-by-Side Dual Screenshots (Page 2) */
  .dual-screenshot-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }}

  /* Alternating Split Rows (Page 3) */
  .split-row {{
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    gap: 14px;
    align-items: center;
    margin-bottom: 12px;
  }}

  .split-row.reverse {{
    grid-template-columns: 1fr 1.05fr;
  }}

  .split-content {{
    display: flex;
    flex-direction: column;
    justify-content: center;
  }}

  .split-kicker {{
    font-size: 8pt;
    font-weight: 800;
    color: #1e40af;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    margin-bottom: 2px;
  }}

  .split-title {{
    font-size: 11.5pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.22;
    margin-bottom: 6px;
  }}

  .split-feature-list {{
    display: flex;
    flex-direction: column;
    gap: 5px;
  }}

  .split-feature-item {{
    font-size: 7.9pt;
    color: #475569;
    line-height: 1.36;
  }}

  .split-feature-item strong {{
    color: #0f172a;
    font-weight: 700;
  }}

  /* Middle Callout Strip (Page 3) */
  .allocation-callout-box {{
    background: #eff6ff;
    border: 1px dashed #93c5fd;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 11px;
    font-size: 7.9pt;
    color: #1e40af;
    line-height: 1.38;
  }}

  .allocation-callout-box strong {{
    color: #1e3a8a;
  }}

  /* Strip Bar (Bottom of Page 3) */
  .horizontal-trust-strip {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
    text-align: center;
    gap: 8px;
  }}

  .trust-strip-item {{
    font-size: 7.7pt;
    font-weight: 700;
    color: #1e293b;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    white-space: nowrap;
  }}

  .trust-strip-item span.chk {{
    color: #2563eb;
    font-weight: 800;
  }}

  /* 5-Stage Chevron / Horizontal Pipeline (Page 4) */
  .pipeline-five-grid {{
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 7px;
    margin-bottom: 11px;
  }}

  .pipeline-card {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 7px 8px;
  }}

  .pipeline-stage-tag {{
    font-size: 7pt;
    font-weight: 800;
    color: #2563eb;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 2px;
  }}

  .pipeline-card-title {{
    font-size: 8.2pt;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 2px;
  }}

  .pipeline-card-desc {{
    font-size: 7.2pt;
    color: #475569;
    line-height: 1.32;
  }}

  /* Page 4 Section 02 4-Cols */
  .four-governance-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 9px;
    margin-bottom: 8px;
  }}

  .governance-card {{
    border-left: 3px solid #2563eb;
    padding-left: 8px;
  }}

  .governance-title {{
    font-size: 8.3pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }}

  .governance-desc {{
    font-size: 7.5pt;
    color: #475569;
    line-height: 1.34;
  }}

  /* Page 4 Dashed Callout */
  .governance-dashed-callout {{
    background: #eff6ff;
    border: 1px dashed #93c5fd;
    border-radius: 6px;
    padding: 7px 11px;
    margin-bottom: 10px;
    font-size: 7.8pt;
    color: #1e40af;
    line-height: 1.37;
  }}

  .governance-dashed-callout strong {{
    color: #1e3a8a;
  }}

  /* Page 4 Executive Center Strip */
  .executive-center-strip {{
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 12px;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 11px;
    margin-bottom: 10px;
  }}

  .exec-content {{
    display: flex;
    flex-direction: column;
  }}

  .exec-kicker {{
    font-size: 7.6pt;
    font-weight: 800;
    color: #1e40af;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    margin-bottom: 2px;
  }}

  .exec-title {{
    font-size: 10.8pt;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 4px;
  }}

  .exec-desc {{
    font-size: 7.8pt;
    color: #475569;
    line-height: 1.38;
  }}

  /* Page 4 Security Pillars (Vertical Dividers) */
  .security-pillars-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
  }}

  .pillar-col {{
    padding: 0 10px;
    border-right: 1px solid #cbd5e1;
  }}

  .pillar-col:first-child {{
    padding-left: 0;
  }}

  .pillar-col:last-child {{
    border-right: none;
    padding-right: 0;
  }}

  .pillar-title {{
    font-size: 8.5pt;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 2px;
  }}

  .pillar-desc {{
    font-size: 7.5pt;
    color: #475569;
    line-height: 1.36;
  }}

  /* Running Page Footer */
  .page-footer {{
    border-top: 1px solid #cbd5e1;
    padding-top: 6px;
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.5pt;
    color: #64748b;
    font-weight: 500;
  }}

  .footer-left {{
    font-weight: 600;
    color: #334155;
  }}
</style>
</head>
<body>

<!-- ==========================================
     PAGE 1: ARCHITECTURE & HIGH-SPEED INGESTION
     ========================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-group">
      <div class="brand-logo-icon">OSM</div>
      <div class="brand-titles">
        <div class="brand-main">OSM PLATFORM</div>
        <div class="brand-sub">SMART ON-SCREEN MARKING & EVALUATION SUITE</div>
      </div>
    </div>
    <div class="header-right-tag">Intelligent Assessment Architecture</div>
  </div>

  <div class="content-area">
    <div>
      <div class="header-kicker">ENTERPRISE ASSESSMENT ARCHITECTURE</div>
      <h1 class="headline-main">Transforming Examination Evaluation Through Intelligent Technology</h1>
      <p class="lead-desc">
        The <strong>OSM Platform</strong> represents a generational leap in high-stakes examination evaluation and operational intelligence. Traditional paper-based assessment workflows face severe manual logistics delays, vulnerable physical script custody, untracked arithmetic totaling errors, and unverified examiner variance. OSM eliminates these operational risks through an end-to-end, automated evaluation pipeline. By unifying <strong>built-in high-speed hardware digitisation</strong>, <strong>neural sequence verification</strong>, <strong>dynamic section rubric blueprints</strong>, and <strong>automated quota allocation with anti-rush pacing</strong>, OSM ensures absolute evaluation accuracy, sub-second grading throughput, and complete statutory transparency.
      </p>

      <div class="stat-grid-bar">
        <div class="stat-col">
          <div class="stat-val">100%</div>
          <div class="stat-lbl">Blind Barcode Anonymity</div>
        </div>
        <div class="stat-col">
          <div class="stat-val">300 DPI</div>
          <div class="stat-lbl">Hardware Bridged Ingest</div>
        </div>
        <div class="stat-col">
          <div class="stat-val">0%</div>
          <div class="stat-lbl">Arithmetic Totaling Drift</div>
        </div>
        <div class="stat-col">
          <div class="stat-val">10&times;</div>
          <div class="stat-lbl">Marking Turnaround Velocity</div>
        </div>
      </div>

      <div class="sec-heading"><span class="num">1.</span> Inbuilt Booklet Digitisation &bull; Zero-Friction Scan Ingestion</div>
      <div class="features-accent-grid">
        <div class="accent-item">
          <div class="accent-item-title">Native Hardware Integration (CZUR & TWAIN)</div>
          <div class="accent-item-desc">Direct driver & SDK bridging with overhead production scanners (CZUR ET/Aura) and high-volume TWAIN document units without third-party middleware dependencies.</div>
        </div>
        <div class="accent-item">
          <div class="accent-item-title">Spine Curvature Flattening (FlatBookAlgorithm)</div>
          <div class="accent-item-desc">Real-time book-curve flattening algorithms, automated finger-removal masking, and intelligent background whitening purification for crisp legibility.</div>
        </div>
        <div class="accent-item">
          <div class="accent-item-title">Zero-Latency Multi-Threading (AsyncIngest)</div>
          <div class="accent-item-desc">Asynchronous background disk compression and multi-threading separate real-time 1080p video capture from PDF rendering for non-stop feeding.</div>
        </div>
        <div class="accent-item">
          <div class="accent-item-title">Ergonomic Operator Triggers (Pedal & Spacebar)</div>
          <div class="accent-item-desc">Hands-free USB foot pedal switches, spacebar hotkeys, and optical turn-sensors ensure rapid, zero-fatigue physical booklet turnover.</div>
        </div>
      </div>

      <div class="sec-heading"><span class="num">2.</span> Multi-Stream Ingestion Hub &bull; The 4 Examination Imports</div>
      <div class="four-cols-card-grid">
        <div class="soft-card">
          <div class="soft-card-title">1. Scanned Booklets</div>
          <div class="soft-card-desc">High-resolution dual-pass PDF/A compilation bound to candidate physical barcodes and covers.</div>
        </div>
        <div class="soft-card">
          <div class="soft-card-title">2. Master Papers</div>
          <div class="soft-card-desc">Official question papers, marking rubrics, and answer keys synchronized to Paper Codes.</div>
        </div>
        <div class="soft-card">
          <div class="soft-card-title">3. Candidate Rosters</div>
          <div class="soft-card-desc">Master enrollment registers (Roll Numbers, Centers, Subjects) for automated identity validation.</div>
        </div>
        <div class="soft-card">
          <div class="soft-card-title">4. Center Attendance</div>
          <div class="soft-card-desc">Exam-center attendance and absentee records reconciled to detect missing or proxy candidates.</div>
        </div>
      </div>
    </div>

    <div class="screenshot-card">
      <div class="screenshot-topbar">
        <span>Native Inbuilt Scanner Studio & Hardware Bridging Console</span>
        <span class="screenshot-filename">scanner_studio.png</span>
      </div>
      <div class="screenshot-img-wrap">
        <img class="screenshot-img" src="{img_scanner}" alt="Scanner Studio">
      </div>
      <div class="screenshot-caption">
        <strong>Inbuilt Digitisation in Practice:</strong> Live 1080p camera feed with real-time spine curvature flattening, 300 DPI optical purity, and automatic background whitening for non-stop booklet intake.
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">OSM Platform &bull; Inbuilt Digitisation & Ingestion Architecture</div>
    <div>CZUR & TWAIN Bridging &bull; 4 Ingestion Streams &bull; Zero Vendor Lock-In</div>
    <div>Page 1 of 4</div>
  </div>
</div>

<!-- ==========================================
     PAGE 2: INGESTION QUALITY & TEMPLATE CALIBRATION
     ========================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-group">
      <div class="brand-logo-icon">OSM</div>
      <div class="brand-titles">
        <div class="brand-main">OSM PLATFORM</div>
        <div class="brand-sub">PRE-MARKING QUALITY DEFENSE & TEMPLATE CALIBRATION</div>
      </div>
    </div>
    <div class="header-right-tag">Scanner Desk Quality Assurance</div>
  </div>

  <div class="content-area">
    <div>
      <div class="header-kicker">DATA QUALITY DEFENSE</div>
      <h1 class="headline-main">The 8 Mandatory Ingestion Audits & Visual Template Calibration</h1>
      <p class="lead-desc">
        Before answer scripts enter evaluation, OSM executes an automated multi-stage pre-scoring integrity audit at the scanning desk. Rather than allowing corrupted, mis-ordered, or unverified booklets to reach evaluators, the system detects anomalies at the point of ingestion, routing flagged exceptions directly to the <strong>Visual Calibration & Audit Screen</strong>.
      </p>

      <div class="audits-grid">
        <div class="audit-item">
          <div class="audit-num">1</div>
          <div class="audit-text">
            <div class="audit-title">Multi-Pass Neural OCR (SequenceAudit)</div>
            <div class="audit-desc">Extracts and audits printed booklet page numbers on the fly, immediately detecting missing pages, sequence jumps, or scanning skips.</div>
          </div>
        </div>
        <div class="audit-item">
          <div class="audit-num">5</div>
          <div class="audit-text">
            <div class="audit-title">Missing Script Reconciliation (MissingScripts)</div>
            <div class="audit-desc">Triangulates physical booklet scans with registered candidate lists and absentee logs, ensuring zero missing physical scripts.</div>
          </div>
        </div>

        <div class="audit-item">
          <div class="audit-num">2</div>
          <div class="audit-text">
            <div class="audit-title">Two-Page Facing Spread Detection (SpreadParity)</div>
            <div class="audit-desc">Mathematical parity checking (2k, 2k+1) prevents false sequence jump warnings on open booklet spreads and duplex scans.</div>
          </div>
        </div>
        <div class="audit-item">
          <div class="audit-num">6</div>
          <div class="audit-text">
            <div class="audit-title">Barcode Syntax & Occurrence Audit (BarcodeAudit)</div>
            <div class="audit-desc">Enforces structural booklet syntax, verifying that mandatory candidate barcodes appear exactly once and match series checksums.</div>
          </div>
        </div>

        <div class="audit-item">
          <div class="audit-num">3</div>
          <div class="audit-text">
            <div class="audit-title">Interactive Sequence Nudge (VisualCorrection)</div>
            <div class="audit-desc">Side-by-side ROI close-ups and horizontal nudge buttons allow instant operator adjustments with zero booklet re-scan.</div>
          </div>
        </div>
        <div class="audit-item">
          <div class="audit-num">7</div>
          <div class="audit-text">
            <div class="audit-title">Roster Registration Cross-Match (RosterAudit)</div>
            <div class="audit-desc">Cross-checks scanned candidate codes against master institutional databases to isolate unregistered or mistyped candidates.</div>
          </div>
        </div>

        <div class="audit-item">
          <div class="audit-num">4</div>
          <div class="audit-text">
            <div class="audit-title">Non-Destructive Page Rescanning (ZeroAuditVoid)</div>
            <div class="audit-desc">Replace defective or folded pages on-the-fly without invalidating or re-scanning the rest of the physical candidate booklet.</div>
          </div>
        </div>
        <div class="audit-item">
          <div class="audit-num">8</div>
          <div class="audit-text">
            <div class="audit-title">Optical Quality & Glare Audit (LightingGuard)</div>
            <div class="audit-desc">Real-time illumination sensors detect uneven lighting, glare, or physical optical obstruction before compiling the final PDF/A.</div>
          </div>
        </div>
      </div>

      <div class="highlight-banner">
        <div class="banner-top">
          <div class="banner-title">High-Throughput Visual Template Calibration & Coordinate Mapping</div>
          <div class="banner-pill">Zero-Code Schema Generation &bull; 1-Click Calibration</div>
        </div>
        <div class="banner-desc">
          On the <strong>Interactive Visual Template Editor</strong>, administrators define booklet sheet dimensions, page number bounding boxes, barcode positions, and confidential candidate mask zones with drag-and-drop ease. Calibrate a master template once, and execute automated audits across tens of thousands of candidate booklets with zero drift.
        </div>
      </div>
    </div>

    <div class="dual-screenshot-grid">
      <div class="screenshot-card">
        <div class="screenshot-topbar">
          <span>Visual Template & ROI Coordinate Editor</span>
          <span class="screenshot-filename">template_editor.png</span>
        </div>
        <div class="screenshot-img-wrap">
          <img class="screenshot-img-tall" src="{img_template}" alt="Template Editor">
        </div>
        <div class="screenshot-caption">
          <strong>Interactive Visual Calibration:</strong> Visually configure page number ROI bounding boxes, barcode regions, and confidential blur zones.
        </div>
      </div>

      <div class="screenshot-card">
        <div class="screenshot-topbar">
          <span>Master Paper & Section Blueprint Hub</span>
          <span class="screenshot-filename">papers_management.png</span>
        </div>
        <div class="screenshot-img-wrap">
          <img class="screenshot-img-tall" src="{img_papers}" alt="Papers Management">
        </div>
        <div class="screenshot-caption">
          <strong>Centralized Paper Management:</strong> Registers official Catch Numbers, links master Question Paper PDFs, and validates readiness checkpoints.
        </div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">OSM Platform &bull; Pre-Marking Ingestion Quality & Template Calibration</div>
    <div>8 Ingestion Audits &bull; Visual ROI Calibration &bull; Catch Number Mapping</div>
    <div>Page 2 of 4</div>
  </div>
</div>

<!-- ==========================================
     PAGE 3: RUBRICS, ALLOCATION & MARKING WORKSPACE
     ========================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-group">
      <div class="brand-logo-icon">OSM</div>
      <div class="brand-titles">
        <div class="brand-main">OSM PLATFORM</div>
        <div class="brand-sub">CURRICULUM RUBRICS & MARKING WORKSPACE</div>
      </div>
    </div>
    <div class="header-right-tag">Precision Question-Wise Evaluation</div>
  </div>

  <div class="content-area">
    <div>
      <div class="header-kicker">DYNAMIC EVALUATION ARCHITECTURE</div>
      <h1 class="headline-main">Section Batch Rubrics, Examiner Allocation & Marking Workspace</h1>
      <p class="lead-desc">
        Evaluation excellence requires mathematical rubric rigor and absolute candidate anonymity. OSM enforces granular section blueprints, automated fair script distribution, and an ergonomic digital marking workspace with zero arithmetic calculation drift.
      </p>

      <!-- Row 1: Image Left, Text Right -->
      <div class="split-row">
        <div class="screenshot-card">
          <div class="screenshot-topbar">
            <span>Section Batch Rubric Blueprint Modal</span>
            <span class="screenshot-filename">batch_configure.png</span>
          </div>
          <div class="screenshot-img-wrap">
            <img class="screenshot-img-tall" src="{img_batch}" alt="Section Batch Blueprint">
          </div>
          <div class="screenshot-caption">
            <strong>Dynamic Section Blueprint:</strong> Configures Section A/B/C batches, optional rules ("Attempt Any 5 of 8"), and validates mathematical sum integrity.
          </div>
        </div>

        <div class="split-content">
          <div class="split-kicker">GRANULAR RUBRIC DESIGN</div>
          <div class="split-title">Multi-Tier Section Architecture & Optional Controls</div>
          <div class="split-feature-list">
            <div class="split-feature-item">
              <strong>Multi-Tier Section Architecture (SectionBatchConfig):</strong> Structure papers into distinct logical sections (Section A: MCQs, Section B: Analytical, Section C: Descriptive Long Essay) with defined question ranges.
            </div>
            <div class="split-feature-item">
              <strong>Flexible Optional Controls ("Attempt Any 5 of 8"):</strong> Configure grouping rules (Group A/B) — the evaluation engine automatically honors best-marked answers and flags surplus attempts.
            </div>
            <div class="split-feature-item">
              <strong>Mathematical Sum Integrity:</strong> The validation engine strictly ensures that the sum of all individual question marks mathematically matches the paper's maximum marks before locking.
            </div>
          </div>
        </div>
      </div>

      <!-- Row 2: Text Left, Image Right -->
      <div class="split-row reverse">
        <div class="split-content">
          <div class="split-kicker">WORKLOAD DISTRIBUTION & FAIR ALLOCATION</div>
          <div class="split-title">Examiner Allocation Models & Anti-Collusion Delivery</div>
          <div class="split-feature-list">
            <div class="split-feature-item">
              <strong>Faculty Invitation & Ordering:</strong> Invite certified faculty via secure invitation tokens, assign them to specific subjects, and configure workload priority ordering (First Marker, Moderator).
            </div>
            <div class="split-feature-item">
              <strong>Equal Distribution + Date Limit:</strong> Mathematically partitions scanned answer scripts equally across all verified examiners for that paper, enforced with a strict Completion Date Target.
            </div>
            <div class="split-feature-item">
              <strong>Daily Quota Allocation & Randomization:</strong> Allots scripts under strict daily quota caps (e.g., 50 scripts/day). All scripts are delivered in randomized order to eliminate bias and prevent collusion.
            </div>
          </div>
        </div>

        <div class="screenshot-card">
          <div class="screenshot-topbar">
            <span>Live On-Screen Marking Workspace</span>
            <span class="screenshot-filename">marking_workspace.png</span>
          </div>
          <div class="screenshot-img-wrap">
            <img class="screenshot-img-tall" src="{img_marking}" alt="Marking Workspace">
          </div>
          <div class="screenshot-caption">
            <strong>Live Candidate Script Marking:</strong> 100% blind barcode masking, question-wise rubric scoring palette, annotation stamps, and real-time arithmetic tally.
          </div>
        </div>
      </div>

      <div class="allocation-callout-box">
        <strong>Automated Script Snatching & Workload Balancing:</strong> If an examiner falls behind schedule or remains inactive past their quota deadline, coordinators can instantly snatch un-evaluated scripts and reallocate them across active examiners, preventing bottlenecks and ensuring timely result declaration.
      </div>
    </div>

    <div class="horizontal-trust-strip">
      <div class="trust-strip-item"><span class="chk">&check;</span> 100% Blind Anonymity</div>
      <div class="trust-strip-item"><span class="chk">&check;</span> Question-Wise Rubric Scoring</div>
      <div class="trust-strip-item"><span class="chk">&check;</span> Precision Annotation Stamps</div>
      <div class="trust-strip-item"><span class="chk">&check;</span> 0% Arithmetic Drift</div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">OSM Platform &bull; Section Rubric Architecture & Live Evaluation Workspace</div>
    <div>Dynamic Optional Rules &bull; Randomized Allocation &bull; 100% Blind Anonymity</div>
    <div>Page 3 of 4</div>
  </div>
</div>

<!-- ==========================================
     PAGE 4: OPERATIONS & INSTITUTIONAL GOVERNANCE
     ========================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-group">
      <div class="brand-logo-icon">OSM</div>
      <div class="brand-titles">
        <div class="brand-main">OSM PLATFORM</div>
        <div class="brand-sub">OPERATIONS & INSTITUTIONAL GOVERNANCE</div>
      </div>
    </div>
    <div class="header-right-tag">Execution Pipeline & Regulatory Compliance</div>
  </div>

  <div class="content-area">
    <div>
      <div class="sec-heading"><span class="num">01</span> End-to-End Operational Lifecycle Pipeline</div>
      <div class="pipeline-five-grid">
        <div class="pipeline-card">
          <div class="pipeline-stage-tag">Stage 1</div>
          <div class="pipeline-card-title">Ingestion & Sync</div>
          <div class="pipeline-card-desc">Batch booklet scanning, curvature flattening, barcode binding, and local-to-cloud synchronization.</div>
        </div>
        <div class="pipeline-card">
          <div class="pipeline-stage-tag">Stage 2</div>
          <div class="pipeline-card-title">Blueprint & Rubrics</div>
          <div class="pipeline-card-desc">Master QP upload, Catch Number mapping, section batch configuration, and mathematical sum locking.</div>
        </div>
        <div class="pipeline-card">
          <div class="pipeline-stage-tag">Stage 3</div>
          <div class="pipeline-card-title">Quota Allocation</div>
          <div class="pipeline-card-desc">Examiner invitation tokens, equal distribution, daily allocation caps, and randomized script ordering.</div>
        </div>
        <div class="pipeline-card">
          <div class="pipeline-stage-tag">Stage 4</div>
          <div class="pipeline-card-title">Blind Marking</div>
          <div class="pipeline-card-desc">100% blind barcode masking, rubric palette scoring, anti-rush speed pacing, and annotation stamps.</div>
        </div>
        <div class="pipeline-card">
          <div class="pipeline-stage-tag">Stage 5</div>
          <div class="pipeline-card-title">Audit & Results</div>
          <div class="pipeline-card-desc">Dynamic script snatching, 2FA administrative security, immutable audit trail, and result gazette export.</div>
        </div>
      </div>

      <div class="sec-heading"><span class="num">02</span> Evaluation Governance & Speed Pacing Engine</div>
      <div class="four-governance-grid">
        <div class="governance-card">
          <div class="governance-title">Script Checking Time Limits</div>
          <div class="governance-desc">Enforce mandatory minimum checking duration per booklet (e.g. 15 min/copy) to prevent rushed evaluations.</div>
        </div>
        <div class="governance-card">
          <div class="governance-title">Dynamic Script Snatching</div>
          <div class="governance-desc">Administrators instantly overwrite allocation quotas and snatch un-evaluated scripts from inactive examiners.</div>
        </div>
        <div class="governance-card">
          <div class="governance-title">AI Proctoring & Idle Lockouts</div>
          <div class="governance-desc">Continuous evaluator facial landmark verification, browser tab-blur detection, and automatic session lockouts.</div>
        </div>
        <div class="governance-card">
          <div class="governance-title">Institutional 2FA Security</div>
          <div class="governance-desc">Mandatory two-factor authentication for examiner logins and strict Role-Based Access Control (RBAC).</div>
        </div>
      </div>

      <div class="governance-dashed-callout">
        <strong>Automated Anti-Collusion & Speed Pacing Protocol:</strong> Evaluators are held to a mandatory minimum reading threshold (e.g., 15 minutes/booklet) while candidate scripts are delivered strictly under random pseudonymized tokens. If an evaluator remains inactive or fails daily milestones, the administrative engine triggers automated script snatching to reclaim scripts into the active pool with zero grading bottlenecks.
      </div>

      <div class="executive-center-strip">
        <div class="screenshot-card" style="margin-bottom: 0;">
          <div class="screenshot-topbar">
            <span>Institutional Governance & Security Preferences</span>
            <span class="screenshot-filename">system_preferences.png</span>
          </div>
          <div class="screenshot-img-wrap">
            <img class="screenshot-img-tall" src="{img_settings}" alt="System Preferences" style="max-height: 108px;">
          </div>
        </div>
        <div class="exec-content">
          <div class="exec-kicker">OPERATIONAL OVERSIGHT</div>
          <div class="exec-title">Executive Command & Institutional Governance</div>
          <div class="exec-desc">
            Provides leadership with unified, real-time command over assessment cycles. Tracks aggregate attendance, scanned batch ingestion rates, audit progress percentages, and evaluator throughput from a single unified portal.
          </div>
        </div>
      </div>

      <div class="sec-heading" style="margin-top: 6px;"><span class="num">03</span> Enterprise Security & Architecture</div>
      <div class="security-pillars-grid">
        <div class="pillar-col">
          <div class="pillar-title">Dual Database Sync</div>
          <div class="pillar-desc">Offline Local SQLite/SQL Express at scanning centers with encrypted TLS 1.3 sync to central cloud repository.</div>
        </div>
        <div class="pillar-col">
          <div class="pillar-title">Immutable Audit Trail</div>
          <div class="pillar-desc">Every mark awarded, stamp affixed, script allocated or snatched logs timestamp, user ID, IP, and delta.</div>
        </div>
        <div class="pillar-col">
          <div class="pillar-title">Sub-Second Evaluation</div>
          <div class="pillar-desc">Optimized compiled evaluation engine effortlessly supports 10,000+ simultaneous online evaluators.</div>
        </div>
        <div class="pillar-col">
          <div class="pillar-title">Litigation Immunity</div>
          <div class="pillar-desc">Transparent cryptographic digital answer scripts and question-wise proofs withstand judicial scrutiny and RTI audits.</div>
        </div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">OSM Platform &bull; Operational Pipeline, Evaluation Governance & Enterprise Architecture</div>
    <div>Anti-Rush Pacing &bull; Dynamic Script Snatching &bull; Immutable Audit Trail</div>
    <div>Page 4 of 4</div>
  </div>
</div>

</body>
</html>
"""

html_out_path = r"d:\OnScreenMarking\osm_spa_style_4page_brochure.html"
with open(html_out_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML successfully generated: {html_out_path} ({len(html_content)} characters)")
