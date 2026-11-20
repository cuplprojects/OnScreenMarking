import os
import base64
import subprocess

def get_b64(path):
    with open(path, 'rb') as f:
        ext = os.path.splitext(path)[1].lower()
        mime = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png'
        return f'data:{mime};base64,' + base64.b64encode(f.read()).decode('utf-8')

scan_studio_b64 = get_b64('extracted_assets/new_pdf/page_1.jpg')
template_editor_b64 = get_b64('extracted_assets/new_pdf/page_2.jpg')
papers_hub_b64 = get_b64('extracted_assets/cropped/app_content_3.png')
batch_modal_b64 = get_b64('extracted_assets/cropped/batch_configure_modal.png')
eval_workspace_b64 = get_b64('extracted_assets/cropped/app_content_4.png')
settings_b64 = get_b64('extracted_assets/cropped/app_content_1.png')

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Smart OSM - Scanning Software &amp; On-Screen Marking Platform</title>
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
    margin: 0;
    padding: 0;
  }}

  /* Page Shell - Exact A4 Dimensions */
  .page {{
    width: 210mm;
    height: 297mm;
    page-break-after: always;
    page-break-inside: avoid;
    position: relative;
    background-color: #ffffff;
    box-sizing: border-box;
    overflow: hidden;
    padding: 7.5mm 8mm 7.5mm 8mm;
  }}

  .page:last-child {{
    page-break-after: avoid;
  }}

  .content-layer {{
    position: relative;
    z-index: 10;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  /* Header Bar */
  .header-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 2mm;
    margin-bottom: 2mm;
  }}

  .brand-group {{
    display: flex;
    align-items: center;
    gap: 2.5mm;
  }}

  .brand-logo-icon {{
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    color: #ffffff;
    font-weight: 800;
    font-size: 11pt;
    letter-spacing: -0.5px;
    padding: 1.5mm 2.8mm;
    border-radius: 2mm;
    box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);
  }}

  .brand-title-wrap {{
    display: flex;
    flex-direction: column;
  }}

  .brand-name {{
    font-size: 13pt;
    font-weight: 800;
    color: #0b192c;
    letter-spacing: -0.3px;
    display: flex;
    align-items: center;
    gap: 2mm;
  }}

  .brand-badge {{
    font-size: 5.5pt;
    font-weight: 700;
    text-transform: uppercase;
    background: #e0f2fe;
    color: #0369a1;
    padding: 1px 4.5px;
    border-radius: 1.5mm;
    letter-spacing: 0.5px;
  }}

  .brand-sub {{
    font-size: 5.6pt;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-top: 0.3mm;
  }}

  .header-pills {{
    display: flex;
    gap: 1.5mm;
    align-items: center;
  }}

  .pill {{
    font-size: 5.8pt;
    font-weight: 700;
    padding: 1mm 2.6mm;
    border-radius: 1.5mm;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    white-space: nowrap;
  }}

  .pill-teal {{
    background: #ccfbf1;
    color: #0f766e;
    border: 1px solid #99f6e4;
  }}

  .pill-navy {{
    background: #0f172a;
    color: #ffffff;
  }}

  /* Hero Headline Block */
  .hero-block {{
    margin-bottom: 2mm;
  }}

  .hero-eyebrow {{
    display: inline-flex;
    align-items: center;
    gap: 1.2mm;
    font-size: 5.8pt;
    font-weight: 800;
    color: #0284c7;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 0.8mm;
  }}

  .hero-headline {{
    font-size: 14pt;
    font-weight: 800;
    color: #0b192c;
    letter-spacing: -0.4px;
    line-height: 1.15;
    margin-bottom: 1mm;
  }}

  .hero-subhead {{
    font-size: 6.6pt;
    color: #334155;
    line-height: 1.35;
    font-weight: 500;
  }}

  /* 7-Step Horizontal Workflow Pipeline */
  .workflow-strip {{
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: #0b192c;
    border-radius: 2mm;
    padding: 2.2mm 1.5mm;
    margin-bottom: 2.2mm;
    box-shadow: 0 2px 6px rgba(11, 25, 44, 0.15);
  }}

  .wf-step {{
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0 1.2mm;
  }}

  .wf-step:not(:last-child)::after {{
    content: "&#9654;";
    position: absolute;
    right: -2.8mm;
    top: 1.2mm;
    font-size: 4.8pt;
    color: #38bdf8;
    opacity: 0.8;
  }}

  .wf-num {{
    width: 4.2mm;
    height: 4.2mm;
    background: #0284c7;
    color: #ffffff;
    border-radius: 50%;
    font-size: 5.6pt;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.8mm;
  }}

  .wf-num.portal-num {{
    background: #0d9488;
  }}

  .wf-title {{
    font-size: 5.1pt;
    font-weight: 800;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    line-height: 1.15;
  }}

  .wf-desc {{
    font-size: 4.5pt;
    font-weight: 500;
    color: #94a3b8;
    margin-top: 0.4mm;
    line-height: 1.1;
  }}

  /* Key Metrics Grid */
  .stats-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2mm;
    margin-bottom: 2.2mm;
  }}

  .stat-card {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 1.8mm;
    padding: 1.8mm 2.2mm;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }}

  .stat-header {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.8mm;
  }}

  .stat-val {{
    font-size: 9.5pt;
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
    font-size: 5.4pt;
    font-weight: 500;
    color: #64748b;
    margin-top: 0.3mm;
  }}

  /* Content Block */
  .content-block {{
    border-top: 1px solid #e2e8f0;
    padding-top: 2mm;
    margin-top: 2mm;
  }}

  .block-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.4mm;
    gap: 2mm;
  }}

  .block-title-wrap {{
    display: flex;
    align-items: center;
    gap: 1.8mm;
    flex: 1;
    min-width: 0;
  }}

  .stage-badge {{
    font-size: 5.8pt;
    font-weight: 800;
    color: #ffffff;
    background: #0284c7;
    padding: 1px 5px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    white-space: nowrap;
  }}

  .stage-badge.portal {{
    background: #0d9488;
  }}

  .block-title {{
    font-size: 8.5pt;
    font-weight: 800;
    color: #0b192c;
    letter-spacing: -0.2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }}

  .block-sub {{
    font-size: 5.3pt;
    font-weight: 600;
    color: #64748b;
    text-align: right;
    white-space: nowrap;
    flex-shrink: 0;
  }}

  /* Split Layouts */
  .split-layout {{
    display: grid;
    grid-template-columns: 1.25fr 1fr;
    gap: 3mm;
    align-items: center;
  }}

  .split-layout.reverse {{
    grid-template-columns: 1fr 1.25fr;
  }}

  /* Browser & Software Frame */
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
    font-size: 5.6pt;
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
    gap: 1.6mm;
  }}

  .feature-item {{
    display: flex;
    align-items: flex-start;
    gap: 1.6mm;
  }}

  .f-check {{
    width: 3.6mm;
    height: 3.6mm;
    border-radius: 50%;
    background: #e0f2fe;
    color: #0284c7;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 5.2pt;
    font-weight: 800;
    flex-shrink: 0;
    margin-top: 0.3mm;
  }}

  .f-check.teal {{
    background: #ccfbf1;
    color: #0d9488;
  }}

  .f-text-title {{
    font-size: 6.4pt;
    font-weight: 800;
    color: #0b192c;
    line-height: 1.2;
  }}

  .f-text-desc {{
    font-size: 5.4pt;
    font-weight: 500;
    color: #475569;
    line-height: 1.3;
    margin-top: 0.2mm;
  }}

  /* Allocation Strategies Box */
  .allocation-banner {{
    background: linear-gradient(135deg, #0b192c 0%, #1e293b 100%);
    border-radius: 2mm;
    padding: 2.2mm 2.8mm;
    color: #ffffff;
    box-shadow: 0 2px 6px rgba(11, 25, 44, 0.12);
  }}

  .allocation-title {{
    font-size: 7.2pt;
    font-weight: 800;
    color: #38bdf8;
    margin-bottom: 1.4mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}

  .alloc-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2.2mm;
  }}

  .alloc-card {{
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1.5mm;
    padding: 1.5mm 2mm;
  }}

  .alloc-card-title {{
    font-size: 6pt;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 0.5mm;
    display: flex;
    align-items: center;
    gap: 1mm;
  }}

  .alloc-card-desc {{
    font-size: 5.2pt;
    font-weight: 500;
    color: #cbd5e1;
    line-height: 1.28;
  }}

  /* Dual Action Grid (Pacing & Snatching) */
  .dual-action-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5mm;
    margin-top: 2.2mm;
  }}

  .action-box {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 1.8mm;
    padding: 2mm 2.5mm;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }}

  .action-title {{
    font-size: 6.8pt;
    font-weight: 800;
    color: #0b192c;
    margin-bottom: 1mm;
    display: flex;
    align-items: center;
    gap: 1.2mm;
  }}

  .action-desc {{
    font-size: 5.3pt;
    color: #334155;
    line-height: 1.32;
    margin-bottom: 1.2mm;
  }}

  /* Trust Footer Strip */
  .footer-trust-strip {{
    background: #0b192c;
    border-radius: 1.5mm;
    padding: 1.4mm 2.5mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #ffffff;
  }}

  .trust-item {{
    font-size: 5.6pt;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 1.2mm;
    color: #e2e8f0;
  }}

  .trust-check {{
    color: #38bdf8;
    font-weight: 800;
  }}

  /* Footer Bar */
  .footer-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #cbd5e1;
    padding-top: 1.6mm;
    font-size: 5.6pt;
    font-weight: 600;
    color: #64748b;
  }}

  code {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 5.2pt;
    background: #f1f5f9;
    padding: 0.5px 2px;
    border-radius: 1px;
    color: #0369a1;
  }}
