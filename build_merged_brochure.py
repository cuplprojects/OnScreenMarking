import os
import base64
import subprocess

def get_b64(path):
    with open(path, 'rb') as f:
        ext = os.path.splitext(path)[1].lower()
        mime = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png'
        return f'data:{mime};base64,' + base64.b64encode(f.read()).decode('utf-8')

scan_studio_b64 = get_b64('extracted_assets/new_pdf/page_1.jpg')
papers_hub_b64 = get_b64('extracted_assets/cropped/app_content_3.png')
batch_modal_b64 = get_b64('extracted_assets/cropped/batch_configure_modal.png')
eval_workspace_b64 = get_b64('extracted_assets/cropped/app_content_4.png')
settings_b64 = get_b64('extracted_assets/cropped/app_content_1.png')

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Smart OSM - Scanning Software & On-Screen Marking Platform</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');

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
    color: #0f172a;
    background-color: #f8fafc;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  .page {{
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    padding: 8mm 11mm 7.5mm 11mm;
    page-break-after: always;
    page-break-inside: avoid;
    overflow: hidden;
    position: relative;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  /* Top Right Ambient Glow */
  .page::before {{
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 90mm;
    height: 90mm;
    background: radial-gradient(circle at top right, rgba(2, 132, 199, 0.08), transparent 70%);
    pointer-events: none;
    z-index: 0;
  }}

  .content-layer {{
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
  }}

  /* Header Bar */
  .header-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 1.8mm;
    border-bottom: 1.5px solid #e2e8f0;
  }}

  .brand-group {{
    display: flex;
    align-items: center;
    gap: 2.5mm;
  }}

  .brand-logo-icon {{
    width: 7.8mm;
    height: 7.8mm;
    background: linear-gradient(135deg, #0284c7 0%, #0b192c 100%);
    border-radius: 1.8mm;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 800;
    font-size: 10.5pt;
    letter-spacing: -0.5px;
    box-shadow: 0 2px 5px rgba(2, 132, 199, 0.28);
  }}

  .brand-title-wrap {{
    display: flex;
    flex-direction: column;
  }}

  .brand-name {{
    font-size: 12.5pt;
    font-weight: 800;
    letter-spacing: -0.3px;
    color: #0b192c;
    display: flex;
    align-items: center;
    gap: 1.8mm;
  }}

  .brand-badge {{
    font-size: 6.2pt;
    font-weight: 700;
    background: #e0f2fe;
    color: #0369a1;
    padding: 0.8px 5px;
    border-radius: 3px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }}

  .brand-sub {{
    font-size: 6.5pt;
    font-weight: 600;
    letter-spacing: 0.4px;
    color: #64748b;
    text-transform: uppercase;
  }}

  .header-pills {{
    display: flex;
    align-items: center;
    gap: 1.8mm;
  }}

  .pill {{
    font-size: 6.4pt;
    font-weight: 700;
    padding: 1.5px 6.5px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 1mm;
  }}

  .pill-teal {{
    background: #f0fdfa;
    color: #0d9488;
    border: 1px solid #99f6e4;
  }}

  .pill-navy {{
    background: #0b192c;
    color: #ffffff;
  }}

  /* Hero Headline Block */
  .hero-block {{
    margin-top: 1.8mm;
    margin-bottom: 1.8mm;
  }}

  .hero-eyebrow {{
    display: inline-flex;
    align-items: center;
    gap: 1.4mm;
    font-size: 6.4pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: #0284c7;
    margin-bottom: 0.6mm;
  }}

  .hero-headline {{
    font-size: 13.8pt;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.3px;
    color: #0b192c;
  }}

  .hero-subhead {{
    font-size: 7pt;
    font-weight: 500;
    line-height: 1.32;
    color: #475569;
    margin-top: 0.8mm;
  }}

  /* 7-Step Connected Platform Workflow Strip */
  .platform-workflow {{
    background: linear-gradient(90deg, #0b192c 0%, #1e293b 100%);
    border-radius: 1.8mm;
    padding: 1.6mm 2.2mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2mm;
    box-shadow: 0 2px 4px rgba(11, 25, 44, 0.08);
  }}

  .pf-step {{
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.4mm;
  }}

  .pf-step-header {{
    display: flex;
    align-items: center;
    gap: 1mm;
  }}

  .pf-num {{
    width: 3.4mm;
    height: 3.4mm;
    border-radius: 50%;
    background: #0284c7;
    color: white;
    font-size: 5.2pt;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .pf-num.portal-active {{
    background: #0d9488;
  }}

  .pf-title {{
    font-size: 5.8pt;
    font-weight: 700;
    color: #f8fafc;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }}

  .pf-sub {{
    font-size: 4.8pt;
    color: #94a3b8;
    font-weight: 500;
  }}

  .pf-arrow {{
    color: #38bdf8;
    font-size: 6.8pt;
    font-weight: bold;
    opacity: 0.7;
    margin: 0 0.5mm;
  }}

  /* Stat Badges Strip (4 Tiers) */
  .stats-strip {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2mm;
    margin-bottom: 2mm;
  }}

  .stat-pill-box {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1.5mm;
    padding: 1.2mm 1.8mm;
    display: flex;
    flex-direction: column;
  }}

  .stat-top {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }}

  .stat-value {{
    font-size: 8.5pt;
    font-weight: 800;
    color: #0b192c;
  }}

  .stat-badge-tag {{
    font-size: 5.2pt;
    font-weight: 700;
    color: #0284c7;
    background: #f0f9ff;
    padding: 0.5px 3.5px;
    border-radius: 2px;
  }}

  .stat-desc {{
    font-size: 5.2pt;
    font-weight: 500;
    color: #64748b;
    margin-top: 0.3mm;
  }}

  /* Continuous Content Block (No Awkward Gaps) */
  .content-block {{
    border-top: 1px solid #e2e8f0;
    padding-top: 1.8mm;
    margin-top: 1.8mm;
  }}

  .block-header {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1.2mm;
  }}

  .block-title-wrap {{
    display: flex;
    align-items: center;
    gap: 1.8mm;
  }}

  .stage-badge {{
    font-size: 5.5pt;
    font-weight: 800;
    color: #ffffff;
    background: #0284c7;
    padding: 1px 4.5px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }}

  .stage-badge.portal {{
    background: #0d9488;
  }}

  .block-title {{
    font-size: 8.2pt;
    font-weight: 800;
    color: #0b192c;
    letter-spacing: -0.2px;
  }}

  .block-sub {{
    font-size: 5.8pt;
    font-weight: 600;
    color: #64748b;
  }}

  /* Split Layouts (Image + Content) */
  .split-layout {{
    display: grid;
    grid-template-columns: 1.22fr 1fr;
    gap: 2.8mm;
    align-items: center;
  }}

  .split-layout.reverse {{
    grid-template-columns: 1fr 1.22fr;
  }}

  /* Browser / Device Frame */
  .browser-frame {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 1.8mm;
    box-shadow: 0 3px 8px rgba(15, 23, 42, 0.06);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }}

  .browser-header {{
    background: #f1f5f9;
    padding: 1mm 2.2mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e2e8f0;
  }}

  .browser-dots {{
    display: flex;
    gap: 1mm;
  }}

  .dot {{
    width: 1.8mm;
    height: 1.8mm;
    border-radius: 50%;
  }}
  .dot-red {{ background: #ef4444; }}
  .dot-yellow {{ background: #f59e0b; }}
  .dot-green {{ background: #10b981; }}

  .browser-url {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 5.2pt;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    padding: 0.5px 4mm;
    border-radius: 1mm;
    color: #475569;
    font-weight: 500;
  }}

  .browser-tag {{
    font-size: 5.4pt;
    font-weight: 700;
    color: #0369a1;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }}

  .browser-img {{
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
  }}

  .caption-strip {{
    background: #0f172a;
    color: #f8fafc;
    padding: 1mm 2mm;
    font-size: 5.5pt;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }}

  .caption-strip .highlight {{
    color: #38bdf8;
    font-weight: 700;
  }}

  /* Clean Feature List */
  .feature-list {{
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1.4mm;
  }}

  .feature-item {{
    display: flex;
    align-items: flex-start;
    gap: 1.6mm;
  }}

  .f-check {{
    width: 3.4mm;
    height: 3.4mm;
    border-radius: 50%;
    background: #e0f2fe;
    color: #0284c7;
    font-size: 5pt;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 0.4px;
  }}

  .f-check.teal {{
    background: #f0fdfa;
    color: #0d9488;
  }}

  .f-text-title {{
    font-size: 6.4pt;
    font-weight: 800;
    color: #0b192c;
    line-height: 1.15;
  }}

  .f-text-desc {{
    font-size: 5.5pt;
    font-weight: 500;
    color: #475569;
    line-height: 1.28;
    margin-top: 0.3mm;
  }}

  /* Allocation & Distribution Strip (Page 2) */
  .allocation-banner {{
    background: linear-gradient(135deg, #091a2f 0%, #0f2e4d 100%);
    border-radius: 1.8mm;
    padding: 2.2mm 2.8mm;
    color: #ffffff;
    margin-bottom: 2mm;
  }}

  .allocation-title {{
    font-size: 7.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #ffffff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.4mm;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    padding-bottom: 0.8mm;
  }}

  .alloc-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2.2mm;
  }}

  .alloc-card {{
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1.4mm;
    padding: 1.4mm;
  }}

  .alloc-card-title {{
    font-size: 6.2pt;
    font-weight: 800;
    color: #38bdf8;
    margin-bottom: 0.5mm;
    display: flex;
    align-items: center;
    gap: 1mm;
  }}

  .alloc-card-desc {{
    font-size: 5.2pt;
    font-weight: 400;
    color: #cbd5e1;
    line-height: 1.25;
  }}

  /* 2-Column Safeguards & Deallocation Grid */
  .dual-action-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5mm;
    margin-top: 1.8mm;
  }}

  .action-box {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1.6mm;
    padding: 1.8mm;
  }}

  .action-title {{
    font-size: 6.8pt;
    font-weight: 800;
    color: #0b192c;
    display: flex;
    align-items: center;
    gap: 1.4mm;
    margin-bottom: 1mm;
  }}

  .action-desc {{
    font-size: 5.5pt;
    font-weight: 500;
    color: #475569;
    line-height: 1.28;
    margin-bottom: 0.8mm;
  }}

  /* Footer & Trust Banner */
  .trust-banner {{
    background: linear-gradient(90deg, #0b192c 0%, #1e293b 100%);
    border-radius: 1.6mm;
    padding: 1.8mm 3mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #ffffff;
    box-shadow: 0 1px 4px rgba(11, 25, 44, 0.08);
  }}

  .trust-item {{
    display: flex;
    align-items: center;
    gap: 1.4mm;
    font-size: 6pt;
    font-weight: 700;
    letter-spacing: 0.3px;
  }}

  .trust-badge-icon {{
    width: 3.4mm;
    height: 3.4mm;
    background: #0284c7;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4.8pt;
  }}

  .footer-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1.6mm;
    border-top: 1px solid #e2e8f0;
    font-size: 5.6pt;
    font-weight: 600;
    color: #64748b;
  }}
</style>
</head>
<body>

<!-- ======================================================= -->
<!-- PAGE 1: DIGITISATION, NEURAL OCR & WEB PORTAL SETUP     -->
<!-- ======================================================= -->
<div class="page">
  <div class="content-layer">
    
    <div>
      <!-- Header Bar -->
      <div class="header-bar">
        <div class="brand-group">
          <div class="brand-logo-icon">OSM</div>
          <div class="brand-title-wrap">
            <div class="brand-name">
              Smart OSM
              <span class="brand-badge">Unified Platform</span>
            </div>
            <div class="brand-sub">Scanning Software &bull; Neural Page Validation &bull; Centralized Web Portal</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">End-to-End Evaluation Ecosystem</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Main Headline Block -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          One Connected Assessment Lifecycle: From Physical Paper to Certified Result
        </div>
        <h1 class="hero-headline">HIGH-SPEED BOOKLET DIGITISATION &amp; WEB PORTAL ARCHITECTURE</h1>
        <p class="hero-subhead">
          High-velocity answer script scanning with real-time neural sequence validation and automatic PDF/A compilation, seamlessly flowing into the centralized OSM Web Portal for master paper creation and batch rubric blueprinting.
        </p>
      </div>

      <!-- 7-Step Connected Workflow Bar -->
      <div class="platform-workflow">
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num">1</span><span class="pf-title">Intake</span></div>
          <span class="pf-sub">Physical Booklet</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num">2</span><span class="pf-title">Scanning</span></div>
          <span class="pf-sub">300 DPI CZUR/TWAIN</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num">3</span><span class="pf-title">Validation</span></div>
          <span class="pf-sub">Neural Sequence OCR</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num">4</span><span class="pf-title">PDF/A Gen</span></div>
          <span class="pf-sub">Tamper-Evident Compile</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num portal-active">5</span><span class="pf-title" style="color:#2dd4bf;">Web Portal</span></div>
          <span class="pf-sub">Paper &amp; Rubric Setup</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num portal-active">6</span><span class="pf-title" style="color:#2dd4bf;">Allocation</span></div>
          <span class="pf-sub">Equal / Daily Quota</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num portal-active">7</span><span class="pf-title" style="color:#2dd4bf;">Evaluation</span></div>
          <span class="pf-sub">Question-Wise Marking</span>
        </div>
      </div>

      <!-- 4 Core Technical Specs Strip -->
      <div class="stats-strip">
        <div class="stat-pill-box">
          <div class="stat-top"><span class="stat-value">1080p / 300 DPI</span><span class="stat-badge-tag">CZUR &bull; TWAIN</span></div>
          <span class="stat-desc">Live camera capture with real-time spine curvature flattening and background whitening.</span>
        </div>
        <div class="stat-pill-box">
          <div class="stat-top"><span class="stat-value">Multi-Pass OCR</span><span class="stat-badge-tag">Neural Audit</span></div>
          <span class="stat-desc">Real-time page number detection flags missing pages and sequence jumps at scanner desk.</span>
        </div>
        <div class="stat-pill-box">
          <div class="stat-top"><span class="stat-value">PDF/A Archival</span><span class="stat-badge-tag">Tamper-Proof</span></div>
          <span class="stat-desc">On-the-go progressive assembly with automatic roll number &amp; barcode metadata binding.</span>
        </div>
        <div class="stat-pill-box">
          <div class="stat-top"><span class="stat-value">4 Tiers RBAC</span><span class="stat-badge-tag">Control Room</span></div>
          <span class="stat-desc">Unified governance across Scanning Operators, Center Supervisors, Coordinators &amp; Examiners.</span>
        </div>
      </div>

      <!-- SECTION 1 & 2: High-Speed Scanning & Neural Validation -->
      <div class="content-block" style="border-top: none; padding-top: 0; margin-top: 0;">
        <div class="block-header">
          <div class="block-title-wrap">
            <span class="stage-badge">Stages 01 - 04</span>
            <span class="block-title">Smart OSM Scanning Software &amp; Intelligent Page Validation</span>
          </div>
          <span class="block-sub">Zero-Latency Curvature Flattening &bull; Sequence Parity Auditing &bull; Encrypted Sync</span>
        </div>

        <div class="split-layout">
          <!-- Actual Screenshot: Scanner Studio -->
          <div class="browser-frame">
            <div class="browser-header">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">OSM Scanner Studio | live capture</div>
              <div class="browser-tag">Digitisation Desk</div>
            </div>
            <img src="{scan_studio_b64}" class="browser-img" style="height: 25.5mm; object-fit: cover;" alt="OSM Scanner Studio">
            <div class="caption-strip">
              <span><strong>PRODUCTION VIEW:</strong> Real-Time Booklet Feed &bull; 300 DPI &bull; Spine Curvature Flattening</span>
              <span class="highlight">Hardware Bridging</span>
            </div>
          </div>

          <!-- Scanning & OCR Features -->
          <ul class="feature-list">
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Native Hardware SDK &amp; Ergonomic Triggers:</span>
                <p class="f-text-desc">Direct driver integration with CZUR and overhead production scanners. Hands-free foot pedal and spacebar triggers enable continuous bulk booklet turnover.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Neural Sequence OCR &amp; Parity Auditing:</span>
                <p class="f-text-desc">Reads printed page numbers instantly. Dual-page facing geometry (2k, 2k+1) catches duplicate captures, reversals, and missing pages at the scanner desk.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Interactive ROI Calibration &amp; PDF/A Assembly:</span>
                <p class="f-text-desc">Calibrate page dimensions, barcode area, and blur zones once. Generates tamper-evident PDF/A files encrypted for duplex upload to the central web portal.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- SECTION 3: WHERE WEB PORTAL COMES IN: Examination Papers & Catch Mapping -->
      <div class="content-block">
        <div class="block-header">
          <div class="block-title-wrap">
            <span class="stage-badge portal">Stage 05 : Web Portal</span>
            <span class="block-title">Examination Papers Registry &amp; Catch Mapping Hub</span>
          </div>
          <span class="block-sub">Centralized Paper Catalog &bull; Master QP PDF Repository &bull; Readiness Telemetry</span>
        </div>

        <div class="split-layout reverse">
          <!-- Web Portal Ingestion Features -->
          <ul class="feature-list">
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Unified Paper &amp; Catch Mapping:</span>
                <p class="f-text-desc">Once scanned PDFs arrive from scanning stations, coordinators map them to unique Paper Codes, Course Names, Subjects, and official Catch Numbers.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Master Question Paper PDF Integration:</span>
                <p class="f-text-desc">Upload official question paper PDFs directly into the paper record for split-screen evaluator reference during live marking.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Readiness Telemetry Checkpoints:</span>
                <p class="f-text-desc">Live pills track setup readiness across three critical checkpoints: Sections Configured, Evaluators Allotted, and QP PDF Uploaded.</p>
              </div>
            </li>
          </ul>

          <!-- Actual Screenshot: Papers Management Dashboard -->
          <div class="browser-frame">
            <div class="browser-header">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">https://osm.portal.edu/project/papers-management</div>
              <div class="browser-tag" style="color: #0d9488;">Web Portal Hub</div>
            </div>
            <img src="{papers_hub_b64}" class="browser-img" style="height: 25mm; object-fit: cover;" alt="Papers Management Dashboard">
            <div class="caption-strip">
              <span><strong>WEB PORTAL:</strong> Papers Registry, Catch Numbers, Master QP &amp; Examiner Allotment</span>
              <span class="highlight">Active Registry</span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 4: Section Batch Blueprints & Question Rubrics -->
      <div class="content-block">
        <div class="block-header">
          <div class="block-title-wrap">
            <span class="stage-badge portal">Stage 05 : Rubrics</span>
            <span class="block-title">Section Batch Blueprints &amp; Dynamic Question Rubrics</span>
          </div>
          <span class="block-sub">Multi-Tier Sections &bull; MCQ &amp; Descriptive Types &bull; "Attempt Any 5 of 8" &bull; Mark Validation</span>
        </div>

        <div class="split-layout">
          <!-- Actual Screenshot: Batch Configure Modal -->
          <div class="browser-frame" style="background: #f8fafc;">
            <div class="browser-header">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">https://osm.portal.edu/sections/batch-configure</div>
              <div class="browser-tag" style="color: #0d9488;">Rubric Manager</div>
            </div>
            <div style="padding: 0.8mm; display: flex; align-items: center; justify-content: center; background: #f1f5f9;">
              <img src="{batch_modal_b64}" style="width: 100%; max-height: 27mm; object-fit: contain; border-radius: 1.2mm; display: block;" alt="Configure Batch Sections">
            </div>
            <div class="caption-strip">
              <span><strong>BLUEPRINT MODAL:</strong> Section A, Question Types, Optional Flags &amp; Exact Marks</span>
              <span class="highlight">Actual Screen</span>
            </div>
          </div>

          <!-- Rubrics Blueprint Features -->
          <ul class="feature-list">
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Multi-Tier Question Schemas:</span>
                <p class="f-text-desc">Structure papers into Section Batches (Section A: MCQs, Section B: Analytical, Section C: Essay) with granular question mark weighting.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Attempt Limits &amp; Optional Controls:</span>
                <p class="f-text-desc">Enforce rules like <em>"Attempt Any 5 of 8 Questions"</em> or Grouped Optionals — the system automatically flags excess attempts and honors best marks.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Real-Time Mathematical Validation:</span>
                <p class="f-text-desc">Engine mathematically prevents setup errors by ensuring section question marks perfectly match overall paper maximum marks before papers are locked.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

    </div>

    <!-- Page 1 Footer -->
    <div>
      <div class="footer-bar">
        <span>Smart OSM Platform &bull; Digitisation Desk, Neural Sequence Validation &amp; Master Paper Setup</span>
        <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
        <span>Page 1 of 2</span>
      </div>
    </div>

  </div>
</div>


<!-- ======================================================= -->
<!-- PAGE 2: SCRIPT ALLOCATION, LIVE MARKING & GOVERNANCE   -->
<!-- ======================================================= -->
<div class="page">
  <div class="content-layer">

    <div>
      <!-- Header Bar -->
      <div class="header-bar">
        <div class="brand-group">
          <div class="brand-logo-icon">OSM</div>
          <div class="brand-title-wrap">
            <div class="brand-name">
              Smart OSM
              <span class="brand-badge">Evaluation &amp; Governance</span>
            </div>
            <div class="brand-sub">Examiner Allocation &bull; Question-Wise Marking &bull; Anti-Rush Pacing &bull; Script Snatching</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">Live Marking Engine</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Main Headline Block -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Stage 06 &amp; 07 : Intelligent Allocation, Blind Marking &amp; Administrative Control
        </div>
        <h1 class="hero-headline">QUESTION-WISE EVALUATION, SPEED PACING &amp; SCRIPT SNATCHING</h1>
        <p class="hero-subhead">
          Enforce transparent examiner invitation, randomized script allocation, and question-based marking within strict pacing limits, with complete administrative power to snatch and reallocate idle booklets.
        </p>
      </div>

      <!-- SECTION 5: Examiner Invitation, Ordering & Script Allocation Strategies -->
      <div class="allocation-banner">
        <div class="allocation-title">
          <span>Stage 06: Examiner Invitation, Workload Ordering &amp; Script Allocation Strategies</span>
          <span style="font-size: 5.2pt; font-weight: 700; background: #0284c7; padding: 1px 4.5px; border-radius: 2px;">Production Allocation Engine</span>
        </div>
        <div class="alloc-grid">
          <div class="alloc-card">
            <div class="alloc-card-title">&#10003; Examiner Invitation &amp; Ordering</div>
            <p class="alloc-card-desc">Invite certified faculty via secure invitation tokens, map them to specific subject codes, establish priority order, and manage evaluation quotas.</p>
          </div>
          <div class="alloc-card">
            <div class="alloc-card-title">&#10003; Equal Distribution + Date Target</div>
            <p class="alloc-card-desc">Mathematically partitions scanned scripts equally across verified examiners for that paper, enforced with a strict <strong>Completion Date Limit</strong>.</p>
          </div>
          <div class="alloc-card">
            <div class="alloc-card-title">&#10003; Daily Allocation &amp; Randomized Order</div>
            <p class="alloc-card-desc">Allots scripts under strict daily quota caps (e.g. 50 scripts/day). Booklets are assigned in <strong>randomized order</strong> to eliminate bias and prevent collusion.</p>
          </div>
        </div>
      </div>

      <!-- SECTION 6: Live Digital Evaluation & Question-Based Marking -->
      <div class="content-block" style="border-top: none; padding-top: 0; margin-top: 0;">
        <div class="block-header">
          <div class="block-title-wrap">
            <span class="stage-badge portal">Stage 07 : Live Evaluation</span>
            <span class="block-title">Live On-Screen Marking &amp; Question-Wise Rubric Scoring</span>
          </div>
          <span class="block-sub">100% Blind Anonymity &bull; Question Palette &bull; Annotations &bull; Dynamic 0% Tally Summation</span>
        </div>

        <div class="split-layout">
          <!-- Actual Screenshot: Evaluator Workspace -->
          <div class="browser-frame">
            <div class="browser-header">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">https://osm.portal.edu/evaluate/script/view</div>
              <div class="browser-tag" style="color: #0d9488;">Marking Workspace</div>
            </div>
            <img src="{eval_workspace_b64}" class="browser-img" alt="OSM Marking Workspace">
            <div class="caption-strip">
              <span><strong>ACTUAL APPLICATION SCREENSHOT:</strong> Live Candidate Script Evaluation Workspace</span>
              <span class="highlight">100% Blind Barcode Mask &bull; Question Palette &bull; AI Proctoring Active</span>
            </div>
          </div>

          <!-- Question-Based Marking Bullets -->
          <ul class="feature-list">
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">100% Blind Barcode Masking:</span>
                <p class="f-text-desc">Candidate names, roll numbers, and physical barcodes are automatically masked with system tokens (<code>EXAM-2026_02_07...</code>) guaranteeing zero bias.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Question-Based Rubric Scoring:</span>
                <p class="f-text-desc">Clicking any question in Section A/B/C palette opens rubric popup to award marks (0, 0.5, 1, 1.5, 2...) strictly matching that question's configured max marks.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Digital Annotation Toolbar:</span>
                <p class="f-text-desc">Affix official Green Ticks, Red Crosses, Fractional Points, Text Remarks, and Blank Page stamps permanently recorded into the booklet's audit ledger.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">0% Arithmetic Tally Errors:</span>
                <p class="f-text-desc">Dynamic automated aggregation continuously compiles section marks and total scores in real time, completely eliminating manual calculation errors.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- SECTION 7 & 8: Checking Time Limits, Speed Pacing & Dynamic Script Snatching -->
      <div class="dual-action-grid">
        <!-- Checking Time Limit / Pacing -->
        <div class="action-box">
          <div class="action-title">
            <span style="color: #0284c7;">&#10003;</span>
            Checking Time Limits &amp; Anti-Rush Profiles
          </div>
          <p class="action-desc">
            <strong>Mandatory Minimum Time-per-Copy:</strong> Administrators enforce a mandatory minimum duration per booklet (e.g. 15 minutes/copy). Marks submission remains locked until the evaluator spends adequate time reviewing every page.
          </p>
          <p class="action-desc" style="margin-bottom: 0;">
            <strong>AI Proctoring &amp; Idle Timeouts:</strong> Continuous webcam face landmark verification (<code>compareFaces</code>), browser tab-blur detection, and automatic session lock after inactivity.
          </p>
        </div>

        <!-- Dynamic Deallocation / Snatching -->
        <div class="action-box">
          <div class="action-title">
            <span style="color: #0d9488;">&#10003;</span>
            Dynamic Script Deallocation &amp; Snatching Control
          </div>
          <p class="action-desc">
            <strong>Administrative Script Snatching:</strong> If an examiner is inactive, unassigned, or falling behind schedule, coordinators can instantly overwrite allocation counts and <strong>snatch un-evaluated scripts</strong> back.
          </p>
          <p class="action-desc" style="margin-bottom: 0;">
            <strong>Instant Reassignment &amp; Expiry Cleanup:</strong> Snatched scripts are immediately returned to the pending pool or reassigned to active examiners, preventing bottlenecks and guaranteeing result publication schedules.
          </p>
        </div>
      </div>

      <!-- SECTION 9: Institutional Governance & Audit Security (Actual Settings Screenshot) -->
      <div class="content-block">
        <div class="block-header">
          <div class="block-title-wrap">
            <span class="stage-badge" style="background: #0f172a;">Institutional Governance</span>
            <span class="block-title">Portal Preferences, Two-Factor Authentication (2FA) &amp; Audit Logs</span>
          </div>
          <span class="block-sub">Script Assignment Models &bull; Speed Profile Pacing &bull; Immutable Audit Trail</span>
        </div>

        <div class="split-layout reverse">
          <!-- Governance Bullets -->
          <ul class="feature-list">
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Enterprise Security &amp; 2FA:</span>
                <p class="f-text-desc">Mandatory two-factor authentication for examiner logins and strict Role-Based Access Control (RBAC) across apex coordinators, controllers, and evaluators.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Immutable Transaction Audit Trail:</span>
                <p class="f-text-desc">Every question mark awarded, annotation stamped, script allocated or snatched is logged into a tamper-evident audit record with examiner ID and timestamp.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Single Pane of Glass Telemetry:</span>
                <p class="f-text-desc">Live control room tracking total ingested scripts, evaluated vs. pending tallies, examiner evaluation velocity, and department-wise completion schedules.</p>
              </div>
            </li>
          </ul>

          <!-- Actual Screenshot: Settings -->
          <div class="browser-frame">
            <div class="browser-header">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">https://osm.portal.edu/settings/preferences</div>
              <div class="browser-tag">Portal Settings</div>
            </div>
            <img src="{settings_b64}" class="browser-img" style="height: 25mm; object-fit: cover;" alt="Portal Settings &amp; Preferences">
            <div class="caption-strip">
              <span><strong>INSTITUTIONAL POLICIES:</strong> Script Assignment Models, Speed Pacing &amp; 2FA</span>
              <span class="highlight">Actual Screen</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Bottom Trust Banner & Page 2 Footer -->
    <div>
      <div class="trust-banner">
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>100% Blind Anonymity</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>Question-Wise Rubric Marking</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>Anti-Rush Speed Pacing</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>Dynamic Script Snatching</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>Immutable Audit Security</span>
        </div>
      </div>

      <div class="footer-bar">
        <span>Request an Executive Demonstration: contact@osm.portal.edu &bull; Smart OSM Unified Platform</span>
        <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
        <span>Page 2 of 2</span>
      </div>
    </div>

  </div>
</div>

</body>
</html>
"""

with open('osm_corporate_brochure.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print('Merged Smart OSM brochure HTML written successfully!')
