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
  }}

  .page {{
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    padding: 8.5mm 11.5mm 7.5mm 11.5mm;
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
    padding: 1.8mm 2.4mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2.2mm;
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
    width: 3.6mm;
    height: 3.6mm;
    border-radius: 50%;
    background: #0284c7;
    color: white;
    font-size: 5.5pt;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .pf-num.portal-active {{
    background: #0d9488;
  }}

  .pf-title {{
    font-size: 6pt;
    font-weight: 700;
    color: #f8fafc;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }}

  .pf-sub {{
    font-size: 5pt;
    color: #94a3b8;
    font-weight: 500;
  }}

  .pf-arrow {{
    color: #38bdf8;
    font-size: 7pt;
    font-weight: bold;
    opacity: 0.7;
    margin: 0 0.5mm;
  }}

  /* 4 Tiers / Spec Badges */
  .stats-strip {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2mm;
    margin-bottom: 2.2mm;
  }}

  .stat-pill-box {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1.5mm;
    padding: 1.4mm 1.8mm;
    display: flex;
    flex-direction: column;
  }}

  .stat-top {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }}

  .stat-value {{
    font-size: 8.8pt;
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
    align-items: baseline;
    margin-bottom: 1.4mm;
  }}

  .block-title-wrap {{
    display: flex;
    align-items: center;
    gap: 1.8mm;
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
  }}

  .stage-badge.portal {{
    background: #0d9488;
  }}

  .block-title {{
    font-size: 8.5pt;
    font-weight: 800;
    color: #0b192c;
    letter-spacing: -0.2px;
  }}

  .block-sub {{
    font-size: 6pt;
    font-weight: 600;
    color: #64748b;
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
    font-size: 5.2pt;
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
    font-size: 6.6pt;
    font-weight: 800;
    color: #0b192c;
    line-height: 1.15;
  }}

  .f-text-desc {{
    font-size: 5.7pt;
    font-weight: 500;
    color: #475569;
    line-height: 1.3;
    margin-top: 0.3mm;
  }}

  /* Allocation & Distribution Strip */
  .allocation-banner {{
    background: linear-gradient(135deg, #091a2f 0%, #0f2e4d 100%);
    border-radius: 1.8mm;
    padding: 2.4mm 3mm;
    color: #ffffff;
    margin-bottom: 2.2mm;
  }}

  .allocation-title {{
    font-size: 7.8pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #ffffff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5mm;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    padding-bottom: 1mm;
  }}

  .alloc-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2.4mm;
  }}

  .alloc-card {{
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1.5mm;
    padding: 1.5mm;
  }}

  .alloc-card-title {{
    font-size: 6.4pt;
    font-weight: 800;
    color: #38bdf8;
    margin-bottom: 0.6mm;
    display: flex;
    align-items: center;
    gap: 1mm;
  }}

  .alloc-card-desc {{
    font-size: 5.4pt;
    font-weight: 400;
    color: #cbd5e1;
    line-height: 1.28;
  }}

  /* 2-Column Action Grid */
  .dual-action-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.8mm;
    margin-top: 2mm;
    margin-bottom: 2mm;
  }}

  .action-box {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1.8mm;
    padding: 2mm;
  }}

  .action-title {{
    font-size: 7pt;
    font-weight: 800;
    color: #0b192c;
    display: flex;
    align-items: center;
    gap: 1.4mm;
    margin-bottom: 1mm;
  }}

  .action-desc {{
    font-size: 5.7pt;
    font-weight: 500;
    color: #475569;
    line-height: 1.3;
    margin-bottom: 0.8mm;
  }}

  /* 4 Pillars Card Grid (for Template Editor & Benefits) */
  .pillars-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2mm;
    margin-top: 2mm;
  }}

  .pillar-card {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1.5mm;
    padding: 1.6mm;
  }}

  .pillar-title {{
    font-size: 6.2pt;
    font-weight: 800;
    color: #0b192c;
    margin-bottom: 0.5mm;
  }}

  .pillar-desc {{
    font-size: 5.3pt;
    font-weight: 500;
    color: #64748b;
    line-height: 1.25;
  }}

  .pillar-tag {{
    font-size: 5pt;
    font-weight: 700;
    color: #0284c7;
    margin-top: 0.8mm;
    display: inline-block;
  }}

  /* Trust Banner & Footers */
  .trust-banner {{
    background: linear-gradient(90deg, #0b192c 0%, #1e293b 100%);
    border-radius: 1.8mm;
    padding: 2mm 3.2mm;
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
    font-size: 6.2pt;
    font-weight: 700;
    letter-spacing: 0.3px;
  }}

  .trust-badge-icon {{
    width: 3.6mm;
    height: 3.6mm;
    background: #0284c7;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 5pt;
  }}

  .footer-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1.8mm;
    border-top: 1px solid #e2e8f0;
    font-size: 5.8pt;
    font-weight: 600;
    color: #64748b;
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

      <!-- 7-Step Connected Workflow Bar -->
      <div class="platform-workflow">
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num">1</span><span class="pf-title">Physical Booklet</span></div>
          <span class="pf-sub">Candidate Intake</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num">2</span><span class="pf-title">High-Speed Scan</span></div>
          <span class="pf-sub">300 DPI CZUR/TWAIN</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num">3</span><span class="pf-title">Page Validation</span></div>
          <span class="pf-sub">Neural Sequence OCR</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num">4</span><span class="pf-title">PDF Generation</span></div>
          <span class="pf-sub">Tamper-Evident PDF/A</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num portal-active">5</span><span class="pf-title" style="color:#2dd4bf;">Web Application</span></div>
          <span class="pf-sub">Cloud Distribution</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num portal-active">6</span><span class="pf-title" style="color:#2dd4bf;">Examiner Allotment</span></div>
          <span class="pf-sub">Equal / Daily Quota</span>
        </div>
        <span class="pf-arrow">&#10148;</span>
        <div class="pf-step">
          <div class="pf-step-header"><span class="pf-num portal-active">7</span><span class="pf-title" style="color:#2dd4bf;">Digital Evaluation</span></div>
          <span class="pf-sub">Question-Wise Marking</span>
        </div>
      </div>

      <!-- 4 Core Metric Badges from User PDF -->
      <div class="stats-strip">
        <div class="stat-pill-box">
          <div class="stat-top"><span class="stat-value">1080p</span><span class="stat-badge-tag">300 DPI</span></div>
          <span class="stat-desc">Live camera capture with real-time curvature flattening and background whitening.</span>
        </div>
        <div class="stat-pill-box">
          <div class="stat-top"><span class="stat-value">Multi-pass</span><span class="stat-badge-tag">Neural OCR</span></div>
          <span class="stat-desc">Real-time page validation audits page numbers directly at the scanner desk.</span>
        </div>
        <div class="stat-pill-box">
          <div class="stat-top"><span class="stat-value">PDF/A</span><span class="stat-badge-tag">Archival</span></div>
          <span class="stat-desc">Tamper-evident output compiled on-the-go with barcode and roll number binding.</span>
        </div>
        <div class="stat-pill-box">
          <div class="stat-top"><span class="stat-value">4 tiers</span><span class="stat-badge-tag">Role-Based</span></div>
          <span class="stat-desc">Access control for Operators, Center Supervisors, Coordinators, and Evaluators.</span>
        </div>
      </div>

      <!-- Live Capture Device Frame (Screenshot 1) -->
      <div class="browser-frame" style="margin-bottom: 2.2mm;">
        <div class="browser-header">
          <div class="browser-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <div class="browser-url">OSM Scanner Studio | live capture</div>
          <div class="browser-tag">LIVE STREAM 300 DPI</div>
        </div>
        <img src="{scan_studio_b64}" class="browser-img" style="height: 62mm; object-fit: cover;" alt="OSM Scanner Studio Live Capture">
        <div class="caption-strip">
          <span><strong>PRODUCTION VIEW:</strong> Real-Time Booklet Feed &bull; 1080p &bull; Spine Curvature Flattening &bull; Foot Pedal Trigger</span>
          <span class="highlight">CZUR &amp; TWAIN Hardware Bridged</span>
        </div>
      </div>

      <!-- Enterprise Capabilities 4-Grid from PDF 1 -->
      <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 1.8mm; padding: 2.4mm 3mm;">
        <div style="font-size: 7.4pt; font-weight: 800; color: #0b192c; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 1.4mm; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.8mm;">
          Enterprise Digitisation Capabilities
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.2mm;">
          <div>
            <div style="font-size: 6.4pt; font-weight: 800; color: #0284c7; margin-bottom: 0.4mm;">High-Speed Digitisation</div>
            <p style="font-size: 5.4pt; color: #475569; line-height: 1.3;">Native CZUR &amp; TWAIN driver bridging with real-time spine curvature flattening and background whitening.</p>
          </div>
          <div>
            <div style="font-size: 6.4pt; font-weight: 800; color: #0284c7; margin-bottom: 0.4mm;">Multi-Pass Sequence OCR</div>
            <p style="font-size: 5.4pt; color: #475569; line-height: 1.3;">Instant neural page-order audit catches missing pages or sequence jumps directly at the scanner desk.</p>
          </div>
          <div>
            <div style="font-size: 6.4pt; font-weight: 800; color: #0284c7; margin-bottom: 0.4mm;">Blind Marking Governance</div>
            <p style="font-size: 5.4pt; color: #475569; line-height: 1.3;">Automated barcode pseudonymisation guarantees 100% unbiased, blind evaluation workflows.</p>
          </div>
          <div>
            <div style="font-size: 6.4pt; font-weight: 800; color: #0284c7; margin-bottom: 0.4mm;">Centralized Control Room</div>
            <p style="font-size: 5.4pt; color: #475569; line-height: 1.3;">Unified web portal tracking scanning batches, evaluator grading velocity, and regulatory audit compliance.</p>
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

      <!-- 2 Major Capabilities (High-Speed Scanning & Neural Validation) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-bottom: 2.4mm;">
        <!-- 1 High-Speed Document Scanning -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1.8mm; padding: 2.2mm;">
          <div style="font-size: 7.5pt; font-weight: 800; color: #0b192c; display: flex; align-items: center; gap: 1.5mm; margin-bottom: 1.2mm;">
            <span style="color: #0284c7;">1</span>
            High-Speed Document Scanning
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

        <!-- 2 Intelligent Page Number Validation -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1.8mm; padding: 2.2mm;">
          <div style="font-size: 7.5pt; font-weight: 800; color: #0b192c; display: flex; align-items: center; gap: 1.5mm; margin-bottom: 1.2mm;">
            <span style="color: #0284c7;">2</span>
            Intelligent Page Number Validation
          </div>
          <ul class="feature-list">
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Multi-Pass Neural OCR:</span>
                <p class="f-text-desc">Reads and validates printed page numbers on every booklet scan with high optical confidence.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Parity &amp; Sequence Auditing:</span>
                <p class="f-text-desc">Detects missing pages, duplicate captures, order reversals and abnormal sequence jumps in real time.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Two-Page Facing Spread Support:</span>
                <p class="f-text-desc">Dual-page geometry evaluation (2k, 2k+1) prevents false jump warnings on open booklet spreads.</p>
              </div>
            </li>
            <li class="feature-item">
              <div class="f-check teal">&#10003;</div>
              <div>
                <span class="f-text-title">Instant Sequence OCR Toggle:</span>
                <p class="f-text-desc">One-click banner toggle between strict page auditing and rapid continuous intake.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Interactive Template & ROI Editor Screenshot (Screenshot 2) -->
      <div class="browser-frame" style="margin-bottom: 2.4mm;">
        <div class="browser-header">
          <div class="browser-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <div class="browser-url">Interactive Visual Template Editor &amp; Creator (OSM)</div>
          <div class="browser-tag">TEMPLATE CALIBRATION</div>
        </div>
        <img src="{template_editor_b64}" class="browser-img" style="height: 54mm; object-fit: cover;" alt="Interactive Visual Template Editor">
        <div class="caption-strip">
          <span><strong>CALIBRATE ONCE, SCAN THOUSANDS:</strong> Page Dimensions, Page-Number Area, Barcode &amp; Confidential Blur ROI</span>
          <span class="highlight">Visual Template Engine</span>
        </div>
      </div>

      <!-- 4 Pillars for Template Editor from PDF 1 -->
      <div class="pillars-grid">
        <div class="pillar-card">
          <div class="pillar-title">Draw tools</div>
          <div class="pillar-desc">Mark page dimension, page-number area, barcode area and starting blur area directly on the scan.</div>
          <span class="pillar-tag">Precision Calibration</span>
        </div>
        <div class="pillar-card">
          <div class="pillar-title">Template selection</div>
          <div class="pillar-desc">Choose an existing template or create a new one for each booklet design.</div>
          <span class="pillar-tag">Multi-Paper Formats</span>
        </div>
        <div class="pillar-card">
          <div class="pillar-title">Specifications</div>
          <div class="pillar-desc">Template name, A4 preset, crop margin, page-number area, total pages and Auto-Set All Defaults.</div>
          <span class="pillar-tag">Auto-Set Defaults</span>
        </div>
        <div class="pillar-card">
          <div class="pillar-title">Capture settings</div>
          <div class="pillar-desc">Page capture format, skip cover, page range and barcode availability on the candidate page.</div>
          <span class="pillar-tag">Format Governance</span>
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
            <div class="brand-sub">Stages 04 - 06 &bull; Secure Archive, Master Papers Registry &amp; Question Rubrics</div>
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
          Every booklet becomes an encrypted, tamper-evident digital file synchronized to the centralized web portal. Examination coordinators configure master papers, assign Catch Numbers, build question rubrics, and allocate scripts.
        </p>
      </div>

      <!-- Automated PDF & Transfer Strip (Stages 04-05 from PDF 1) -->
      <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 1.8mm; padding: 2mm 2.5mm; margin-bottom: 2.2mm;">
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
            <img src="{papers_hub_b64}" class="browser-img" style="height: 27mm; object-fit: cover;" alt="Papers Management Dashboard">
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
      <div class="content-block">
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
                <p class="f-text-desc">Enforce rules like <em>"Attempt Any 5 of 8 Questions"</em> or Grouped Optionals — the system automatically flags excess attempts and honors best marks.</p>
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
              <img src="{batch_modal_b64}" style="width: 100%; max-height: 27mm; object-fit: contain; border-radius: 1.2mm; display: block;" alt="Configure Batch Sections">
            </div>
            <div class="caption-strip">
              <span><strong>RUBRIC SCHEMA:</strong> Section A, Question Types, Optional Flags &amp; Exact Marks</span>
              <span class="highlight">Actual Screen</span>
            </div>
          </div>
        </div>
      </div>

      <!-- STAGES 03 & 04: Examiner Invitation & Script Allocation Strategies -->
      <div class="allocation-banner" style="margin-top: 2.2mm; margin-bottom: 0;">
        <div class="allocation-title">
          <span>Web Stages 03 &amp; 04: Examiner Invitation, Workload Ordering &amp; Script Allocation</span>
          <span style="font-size: 5.2pt; font-weight: 700; background: #0284c7; padding: 1px 4.5px; border-radius: 2px;">Production Allocation Engine</span>
        </div>
        <div class="alloc-grid">
          <div class="alloc-card">
            <div class="alloc-card-title">&#10003; Examiner Invitation &amp; Ordering</div>
            <p class="alloc-card-desc">Invite certified faculty via official invitation tokens, assign them to specific subjects, set priority ordering, and track active evaluation capacity in real-time.</p>
          </div>
          <div class="alloc-card">
            <div class="alloc-card-title">&#10003; Equal Distribution + Date Limit</div>
            <p class="alloc-card-desc">Mathematically partitions scanned answer scripts equally across all verified examiners for that paper, enforced with a strict <strong>Completion Date Target</strong>.</p>
          </div>
          <div class="alloc-card">
            <div class="alloc-card-title">&#10003; Daily Allocation &amp; Randomized Order</div>
            <p class="alloc-card-desc">Allots scripts under strict daily quota caps (e.g. 50 scripts/day). All scripts are delivered in <strong>randomized order</strong> to eliminate bias and prevent collusion.</p>
          </div>
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
            <div class="brand-sub">Stages 06 - 07 &bull; Live Marking Workspace, Speed Pacing &amp; Dynamic Deallocation</div>
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
            <span class="block-title">Live On-Screen Evaluation &amp; Question-Wise Rubric Marking</span>
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
      <div class="dual-action-grid">
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
      <div class="content-block" style="margin-top: 0; padding-top: 1.6mm;">
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

    <!-- Bottom Trust Banner & Page 4 Footer -->
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

print('Full 4-page merged Smart OSM brochure HTML written successfully!')