</style>
</head>
<body>

<!-- ======================================================= -->
<!-- PAGE 1: SMART OSM SCANNING SOFTWARE & DIGITISATION      -->
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
              <span class="brand-badge">Scanning Software</span>
            </div>
            <div class="brand-sub">High-Speed Answer Booklet Digitisation &bull; Intelligent Page Validation</div>
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
          Stage 01 &bull; Intake to Digital Stream
        </div>
        <h1 class="hero-headline">HIGH-SPEED BOOKLET DIGITISATION &amp; LIVE SCAN CAPTURE</h1>
        <p class="hero-subhead">
          High-speed answer booklet digitization with intelligent page validation, secure transfer, and complete on-screen evaluation. Native CZUR &amp; TWAIN driver bridging with real-time spine curvature flattening and background whitening.
        </p>
      </div>

      <!-- 7-Step Workflow Pipeline -->
      <div class="workflow-strip">
        <div class="wf-step">
          <div class="wf-num">1</div>
          <div class="wf-title">Physical Booklet</div>
          <div class="wf-desc">Candidate Intake</div>
        </div>
        <div class="wf-step">
          <div class="wf-num">2</div>
          <div class="wf-title">High-Speed Scan</div>
          <div class="wf-desc">300 DPI CZUR/TWAIN</div>
        </div>
        <div class="wf-step">
          <div class="wf-num">3</div>
          <div class="wf-title">Page Validation</div>
          <div class="wf-desc">Neural Sequence OCR</div>
        </div>
        <div class="wf-step">
          <div class="wf-num">4</div>
          <div class="wf-title">PDF Generation</div>
          <div class="wf-desc">Tamper-Evident PDF/A</div>
        </div>
        <div class="wf-step">
          <div class="wf-num portal-num">5</div>
          <div class="wf-title">Web Application</div>
          <div class="wf-desc">Cloud Distribution</div>
        </div>
        <div class="wf-step">
          <div class="wf-num portal-num">6</div>
          <div class="wf-title">Examiner Allotment</div>
          <div class="wf-desc">Equal / Daily Quota</div>
        </div>
        <div class="wf-step">
          <div class="wf-num portal-num">7</div>
          <div class="wf-title">Digital Evaluation</div>
          <div class="wf-desc">Question-Wise Marking</div>
        </div>
      </div>

      <!-- Key Metrics Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-val">1080p</span>
            <span class="stat-badge-tag">300 DPI</span>
          </div>
          <p class="stat-desc">Live camera capture with real-time curvature flattening and background whitening.</p>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-val">Multi-pass</span>
            <span class="stat-badge-tag">Neural OCR</span>
          </div>
          <p class="stat-desc">Real-time page validation audits page numbers directly at the scanner desk.</p>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-val">PDF/A</span>
            <span class="stat-badge-tag">Archival</span>
          </div>
          <p class="stat-desc">Tamper-evident output compiled on-the-go with barcode and roll number binding.</p>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-val">4 tiers</span>
            <span class="stat-badge-tag">Role-Based</span>
          </div>
          <p class="stat-desc">Access control for Operators, Center Supervisors, Coordinators, and Evaluators.</p>
        </div>
      </div>

      <!-- Live Scanner Capture (Actual Screenshot 1) -->
      <div class="browser-frame">
        <div class="browser-header">
          <div class="browser-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <div class="browser-url">OSM Scanner Studio | live capture</div>
          <div class="browser-tag">Live Stream 300 DPI</div>
        </div>
        <img src="{scan_studio_b64}" class="browser-img" style="height: 60mm; object-fit: cover;" alt="Smart OSM Live Scanner Capture">
        <div class="caption-strip">
          <span><strong>PRODUCTION VIEW:</strong> Real-Time Booklet Feed &bull; 1080p &bull; Spine Curvature Flattening &bull; Foot Pedal Trigger</span>
          <span class="highlight">CZUR &amp; TWAIN Hardware Bridged</span>
        </div>
      </div>

      <!-- Enterprise Capabilities Grid -->
      <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 1.8mm; padding: 2.2mm 2.8mm; margin-top: 2.2mm; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="font-size: 6.8pt; font-weight: 800; color: #0b192c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1.4mm;">
          Enterprise Digitisation Capabilities
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5mm;">
          <div>
            <div style="font-size: 6pt; font-weight: 800; color: #0284c7; margin-bottom: 0.4mm;">High-Speed Digitisation</div>
            <p style="font-size: 5.1pt; color: #475569; line-height: 1.25;">Native CZUR &amp; TWAIN driver bridging with real-time spine curvature flattening and background whitening.</p>
          </div>
          <div>
            <div style="font-size: 6pt; font-weight: 800; color: #0284c7; margin-bottom: 0.4mm;">Multi-Pass Sequence OCR</div>
            <p style="font-size: 5.1pt; color: #475569; line-height: 1.25;">Instant neural page-order audit catches missing pages or sequence jumps directly at the scanner desk.</p>
          </div>
          <div>
            <div style="font-size: 6pt; font-weight: 800; color: #0284c7; margin-bottom: 0.4mm;">Blind Marking Governance</div>
            <p style="font-size: 5.1pt; color: #475569; line-height: 1.25;">Automated barcode pseudonymisation guarantees 100% unbiased, blind evaluation workflows.</p>
          </div>
          <div>
            <div style="font-size: 6pt; font-weight: 800; color: #0284c7; margin-bottom: 0.4mm;">Centralized Control Room</div>
            <p style="font-size: 5.1pt; color: #475569; line-height: 1.25;">Unified web portal tracking scanning batches, evaluator grading velocity, and regulatory audit compliance.</p>
          </div>
        </div>
      </div>

    </div>

    <!-- Page 1 Footer -->
    <div>
      <div class="footer-bar">
        <span>Smart OSM Scanning Software &bull; High-speed digitization to digital evaluation</span>
        <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
        <span>Page 1 of 4</span>
      </div>
    </div>

  </div>
</div>


<!-- ======================================================= -->
<!-- PAGE 2: CAPTURE & VALIDATE - TEMPLATE EDITOR & OCR      -->
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
              <span class="brand-badge">Capture &amp; Validate</span>
            </div>
            <div class="brand-sub">Stages 02 - 03 &bull; Neural Sequence OCR &bull; Interactive Template &amp; ROI Editor</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">Scanner Desk Quality Guard</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Main Headline Block -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Audited Ingestion Desk
        </div>
        <h1 class="hero-headline">SCAN FAST. VALIDATE EVERY PAGE.</h1>
        <p class="hero-subhead">
          Camera and TWAIN scanning that audits page order in real time, so errors are caught at the scanning desk, not at evaluation. Calibrate once, scan thousands of booklets consistently.
        </p>
      </div>

      <!-- Dual Stage Feature Cards (01 & 02 from PDF 1) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; margin-bottom: 2.2mm;">
        <!-- Card 1: Scanning Hardware Bridging -->
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 1.8mm; padding: 2mm 2.5mm; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="font-size: 6.8pt; font-weight: 800; color: #0b192c; margin-bottom: 1.2mm;">
            <span style="color: #0284c7; margin-right: 1mm;">1</span> High-Speed Document Scanning
          </div>
          <ul class="feature-list">
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Native Hardware Integration:</span>
                <p class="f-text-desc">Direct driver and SDK bridging with high-speed camera scanners (CZUR, overhead production units) and high-volume TWAIN document scanners.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Ergonomic Operator Triggers:</span>
                <p class="f-text-desc">Hands-free foot pedal, keyboard spacebar and hardware USB buttons for bulk paper turnover.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Zero-Latency Multi-Threading:</span>
                <p class="f-text-desc">Background I/O separates video capture from disk writing for continuous scanning without stutter.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Curvature &amp; Whitening Engine:</span>
                <p class="f-text-desc">Real-time flattening of booklet spines, finger removal and paper background purification.</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Card 2: Neural Sequence OCR -->
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 1.8mm; padding: 2mm 2.5mm; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="font-size: 6.8pt; font-weight: 800; color: #0b192c; margin-bottom: 1.2mm;">
            <span style="color: #0284c7; margin-right: 1mm;">2</span> Intelligent Page Number Validation
          </div>
          <ul class="feature-list">
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Multi-Pass Neural OCR:</span>
                <p class="f-text-desc">Reads and validates printed page numbers on every booklet scan with high optical confidence.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Parity &amp; Sequence Auditing:</span>
                <p class="f-text-desc">Detects missing pages, duplicate captures, order reversals and abnormal sequence jumps in real time.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Two-Page Facing Spread Support:</span>
                <p class="f-text-desc">Dual-page geometry evaluation (2k, 2k+1) prevents false jump warnings on open booklet spreads.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check">&#10003;</div>
              <div>
                <span class="f-text-title">Instant Sequence OCR Toggle:</span>
                <p class="f-text-desc">One-click banner toggle between strict page auditing and rapid continuous intake.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Actual Screenshot 2: Interactive Visual Template Editor & Creator -->
      <div class="browser-frame">
        <div class="browser-header">
          <div class="browser-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <div class="browser-url">Interactive Visual Template Editor &amp; Creator (OSM)</div>
          <div class="browser-tag" style="color: #0369a1;">Template Calibration</div>
        </div>
        <img src="{template_editor_b64}" class="browser-img" style="height: 72mm; object-fit: cover;" alt="Interactive Visual Template Editor">
        <div class="caption-strip">
          <span><strong>CALIBRATE ONCE, SCAN THOUSANDS:</strong> Page Dimensions, Page-Number Area, Barcode &amp; Confidential Blur ROI</span>
          <span class="highlight">Visual Template Engine</span>
        </div>
      </div>

      <!-- Template Calibration Capabilities (from PDF 1 Page 2) -->
      <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 1.8mm; padding: 2mm 2.5mm; margin-top: 2.2mm; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5mm;">
          <div>
            <div style="font-size: 6pt; font-weight: 800; color: #0b192c; margin-bottom: 0.3mm;">Draw tools</div>
            <p style="font-size: 5.1pt; color: #475569; line-height: 1.25;">Mark page dimension, page-number area, barcode area and starting blur area directly on the scan.</p>
            <span style="font-size: 4.8pt; font-weight: 700; color: #0284c7;">Precision Calibration</span>
          </div>
          <div>
            <div style="font-size: 6pt; font-weight: 800; color: #0b192c; margin-bottom: 0.3mm;">Template selection</div>
            <p style="font-size: 5.1pt; color: #475569; line-height: 1.25;">Choose an existing template or create a new one for each booklet design.</p>
            <span style="font-size: 4.8pt; font-weight: 700; color: #0284c7;">Multi-Paper Formats</span>
          </div>
          <div>
            <div style="font-size: 6pt; font-weight: 800; color: #0b192c; margin-bottom: 0.3mm;">Specifications</div>
            <p style="font-size: 5.1pt; color: #475569; line-height: 1.25;">Template name, A4 preset, crop margin, page-number area, total pages and Auto-Set All Defaults.</p>
            <span style="font-size: 4.8pt; font-weight: 700; color: #0284c7;">Auto-Set Defaults</span>
          </div>
          <div>
            <div style="font-size: 6pt; font-weight: 800; color: #0b192c; margin-bottom: 0.3mm;">Capture settings</div>
            <p style="font-size: 5.1pt; color: #475569; line-height: 1.25;">Page capture format, skip cover, page range and barcode availability on the candidate page.</p>
            <span style="font-size: 4.8pt; font-weight: 700; color: #0284c7;">Format Governance</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Page 2 Footer -->
    <div>
      <div class="footer-bar">
        <span>Smart OSM Scanning Software &bull; Capture, Page Sequence Auditing &amp; Template Calibration</span>
        <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
        <span>Page 2 of 4</span>
      </div>
    </div>

  </div>
</div>


<!-- ======================================================= -->
<!-- PAGE 3: CENTRALIZED WEB PORTAL - PAPERS & RUBRICS       -->
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
              OSM PORTAL
              <span class="brand-badge">Centralized Web Platform</span>
            </div>
            <div class="brand-sub">Stages 04 - 06 &bull; Secure Cloud Ingestion, Master Papers Registry &amp; Question Rubrics</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">Where The Web Portal Comes In</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Main Headline Block -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          From Local Scan Stations to Central Cloud Web Portal
        </div>
        <h1 class="hero-headline">CENTRALIZED EXAMINATION REGISTRY &amp; RUBRIC BLUEPRINTS</h1>
        <p class="hero-subhead">
          Every booklet becomes an encrypted, tamper-evident digital file synchronized to the centralized web portal. Examination coordinators configure master papers, assign Catch Numbers, build question rubrics, invite certified examiners, and execute dual allocation engines.
        </p>
      </div>

      <!-- Automated PDF & Transfer Strip (Stages 04-05 from PDF 1) -->
      <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 1.8mm; padding: 2mm 2.5mm; margin-bottom: 2mm;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2.5mm;">
          <div>
            <div style="font-size: 6.5pt; font-weight: 800; color: #0b192c; margin-bottom: 0.5mm;">&#10003; On-The-Go PDF Assembly</div>
            <p style="font-size: 5.3pt; color: #475569; line-height: 1.28;">Builds candidate PDF progressively as pages are captured, removing post-scan batch delays and binding Code 128 / QR barcodes.</p>
          </div>
          <div>
            <div style="font-size: 6.5pt; font-weight: 800; color: #0b192c; margin-bottom: 0.5mm;">&#10003; Automated Duplex Sync</div>
            <p style="font-size: 5.3pt; color: #475569; line-height: 1.28;">Transmits finalized PDFs from scanning stations to central cloud with transactional commits guarding against partial uploads.</p>
          </div>
          <div>
            <div style="font-size: 6.5pt; font-weight: 800; color: #0b192c; margin-bottom: 0.5mm;">&#10003; Single Pane of Glass Control</div>
            <p style="font-size: 5.3pt; color: #475569; line-height: 1.28;">One control room for all examination centers, active scanning batches, evaluator grading velocity, and pending booklet tallies.</p>
          </div>
        </div>
      </div>

      <!-- STAGE 01: Examination Paper Creation & Catch Mapping -->
      <div class="content-block" style="border-top: none; padding-top: 0; margin-top: 0;">
        <div class="block-header">
          <div class="block-title-wrap">
            <span class="stage-badge portal">Web Stage 01</span>
            <span class="block-title">Examination Paper Creation &amp; Catch Mapping Hub</span>
          </div>
          <span class="block-sub">Centralized Paper Catalog &bull; Master Question Repository &bull; Readiness Telemetry</span>
        </div>

        <div class="split-layout">
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
            <img src="{papers_hub_b64}" class="browser-img" style="height: 31mm; object-fit: cover;" alt="Papers Management Dashboard">
            <div class="caption-strip">
              <span><strong>PRODUCTION VIEW:</strong> Paper Code, Catch No, Master QP PDF &amp; Examiner Allotment</span>
              <span class="highlight">Active Registry</span>
            </div>
          </div>

          <!-- Papers Hub Bullets -->
          <ul class="feature-list">
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Comprehensive Paper Ingestion:</span>
                <p class="f-text-desc">Register examination papers with Paper Code, Course Name, official Catch Number, Subject, Total Questions, and Maximum Marks.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Question Master PDF Integration:</span>
                <p class="f-text-desc">Upload official question paper PDFs directly linked to the paper record for instant evaluator reference during live marking.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Readiness Telemetry Checkpoints:</span>
                <p class="f-text-desc">Live pills display setup status across three mandatory checkpoints: Sections Configured, Evaluator Allotted, and QP PDF Uploaded.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- STAGE 02: Section Batch Blueprints & Question Rubric Schemas -->
      <div class="content-block" style="padding-top: 1.8mm; margin-top: 1.8mm;">
        <div class="block-header">
          <div class="block-title-wrap">
            <span class="stage-badge portal">Web Stage 02</span>
            <span class="block-title">Section Batch Blueprints &amp; Dynamic Question Rubrics</span>
          </div>
          <span class="block-sub">Multi-Tier Sections &bull; MCQ &amp; Descriptive Types &bull; Attempt Limits &bull; Mark Validation</span>
        </div>

        <div class="split-layout reverse">
          <!-- Rubrics Blueprint Features -->
          <ul class="feature-list">
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Multi-Tier Section Architecture:</span>
                <p class="f-text-desc">Structure papers into Section Batches (Section A: MCQs, Section B: Analytical, Section C: Essay) with granular question mark weightings.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Attempt Limits &amp; Optional Controls:</span>
                <p class="f-text-desc">Enforce rules like <em>"Attempt Any 5 of 8 Questions"</em> or Grouped Optionals &mdash;” the system automatically flags excess attempts and honors best marks.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Mathematical Sum Integrity:</span>
                <p class="f-text-desc">Engine mathematically prevents setup errors by ensuring section question marks perfectly match overall paper maximum marks before papers are locked.</p>
              </div>
            </li>
          </ul>

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
              <img src="{batch_modal_b64}" style="width: 100%; max-height: 32mm; object-fit: contain; border-radius: 1.2mm; display: block;" alt="Configure Batch Sections">
            </div>
            <div class="caption-strip">
              <span><strong>RUBRIC SCHEMA:</strong> Section A, Question Types, Optional Flags &amp; Exact Marks</span>
              <span class="highlight">Actual Screen</span>
            </div>
          </div>
        </div>
      </div>

      <!-- STAGES 03 & 04: Examiner Invitation & Script Allocation Strategies -->
      <div class="content-block" style="padding-top: 1.8mm; margin-top: 1.8mm;">
        <div class="block-header">
          <div class="block-title-wrap">
            <span class="stage-badge portal">Web Stages 03 &amp; 04</span>
            <span class="block-title">Certified Examiner Invitation, Workload Ordering &amp; Allocation</span>
          </div>
          <span class="block-sub">Cryptographic Token Invites &bull; Equal Distribution vs. Daily Quotas &bull; Randomized Order</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; margin-bottom: 2mm;">
          <!-- Card 1: Examiner Invitation & Workload Ordering -->
          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 1.6mm; padding: 2mm 2.5mm; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.2mm;">
              <span style="font-size: 6.6pt; font-weight: 800; color: #0b192c;">&#10003; Examiner Invitation &amp; Workload Ordering</span>
              <span style="font-size: 5pt; font-weight: 700; color: #0284c7; background: #f0f9ff; padding: 0.5px 3.5px; border-radius: 2px;">Faculty Onboarding</span>
            </div>
            <p style="font-size: 5.3pt; color: #334155; line-height: 1.3; margin-bottom: 1.2mm;">
              <strong>Cryptographic Invitation Tokens:</strong> Apex Coordinators issue single-use secure invite tokens to verified faculty, binding evaluators directly to specific examination Subject Codes and qualification tiers.
            </p>
            <p style="font-size: 5.3pt; color: #334155; line-height: 1.3; margin-bottom: 0;">
              <strong>Evaluator Priority Ordering:</strong> Define evaluator priority hierarchies (Primary Marker, Re-checker, Moderator) and establish maximum evaluation capacity caps to prevent examiner fatigue.
            </p>
          </div>

          <!-- Card 2: Dual Script Allocation Engines -->
          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 1.6mm; padding: 2mm 2.5mm; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.2mm;">
              <span style="font-size: 6.6pt; font-weight: 800; color: #0b192c;">&#10003; Dual Allocation Models (Equal vs. Daily Quota)</span>
              <span style="font-size: 5pt; font-weight: 700; color: #0d9488; background: #ccfbf1; padding: 0.5px 3.5px; border-radius: 2px;">Production Engine</span>
            </div>
            <p style="font-size: 5.3pt; color: #334155; line-height: 1.3; margin-bottom: 1.2mm;">
              <strong>Equal Distribution + Completion Date Target:</strong> Mathematically partitions scanned scripts equally across all verified examiners for that paper, enforced with a strict <strong>Completion Date Target</strong> deadline.
            </p>
            <p style="font-size: 5.3pt; color: #334155; line-height: 1.3; margin-bottom: 0;">
              <strong>Daily Allocation Quotas &amp; Randomized Order:</strong> Allots scripts in strict daily quota tranches (e.g. 50 scripts/day). All scripts are delivered in <strong>randomized order</strong> to eliminate bias and prevent collusion.
            </p>
          </div>
        </div>

        <!-- Pre-Allocation Readiness Gate Strip -->
        <div style="background: #0b192c; border-radius: 1.4mm; padding: 1.6mm 2.5mm; display: flex; align-items: center; justify-content: space-between; color: #f8fafc;">
          <div style="display: flex; align-items: center; gap: 2mm;">
            <div style="width: 4.5mm; height: 4.5mm; background: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 6pt; font-weight: 800;">!</div>
            <div>
              <span style="font-size: 6pt; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.3px;">Three-Point Institutional Readiness Verification Gate</span>
              <p style="font-size: 5.1pt; color: #94a3b8; margin: 0;">Scripts remain strictly locked from evaluation until all 3 conditions pass: [1] Section Rubrics Validated, [2] Certified Evaluators Ordered, [3] Master QP PDF Bound.</p>
            </div>
          </div>
          <span style="font-size: 5.4pt; font-weight: 700; color: #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 1px 5px; border-radius: 2px; border: 1px solid rgba(56, 189, 248, 0.3); white-space: nowrap;">Zero Setup Failure</span>
        </div>
      </div>

    </div>

    <!-- Page 3 Footer -->
    <div>
      <div class="footer-bar">
        <span>OSM Web Portal &bull; Master Paper Registry, Rubric Blueprinting &amp; Smart Script Allocation</span>
        <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
        <span>Page 3 of 4</span>
      </div>
    </div>

  </div>
</div>


<!-- ======================================================= -->
<!-- PAGE 4: LIVE EVALUATION, PACING, SNATCHING & GOVERNANCE -->
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
              OSM PORTAL
              <span class="brand-badge">Evaluation &amp; Governance</span>
            </div>
            <div class="brand-sub">Stages 06 - 08 &bull; Live Marking Workspace, Speed Pacing &amp; Dynamic Deallocation</div>
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
          Question-Wise Evaluation, Pacing &amp; Administrative Controls
        </div>
        <h1 class="hero-headline">PRECISION DIGITAL MARKING, PACING &amp; SCRIPT SNATCHING</h1>
        <p class="hero-subhead">
          Examiners grade scripts question-by-question with zero arithmetic errors and AI proctoring, while administrators enforce minimum checking times and retain the power to deallocate or snatch scripts from inactive evaluators.
        </p>
      </div>

      <!-- STAGE 05: Live On-Screen Evaluation & Question-Based Marking (Screenshot 4) -->
      <div class="content-block" style="border-top: none; padding-top: 0; margin-top: 0;">
        <div class="block-header">
          <div class="block-title-wrap">
            <span class="stage-badge portal">Web Stage 05 : Marking</span>
            <span class="block-title">Live Question-Wise Rubric Marking Workspace</span>
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
            <img src="{eval_workspace_b64}" class="browser-img" style="height: 33mm; object-fit: cover;" alt="OSM Marking Workspace">
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
                <span class="f-text-title">Precision Annotation Stamps:</span>
                <p class="f-text-desc">Affix official Green Ticks, Red Crosses, Fractional Points, Text Remarks, and Blank Page stamps permanently recorded into the booklet's audit ledger.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">0% Arithmetic &amp; Tally Errors:</span>
                <p class="f-text-desc">Dynamic automated aggregation continuously compiles section marks and total scores in real time, completely eliminating manual calculation errors.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- STAGES 06 & 07: Checking Time Limits, Speed Pacing & Dynamic Script Snatching -->
      <div class="dual-action-grid" style="margin-top: 2.2mm; margin-bottom: 2mm;">
        <!-- Checking Time Limit / Pacing -->
        <div class="action-box">
          <div class="action-title">
            <span style="color: #0284c7;">&#10003;</span>
            Script Checking Time Limits &amp; Anti-Rush Profiles
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

      <!-- STAGE 08: Institutional Governance & Policies (Actual Settings Screenshot) -->
      <div class="content-block" style="margin-top: 0; padding-top: 2mm;">
        <div class="block-header">
          <div class="block-title-wrap">
            <span class="stage-badge" style="background: #0f172a;">Institutional Governance</span>
            <span class="block-title">Portal Preferences, 2FA &amp; System Policies</span>
          </div>
          <span class="block-sub">Script Assignment Models &bull; Speed Profile Pacing &bull; Immutable Audit Trail</span>
        </div>

        <div class="split-layout reverse">
          <!-- Governance Bullets -->
          <ul class="feature-list">
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Enterprise Security &amp; 2FA:</span>
                <p class="f-text-desc">Mandatory two-factor authentication for examiner logins and strict Role-Based Access Control (RBAC) across apex coordinators, controllers, and evaluators.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Immutable Transaction Audit Trail:</span>
                <p class="f-text-desc">Every question mark awarded, annotation stamped, script allocated or snatched is logged into a tamper-evident audit record with examiner ID and timestamp.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Continuous Auto-Save &amp; Telemetry:</span>
                <p class="f-text-desc">Evaluations auto-save every 30 seconds. Central control room monitors active grading velocity, remaining scripts, and department-wise deadlines.</p>
              </div>
            </li>
          </ul>

          <!-- Actual Screenshot: Settings & Preferences -->
          <div class="browser-frame">
            <div class="browser-header">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">https://osm.portal.edu/settings/preferences</div>
              <div class="browser-tag" style="color: #0f172a;">Portal Settings</div>
            </div>
            <img src="{settings_b64}" class="browser-img" style="height: 31mm; object-fit: cover;" alt="Portal Settings &amp; Preferences">
            <div class="caption-strip">
              <span><strong>INSTITUTIONAL POLICIES:</strong> Script Assignment Models, Speed Pacing &amp; 2FA</span>
              <span class="highlight">Actual Screen</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Trust & Verification Footer Strip -->
      <div class="footer-trust-strip" style="margin-top: 2.2mm; margin-bottom: 0;">
        <span class="trust-item"><span class="trust-check">&#10003;</span> 100% Blind Anonymity</span>
        <span class="trust-item"><span class="trust-check">&#10003;</span> Question-Wise Rubric Marking</span>
        <span class="trust-item"><span class="trust-check">&#10003;</span> Anti-Rush Speed Pacing</span>
        <span class="trust-item"><span class="trust-check">&#10003;</span> Dynamic Script Snatching</span>
        <span class="trust-item"><span class="trust-check">&#10003;</span> Immutable Audit Security</span>
      </div>

    </div>

    <!-- Page 4 Footer -->
    <div>
      <div class="footer-bar">
        <span>Request an Executive Demonstration: contact@osm.portal.edu &bull; Smart OSM Unified Platform</span>
        <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
        <span>Page 4 of 4</span>
      </div>
    </div>

  </div>
</div>

</body>
</html>
"""

with open('osm_corporate_brochure.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"HTML written to osm_corporate_brochure.html ({len(html_content)} chars)")
