import os
import base64
import subprocess
import shutil

def get_b64(path):
    with open(path, 'rb') as f:
        ext = os.path.splitext(path)[1].lower()
        mime = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png'
        return f'data:{mime};base64,' + base64.b64encode(f.read()).decode('utf-8')

# High quality screenshot assets
scan_studio_b64 = get_b64(r'd:\OnScreenMarking\OSMNew\extracted_screenshots\screenshot_1_1700x980.png')
template_editor_b64 = get_b64(r'd:\OnScreenMarking\OSMNew\extracted_screenshots\screenshot_2_1645x1087.png')
papers_hub_b64 = get_b64(r'd:\OnScreenMarking\extracted_assets\cropped\app_content_3.png')
batch_modal_b64 = get_b64(r'd:\OnScreenMarking\extracted_assets\cropped\batch_configure_modal.png')
eval_workspace_b64 = get_b64(r'd:\OnScreenMarking\extracted_assets\cropped\app_content_4.png')
settings_b64 = get_b64(r'd:\OnScreenMarking\extracted_assets\cropped\app_content_1.png')

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Smart OSM - Corporate Technology Summit Brochure</title>
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

  :root {{
    --navy: #0b192c;
    --navy-dark: #07101d;
    --slate-dark: #1e293b;
    --slate: #475569;
    --slate-light: #64748b;
    --electric: #1d4ed8;
    --electric-bright: #2563eb;
    --cyan: #0284c7;
    --cyan-bright: #0ea5e9;
    --teal: #0f766e;
    --teal-light: #14b8a6;
    --bg-page: #ffffff;
    --bg-subtle: #f8fafc;
    --border-card: #e2e8f0;
    --border-light: #cbd5e1;
  }}

  body {{
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: var(--navy);
    background-color: #f1f5f9;
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
    background-color: var(--bg-page);
    box-sizing: border-box;
    overflow: hidden;
    padding: 8mm 9mm 8mm 9mm;
  }}

  .page:last-child {{
    page-break-after: avoid;
  }}

  .content-layer {{
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  /* Unified Executive Header */
  .header-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--electric);
    padding-bottom: 2.2mm;
    margin-bottom: 2.2mm;
  }}

  .brand-group {{
    display: flex;
    align-items: center;
    gap: 2.8mm;
  }}

  .brand-logo-icon {{
    background: linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%);
    color: #ffffff;
    font-weight: 800;
    font-size: 11.5pt;
    letter-spacing: -0.4px;
    padding: 1.6mm 3.2mm;
    border-radius: 2mm;
    box-shadow: 0 2px 6px rgba(2, 132, 199, 0.28);
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .brand-title-wrap {{
    display: flex;
    flex-direction: column;
  }}

  .brand-name {{
    font-size: 13.5pt;
    font-weight: 800;
    color: var(--navy);
    letter-spacing: -0.4px;
    display: flex;
    align-items: center;
    gap: 2.2mm;
    line-height: 1.15;
  }}

  .brand-badge {{
    font-size: 5.8pt;
    font-weight: 700;
    text-transform: uppercase;
    background: #e0f2fe;
    color: var(--cyan);
    padding: 1px 5mm;
    border-radius: 1.5mm;
    letter-spacing: 0.5px;
  }}

  .brand-badge.teal {{
    background: #ccfbf1;
    color: var(--teal);
  }}

  .brand-sub {{
    font-size: 6pt;
    font-weight: 700;
    color: var(--slate-light);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-top: 0.4mm;
  }}

  .header-pills {{
    display: flex;
    gap: 1.8mm;
    align-items: center;
  }}

  .pill {{
    font-size: 6pt;
    font-weight: 700;
    padding: 1.1mm 2.8mm;
    border-radius: 1.5mm;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    white-space: nowrap;
  }}

  .pill-teal {{
    background: #ccfbf1;
    color: var(--teal);
    border: 1px solid #99f6e4;
  }}

  .pill-navy {{
    background: var(--navy);
    color: #ffffff;
  }}

  .pill-blue {{
    background: #eff6ff;
    color: var(--electric);
    border: 1px solid #bfdbfe;
  }}

  /* Hero Headline Block */
  .hero-block {{
    margin-bottom: 2.2mm;
  }}

  .hero-eyebrow {{
    display: inline-flex;
    align-items: center;
    gap: 1.4mm;
    font-size: 6.4pt;
    font-weight: 800;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin-bottom: 0.8mm;
  }}

  .hero-headline {{
    font-size: 15.5pt;
    font-weight: 800;
    color: var(--navy);
    letter-spacing: -0.4px;
    line-height: 1.15;
    margin-bottom: 1.1mm;
  }}

  .hero-subhead {{
    font-size: 7.1pt;
    color: var(--slate);
    line-height: 1.38;
    font-weight: 500;
  }}

  /* Chic Browser / Screen Window Frame */
  .browser-frame {{
    background: #ffffff;
    border: 1px solid var(--border-card);
    border-radius: 2.2mm;
    box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.08);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }}

  .browser-header {{
    background: #f8fafc;
    padding: 1.2mm 2.6mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e2e8f0;
  }}

  .browser-dots {{
    display: flex;
    gap: 1.2mm;
  }}

  .dot {{
    width: 2mm;
    height: 2mm;
    border-radius: 50%;
  }}
  .dot-red {{ background: #ef4444; }}
  .dot-yellow {{ background: #f59e0b; }}
  .dot-green {{ background: #10b981; }}

  .browser-url {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 5.6pt;
    background: #ffffff;
    border: 1px solid var(--border-card);
    padding: 0.6px 5mm;
    border-radius: 1.2mm;
    color: var(--slate);
    font-weight: 500;
  }}

  .browser-tag {{
    font-size: 5.8pt;
    font-weight: 700;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }}

  .browser-img {{
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
  }}

  .caption-strip {{
    background: var(--navy);
    color: #f8fafc;
    padding: 1.2mm 2.6mm;
    font-size: 6pt;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }}

  .caption-strip .highlight {{
    color: #38bdf8;
    font-weight: 700;
  }}

  /* Chic Modern Feature Cards */
  .card-grid-2 {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.8mm;
  }}

  .card-grid-4 {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2.4mm;
  }}

  .card-grid-3 {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2.6mm;
  }}

  .chic-card {{
    background: #ffffff;
    border: 1px solid var(--border-card);
    border-radius: 2mm;
    padding: 2.2mm 2.8mm;
    box-shadow: 0 1px 4px -1px rgba(15, 23, 42, 0.05);
  }}

  .chic-card-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.4mm;
  }}

  .card-badge-num {{
    width: 5mm;
    height: 5mm;
    background: var(--electric);
    color: #ffffff;
    border-radius: 50%;
    font-size: 6.8pt;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }}

  .card-title {{
    font-size: 8.8pt;
    font-weight: 800;
    color: var(--navy);
    letter-spacing: -0.2px;
  }}

  /* Clean Feature List */
  .chic-list {{
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1.6mm;
  }}

  .chic-item {{
    display: flex;
    align-items: flex-start;
    gap: 1.8mm;
  }}

  .c-check {{
    width: 4mm;
    height: 4mm;
    border-radius: 50%;
    background: #e0f2fe;
    color: var(--cyan);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 5.6pt;
    font-weight: 800;
    flex-shrink: 0;
    margin-top: 0.3mm;
  }}

  .c-check.teal {{
    background: #ccfbf1;
    color: var(--teal);
  }}

  .c-text-title {{
    font-size: 7pt;
    font-weight: 800;
    color: var(--navy);
    line-height: 1.25;
  }}

  .c-text-desc {{
    font-size: 6.2pt;
    font-weight: 500;
    color: var(--slate);
    line-height: 1.34;
    margin-top: 0.3mm;
  }}

  /* Split Layout (Browser Frame + Bullets) */
  .split-layout {{
    display: grid;
    grid-template-columns: 1.22fr 1fr;
    gap: 3.2mm;
    align-items: center;
  }}

  .split-layout.reverse {{
    grid-template-columns: 1fr 1.22fr;
  }}

  /* Section Title Bar */
  .section-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.6mm;
    margin-top: 1.6mm;
  }}

  .section-badge-wrap {{
    display: flex;
    align-items: center;
    gap: 2mm;
  }}

  .stage-tag {{
    font-size: 6pt;
    font-weight: 800;
    color: #ffffff;
    background: var(--electric);
    padding: 1.2px 5.5px;
    border-radius: 1.5mm;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    white-space: nowrap;
  }}

  .stage-tag.portal {{
    background: var(--teal);
  }}

  .section-heading {{
    font-size: 9.8pt;
    font-weight: 800;
    color: var(--navy);
    letter-spacing: -0.2px;
  }}

  .section-subtext {{
    font-size: 5.8pt;
    font-weight: 600;
    color: var(--slate-light);
    white-space: nowrap;
  }}

  /* Footer Bar */
  .footer-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border-light);
    padding-top: 1.8mm;
    font-size: 6pt;
    font-weight: 600;
    color: var(--slate-light);
  }}

  /* Tag Pills within Cards */
  .tag-row {{
    display: flex;
    flex-wrap: wrap;
    gap: 1.2mm;
    margin-top: 1.6mm;
  }}

  .mini-tag {{
    font-size: 5.2pt;
    font-weight: 700;
    background: #f1f5f9;
    color: var(--slate-dark);
    padding: 0.6px 4mm;
    border-radius: 1.2mm;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }}

  code {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 5.5pt;
    background: #f1f5f9;
    padding: 0.5px 2.5px;
    border-radius: 1px;
    color: var(--electric);
  }}
</style>
</head>
<body>

<!-- =================================================================== -->
<!-- PAGE 1: SMART OSM SCANNING SOFTWARE - INGESTION & CAPTURE           -->
<!-- =================================================================== -->
<div class="page">
  <div class="content-layer">
    <div>
      <!-- Executive Header with OSM Logo -->
      <div class="header-bar">
        <div class="brand-group">
          <div class="brand-logo-icon">OSM</div>
          <div class="brand-title-wrap">
            <div class="brand-name">
              Smart OSM
              <span class="brand-badge">Scanning Software</span>
            </div>
            <div class="brand-sub">Stage 01 &bull; High-Speed Ingestion &bull; Hardware Driver Bridging</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">End-to-End Evaluation Ecosystem</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Hero Headline -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          High-Throughput Digitisation Desk
        </div>
        <h1 class="hero-headline">HIGH-SPEED BOOKLET DIGITISATION &amp; LIVE SCAN CAPTURE</h1>
        <p class="hero-subhead">
          High-speed physical answer booklet digitisation with real-time spine curvature flattening, intelligent background whitening, and direct CZUR &amp; TWAIN driver integration for non-stop candidate intake.
        </p>
      </div>

      <!-- 7-Step Connected Pipeline -->
      <div style="background: var(--navy); border-radius: 2mm; padding: 2.2mm 2mm; margin-bottom: 2.4mm; display: grid; grid-template-columns: repeat(7, 1fr); gap: 1.5mm;">
        <div style="text-align: center; color: #fff;">
          <div style="width: 4.8mm; height: 4.8mm; background: #0284c7; border-radius: 50%; margin: 0 auto 0.8mm; font-size: 6pt; font-weight: 800; display: flex; align-items: center; justify-content: center;">1</div>
          <div style="font-size: 5.4pt; font-weight: 800; text-transform: uppercase;">Physical Booklet</div>
          <div style="font-size: 4.8pt; color: #94a3b8; margin-top: 0.3mm;">Candidate Intake</div>
        </div>
        <div style="text-align: center; color: #fff;">
          <div style="width: 4.8mm; height: 4.8mm; background: #0284c7; border-radius: 50%; margin: 0 auto 0.8mm; font-size: 6pt; font-weight: 800; display: flex; align-items: center; justify-content: center;">2</div>
          <div style="font-size: 5.4pt; font-weight: 800; text-transform: uppercase;">High-Speed Scan</div>
          <div style="font-size: 4.8pt; color: #94a3b8; margin-top: 0.3mm;">300 DPI CZUR/TWAIN</div>
        </div>
        <div style="text-align: center; color: #fff;">
          <div style="width: 4.8mm; height: 4.8mm; background: #0284c7; border-radius: 50%; margin: 0 auto 0.8mm; font-size: 6pt; font-weight: 800; display: flex; align-items: center; justify-content: center;">3</div>
          <div style="font-size: 5.4pt; font-weight: 800; text-transform: uppercase;">Page Validation</div>
          <div style="font-size: 4.8pt; color: #94a3b8; margin-top: 0.3mm;">Neural Sequence OCR</div>
        </div>
        <div style="text-align: center; color: #fff;">
          <div style="width: 4.8mm; height: 4.8mm; background: #0284c7; border-radius: 50%; margin: 0 auto 0.8mm; font-size: 6pt; font-weight: 800; display: flex; align-items: center; justify-content: center;">4</div>
          <div style="font-size: 5.4pt; font-weight: 800; text-transform: uppercase;">PDF Generation</div>
          <div style="font-size: 4.8pt; color: #94a3b8; margin-top: 0.3mm;">Tamper-Evident PDF/A</div>
        </div>
        <div style="text-align: center; color: #fff;">
          <div style="width: 4.8mm; height: 4.8mm; background: #0d9488; border-radius: 50%; margin: 0 auto 0.8mm; font-size: 6pt; font-weight: 800; display: flex; align-items: center; justify-content: center;">5</div>
          <div style="font-size: 5.4pt; font-weight: 800; text-transform: uppercase;">Web Portal</div>
          <div style="font-size: 4.8pt; color: #94a3b8; margin-top: 0.3mm;">Cloud Distribution</div>
        </div>
        <div style="text-align: center; color: #fff;">
          <div style="width: 4.8mm; height: 4.8mm; background: #0d9488; border-radius: 50%; margin: 0 auto 0.8mm; font-size: 6pt; font-weight: 800; display: flex; align-items: center; justify-content: center;">6</div>
          <div style="font-size: 5.4pt; font-weight: 800; text-transform: uppercase;">Examiner Allotment</div>
          <div style="font-size: 4.8pt; color: #94a3b8; margin-top: 0.3mm;">Equal / Daily Quota</div>
        </div>
        <div style="text-align: center; color: #fff;">
          <div style="width: 4.8mm; height: 4.8mm; background: #0d9488; border-radius: 50%; margin: 0 auto 0.8mm; font-size: 6pt; font-weight: 800; display: flex; align-items: center; justify-content: center;">7</div>
          <div style="font-size: 5.4pt; font-weight: 800; text-transform: uppercase;">Digital Marking</div>
          <div style="font-size: 4.8pt; color: #94a3b8; margin-top: 0.3mm;">Question-Wise Scoring</div>
        </div>
      </div>

      <!-- 4 Stat Cards -->
      <div class="card-grid-4" style="margin-bottom: 2.4mm;">
        <div class="chic-card" style="padding: 1.8mm 2.2mm;">
          <div style="font-size: 11pt; font-weight: 800; color: var(--navy);">1080p <span style="font-size: 5.8pt; font-weight: 700; color: var(--electric); background: #eff6ff; padding: 0.5px 3.5px; border-radius: 1.5mm;">300 DPI</span></div>
          <p style="font-size: 5.8pt; color: var(--slate); margin-top: 0.6mm; line-height: 1.25;">Live camera stream with real-time curvature flattening and background whitening.</p>
        </div>
        <div class="chic-card" style="padding: 1.8mm 2.2mm;">
          <div style="font-size: 11pt; font-weight: 800; color: var(--navy);">Multi-Pass <span style="font-size: 5.8pt; font-weight: 700; color: var(--electric); background: #eff6ff; padding: 0.5px 3.5px; border-radius: 1.5mm;">Neural OCR</span></div>
          <p style="font-size: 5.8pt; color: var(--slate); margin-top: 0.6mm; line-height: 1.25;">Real-time page validation audits printed sequence numbers at the scanning desk.</p>
        </div>
        <div class="chic-card" style="padding: 1.8mm 2.2mm;">
          <div style="font-size: 11pt; font-weight: 800; color: var(--navy);">PDF/A <span style="font-size: 5.8pt; font-weight: 700; color: var(--electric); background: #eff6ff; padding: 0.5px 3.5px; border-radius: 1.5mm;">Archival</span></div>
          <p style="font-size: 5.8pt; color: var(--slate); margin-top: 0.6mm; line-height: 1.25;">Tamper-evident output compiled on-the-go with barcode and roll number binding.</p>
        </div>
        <div class="chic-card" style="padding: 1.8mm 2.2mm;">
          <div style="font-size: 11pt; font-weight: 800; color: var(--navy);">4 Tiers <span style="font-size: 5.8pt; font-weight: 700; color: var(--electric); background: #eff6ff; padding: 0.5px 3.5px; border-radius: 1.5mm;">Role-Based</span></div>
          <p style="font-size: 5.8pt; color: var(--slate); margin-top: 0.6mm; line-height: 1.25;">Access control across Operators, Center Supervisors, Coordinators, and Evaluators.</p>
        </div>
      </div>

      <!-- Live Scanner Capture (Actual Screen) -->
      <div class="browser-frame" style="margin-bottom: 2.4mm;">
        <div class="browser-header">
          <div class="browser-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <div class="browser-url">OSM Scanner Studio | live capture &bull; 1920x1080 300 DPI</div>
          <div class="browser-tag">Hardware Bridged</div>
        </div>
        <img src="{scan_studio_b64}" class="browser-img" style="height: 66mm; object-fit: cover;" alt="OSM Scanner Studio Capture">
        <div class="caption-strip">
          <span><strong>PRODUCTION VIEW:</strong> Real-Time Booklet Stream &bull; Spine Curvature Flattening &bull; Hands-Free Foot Pedal Trigger</span>
          <span class="highlight">CZUR &amp; TWAIN SDK Native</span>
        </div>
      </div>

      <!-- Enterprise Capabilities Grid -->
      <div class="chic-card">
        <div style="font-size: 7.2pt; font-weight: 800; color: var(--navy); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 1.4mm;">
          Enterprise Digitisation Capabilities
        </div>
        <div class="card-grid-4">
          <div>
            <div style="font-size: 6.6pt; font-weight: 800; color: var(--electric); margin-bottom: 0.5mm;">High-Speed Ingestion</div>
            <p style="font-size: 5.6pt; color: var(--slate); line-height: 1.3;">Native CZUR &amp; TWAIN driver bridging with continuous video multi-threading and background whitening.</p>
          </div>
          <div>
            <div style="font-size: 6.6pt; font-weight: 800; color: var(--electric); margin-bottom: 0.5mm;">Multi-Pass Sequence OCR</div>
            <p style="font-size: 5.6pt; color: var(--slate); line-height: 1.3;">Instant neural page-order audit catches missing pages or sequence jumps directly at the scanner desk.</p>
          </div>
          <div>
            <div style="font-size: 6.6pt; font-weight: 800; color: var(--electric); margin-bottom: 0.5mm;">Blind Marking Governance</div>
            <p style="font-size: 5.6pt; color: var(--slate); line-height: 1.3;">Automated barcode pseudonymisation guarantees 100% unbiased, double-blind evaluation workflows.</p>
          </div>
          <div>
            <div style="font-size: 6.6pt; font-weight: 800; color: var(--electric); margin-bottom: 0.5mm;">Centralized Control Room</div>
            <p style="font-size: 5.6pt; color: var(--slate); line-height: 1.3;">Unified web portal tracking scanning batches, evaluator grading velocity, and regulatory audit compliance.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Unified Footer -->
    <div class="footer-bar">
      <span>Smart OSM Scanning Software &bull; High-Speed Answer Booklet Digitisation &amp; Ingestion Desk</span>
      <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
      <span>Page 1 of 5</span>
    </div>
  </div>
</div>


<!-- =================================================================== -->
<!-- PAGE 2: CAPTURE & VALIDATE - TEMPLATE EDITOR & SEQUENCE OCR         -->
<!-- =================================================================== -->
<div class="page">
  <div class="content-layer">
    <div>
      <!-- Executive Header with OSM Logo -->
      <div class="header-bar">
        <div class="brand-group">
          <div class="brand-logo-icon">OSM</div>
          <div class="brand-title-wrap">
            <div class="brand-name">
              Smart OSM
              <span class="brand-badge">Capture &amp; Validate</span>
            </div>
            <div class="brand-sub">Stages 02 - 03 &bull; Neural Sequence Auditing &bull; Interactive ROI Calibration</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">Scanner Desk Quality Guard</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Hero Headline -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Audited Ingestion Quality Control
        </div>
        <h1 class="hero-headline">SCAN FAST. VALIDATE EVERY PAGE.</h1>
        <p class="hero-subhead">
          Overhead camera and TWAIN scanning that audits page order in real time, so errors are caught at the scanning desk, not at evaluation. Calibrate once, scan thousands of booklets with zero drift.
        </p>
      </div>

      <!-- Stages 02 & 03 Feature Cards -->
      <div class="card-grid-2" style="margin-bottom: 2.6mm;">
        <!-- Card 1 -->
        <div class="chic-card">
          <div class="chic-card-header">
            <div style="display: flex; align-items: center; gap: 2mm;">
              <div class="card-badge-num">1</div>
              <div class="card-title">High-Speed Document Scanning</div>
            </div>
            <span class="mini-tag">Hardware Bridge</span>
          </div>
          <ul class="chic-list">
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Native Hardware Integration:</span>
                <p class="c-text-desc">Direct driver &amp; SDK bridging with overhead production scanners (CZUR) and high-volume TWAIN document units.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Ergonomic Operator Triggers:</span>
                <p class="c-text-desc">Hands-free foot pedal, spacebar, and hardware USB triggers ensure rapid, zero-fatigue paper turnover.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Zero-Latency Multi-Threading:</span>
                <p class="c-text-desc">Asynchronous background I/O separates video capture from disk compression for continuous scanning without stutter.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Spine Curvature Flattening:</span>
                <p class="c-text-desc">Real-time book-curve flattening algorithms, automated finger removal, and background whitening purification.</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Card 2 -->
        <div class="chic-card">
          <div class="chic-card-header">
            <div style="display: flex; align-items: center; gap: 2mm;">
              <div class="card-badge-num">2</div>
              <div class="card-title">Intelligent Page Number Validation</div>
            </div>
            <span class="mini-tag">Sequence Guard</span>
          </div>
          <ul class="chic-list">
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Multi-Pass Neural OCR:</span>
                <p class="c-text-desc">Extracts and audits printed page numbers across every scanned booklet with high optical confidence.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Parity &amp; Sequence Auditing:</span>
                <p class="c-text-desc">Instantly alerts operators to missing pages, duplicate scans, reversed sheets, and sequence gaps.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Two-Page Facing Spread Detection:</span>
                <p class="c-text-desc">Mathematical parity checking (<code>2k</code>, <code>2k+1</code>) prevents false jump warnings on open spreads.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Instant Sequence OCR Toggle:</span>
                <p class="c-text-desc">One-click interface banner toggle switching between strict sequence auditing and rapid continuous ingestion.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Interactive Template Editor (Actual Screen) -->
      <div class="browser-frame" style="margin-bottom: 2.6mm;">
        <div class="browser-header">
          <div class="browser-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <div class="browser-url">Interactive Visual Template Editor &amp; Creator (OSM)</div>
          <div class="browser-tag" style="color: var(--electric);">Template Calibration</div>
        </div>
        <img src="{template_editor_b64}" class="browser-img" style="height: 72mm; object-fit: cover;" alt="Interactive Visual Template Editor">
        <div class="caption-strip">
          <span><strong>CALIBRATE ONCE, SCAN THOUSANDS:</strong> Page Dimensions, Page-Number ROI, Barcode &amp; Confidential Blur ROI</span>
          <span class="highlight">Visual Calibration Studio</span>
        </div>
      </div>

      <!-- 4 Template Tools Cards -->
      <div class="card-grid-4">
        <div class="chic-card" style="padding: 1.8mm 2.2mm;">
          <div style="font-size: 6.8pt; font-weight: 800; color: var(--navy); margin-bottom: 0.6mm;">Draw Tools</div>
          <p style="font-size: 5.6pt; color: var(--slate); line-height: 1.28;">Mark page boundary, page-number area, barcode region, and confidential blur zones directly on the live scan.</p>
          <div class="mini-tag" style="margin-top: 1.2mm; display: inline-block;">Precision ROI</div>
        </div>
        <div class="chic-card" style="padding: 1.8mm 2.2mm;">
          <div style="font-size: 6.8pt; font-weight: 800; color: var(--navy); margin-bottom: 0.6mm;">Template Selection</div>
          <p style="font-size: 5.6pt; color: var(--slate); line-height: 1.28;">Assign existing master templates or generate new calibration profiles for multi-pattern booklet layouts.</p>
          <div class="mini-tag" style="margin-top: 1.2mm; display: inline-block;">Multi-Paper Formats</div>
        </div>
        <div class="chic-card" style="padding: 1.8mm 2.2mm;">
          <div style="font-size: 6.8pt; font-weight: 800; color: var(--navy); margin-bottom: 0.6mm;">Specifications</div>
          <p style="font-size: 5.6pt; color: var(--slate); line-height: 1.28;">Configure template name, A4 preset, crop margins, total pages, and execute one-click Auto-Set All Defaults.</p>
          <div class="mini-tag" style="margin-top: 1.2mm; display: inline-block;">Auto-Set Defaults</div>
        </div>
        <div class="chic-card" style="padding: 1.8mm 2.2mm;">
          <div style="font-size: 6.8pt; font-weight: 800; color: var(--navy); margin-bottom: 0.6mm;">Capture Settings</div>
          <p style="font-size: 5.6pt; color: var(--slate); line-height: 1.28;">Set capture format, skip cover option, page ranges, and verify barcode availability on the candidate page.</p>
          <div class="mini-tag" style="margin-top: 1.2mm; display: inline-block;">Format Governance</div>
        </div>
      </div>
    </div>

    <!-- Unified Footer -->
    <div class="footer-bar">
      <span>Smart OSM Scanning Software &bull; Capture, Page Sequence Auditing &amp; Template Calibration</span>
      <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
      <span>Page 2 of 5</span>
    </div>
  </div>
</div>


<!-- =================================================================== -->
<!-- PAGE 3: ARCHIVE, TRANSFER & WEB PORTAL INGESTION HUB                -->
<!-- =================================================================== -->
<div class="page">
  <div class="content-layer">
    <div>
      <!-- Executive Header with OSM Logo -->
      <div class="header-bar">
        <div class="brand-group">
          <div class="brand-logo-icon">OSM</div>
          <div class="brand-title-wrap">
            <div class="brand-name">
              OSM PLATFORM
              <span class="brand-badge">Archive &amp; Ingestion</span>
            </div>
            <div class="brand-sub">Stages 04 - 05 &bull; Tamper-Evident PDF/A &bull; Central Papers Registry</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">Where Scanning Meets Web Portal</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Hero Headline -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          From Scanning Desks to Centralized Examination Hub
        </div>
        <h1 class="hero-headline">SECURE ARCHIVE COMPILATION &amp; EXAMINATION REGISTRY</h1>
        <p class="hero-subhead">
          Every booklet becomes an encrypted, tamper-evident digital file synchronized to the centralized web portal. Examination coordinators configure master papers, assign Catch Numbers, and bind master question papers.
        </p>
      </div>

      <!-- 4 Scanning Ingestion & Archival Pillars (Compact, Zero Stretching!) -->
      <div class="card-grid-2" style="margin-bottom: 2.6mm;">
        <!-- Card 3: Automated PDF Generation -->
        <div class="chic-card" style="padding: 2mm 2.6mm;">
          <div class="chic-card-header">
            <div style="display: flex; align-items: center; gap: 1.8mm;">
              <div class="card-badge-num">3</div>
              <div class="card-title">Automated PDF Generation</div>
            </div>
            <span class="mini-tag">PDF/A-1b &bull; PDF/A-2u</span>
          </div>
          <ul class="chic-list">
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">On-The-Go PDF Assembly:</span>
                <p class="c-text-desc">Progressively compiles candidate PDFs as pages are captured, eliminating post-scan processing delays.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Roll &amp; Barcode Metadata Binding:</span>
                <p class="c-text-desc">Decodes Code 128 / QR barcodes on cover pages and embeds candidate identifiers into document headers.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Automated Directory Partitioning:</span>
                <p class="c-text-desc">Routes PDFs into structured directory trees by Exam Year, Center Code, Subject ID, and Roll Number.</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Card 4: Scanning Quality & Error Management -->
        <div class="chic-card" style="padding: 2mm 2.6mm;">
          <div class="chic-card-header">
            <div style="display: flex; align-items: center; gap: 1.8mm;">
              <div class="card-badge-num">4</div>
              <div class="card-title">Scanning Quality &amp; Error Control</div>
            </div>
            <span class="mini-tag">Zero Audit Void</span>
          </div>
          <ul class="chic-list">
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Proactive Lighting Verification:</span>
                <p class="c-text-desc">Optical sensors monitor ambient lighting, automatically blocking captures under glare or shadow.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Non-Destructive Page Rescanning:</span>
                <p class="c-text-desc">Replace defective or skewed pages on-the-fly without re-scanning the entire booklet.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Interactive Sequence Correction:</span>
                <p class="c-text-desc">Side-by-side ROI close-ups and horizontal nudge buttons allow instant operator calibration.</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Card 5: Secure Local-to-Server Sync -->
        <div class="chic-card" style="padding: 2mm 2.6mm;">
          <div class="chic-card-header">
            <div style="display: flex; align-items: center; gap: 1.8mm;">
              <div class="card-badge-num">5</div>
              <div class="card-title">Secure Local-to-Server Sync</div>
            </div>
            <span class="mini-tag">TLS 1.3 Encryption</span>
          </div>
          <ul class="chic-list">
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Automated Duplex Synchronization:</span>
                <p class="c-text-desc">Transmits finalized PDFs from scanning stations to central institutional servers without manual steps.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Candidate SHA-256 Hash Binding:</span>
                <p class="c-text-desc">Embeds cryptographic hashes in file metadata to guarantee end-to-end tamper detection.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Transactional Atomic Commits:</span>
                <p class="c-text-desc">Two-phase commit handshakes ensure no partial, corrupted, or duplicate booklets are ever stored.</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Card 6: Hardware Telemetry & Control -->
        <div class="chic-card" style="padding: 2mm 2.6mm;">
          <div class="chic-card-header">
            <div style="display: flex; align-items: center; gap: 1.8mm;">
              <div class="card-badge-num">6</div>
              <div class="card-title">Hardware Telemetry &amp; Audit Logs</div>
            </div>
            <span class="mini-tag">Station Forensics</span>
          </div>
          <ul class="chic-list">
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Workstation Operator Logging:</span>
                <p class="c-text-desc">Tracks workstation ID, camera serial, operator login, scan timestamp, and duration per booklet.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">OCR Confidence Scoring:</span>
                <p class="c-text-desc">Records optical confidence metrics for every detected page number and barcode decode event in real time.</p>
              </div>
            </li>
            <li class="chic-item">
              <div class="c-check">&#10003;</div>
              <div>
                <span class="c-text-title">Proactive Environmental Alerts:</span>
                <p class="c-text-desc">Continuous sensor alerts for uneven ambient lighting, optical tilt, or physical lens obstruction.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Web Stage 01: Centralized Paper Creation & Catch Mapping (Where Web Portal Begins!) -->
      <div class="section-bar">
        <div class="section-badge-wrap">
          <span class="stage-tag portal">Web Stage 01</span>
          <span class="section-heading">Examination Paper Creation &amp; Catch Mapping Hub</span>
        </div>
        <span class="section-subtext">Centralized Paper Catalog &bull; Master Question Repository &bull; Readiness Telemetry</span>
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
            <div class="browser-tag" style="color: var(--teal);">Papers Hub</div>
          </div>
          <img src="{papers_hub_b64}" class="browser-img" style="height: 38mm; object-fit: cover;" alt="Papers Management Dashboard">
          <div class="caption-strip">
            <span><strong>PRODUCTION VIEW:</strong> Paper Code, Catch No, Master QP PDF &amp; Examiner Allotment</span>
            <span class="highlight">Active Registry</span>
          </div>
        </div>

        <!-- Papers Hub Bullets -->
        <ul class="chic-list">
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">Comprehensive Paper Ingestion:</span>
              <p class="c-text-desc">Register examination papers with Paper Code, Course Name, official Catch Number, Subject, Total Questions, and Maximum Marks.</p>
            </div>
          </li>
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">Question Master PDF Integration:</span>
              <p class="c-text-desc">Upload official question paper PDFs directly linked to the paper record for instant evaluator reference during live marking.</p>
            </div>
          </li>
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">Readiness Telemetry Checkpoints:</span>
              <p class="c-text-desc">Live pills display setup status across three mandatory checkpoints: Sections Configured, Evaluator Allotted, and QP PDF Uploaded.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Unified Footer -->
    <div class="footer-bar">
      <span>OSM Platform &bull; Ingestion Archive, Master Papers Registry &amp; Catch Mapping Hub</span>
      <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
      <span>Page 3 of 5</span>
    </div>
  </div>
</div>


<!-- =================================================================== -->
<!-- PAGE 4: SECTION RUBRICS, EXAMINER INVITATION & SCRIPT ALLOCATION    -->
<!-- =================================================================== -->
<div class="page">
  <div class="content-layer">
    <div>
      <!-- Executive Header with OSM Logo -->
      <div class="header-bar">
        <div class="brand-group">
          <div class="brand-logo-icon">OSM</div>
          <div class="brand-title-wrap">
            <div class="brand-name">
              OSM PORTAL
              <span class="brand-badge teal">Enterprise Edition</span>
            </div>
            <div class="brand-sub">Stages 02 - 04 &bull; Rubric Blueprints, Examiner Invitation &amp; Script Allocation</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">Integrated Workflow</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Hero Headline -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Structured Examination Administration Lifecycle
        </div>
        <h1 class="hero-headline">SECTION BATCH RUBRICS &amp; PRODUCTION SCRIPT ALLOCATION</h1>
        <p class="hero-subhead">
          Follow the transparent operational path: from multi-tier question rubric blueprints to certified examiner invitations, workload priority ordering, and automated quota distribution.
        </p>
      </div>

      <!-- 4-Step Administration Ribbon -->
      <div style="background: var(--navy); border-radius: 2mm; padding: 2.2mm 2.8mm; margin-bottom: 2.6mm; display: flex; justify-content: space-between; align-items: center; color: #ffffff;">
        <div style="display: flex; align-items: center; gap: 1.8mm; font-size: 6.2pt; font-weight: 700;">
          <span style="background: #0284c7; width: 4.6mm; height: 4.6mm; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 5.8pt; font-weight: 800;">1</span>
          <span>Paper Creation &amp; Catch Registry</span>
        </div>
        <span style="color: #38bdf8; font-size: 6pt;">&#9654;</span>
        <div style="display: flex; align-items: center; gap: 1.8mm; font-size: 6.2pt; font-weight: 700;">
          <span style="background: #0284c7; width: 4.6mm; height: 4.6mm; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 5.8pt; font-weight: 800;">2</span>
          <span>Section &amp; Rubric Blueprinting</span>
        </div>
        <span style="color: #38bdf8; font-size: 6pt;">&#9654;</span>
        <div style="display: flex; align-items: center; gap: 1.8mm; font-size: 6.2pt; font-weight: 700;">
          <span style="background: #0284c7; width: 4.6mm; height: 4.6mm; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 5.8pt; font-weight: 800;">3</span>
          <span>Examiner Invitation &amp; Ordering</span>
        </div>
        <span style="color: #38bdf8; font-size: 6pt;">&#9654;</span>
        <div style="display: flex; align-items: center; gap: 1.8mm; font-size: 6.2pt; font-weight: 700;">
          <span style="background: #0d9488; width: 4.6mm; height: 4.6mm; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 5.8pt; font-weight: 800;">4</span>
          <span>Randomized Script Allocation</span>
        </div>
      </div>

      <!-- Stage 02: Section Batch Blueprints & Question Rubrics -->
      <div class="section-bar">
        <div class="section-badge-wrap">
          <span class="stage-tag portal">Web Stage 02</span>
          <span class="section-heading">Section Batch Blueprints &amp; Dynamic Question Rubrics</span>
        </div>
        <span class="section-subtext">Granular Multi-Tier Rules &bull; Optional Attempts &bull; Mark Validations</span>
      </div>

      <div class="split-layout reverse" style="margin-bottom: 2.8mm;">
        <!-- Rubric Features -->
        <ul class="chic-list">
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">Multi-Tier Section Architecture:</span>
              <p class="c-text-desc">Structure papers into Section Batches (e.g. Section A: MCQs, Section B: Analytical, Section C: Descriptive Long Essay) with defined Start and End Q# ranges.</p>
            </div>
          </li>
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">Attempt Limits &amp; Optional Controls:</span>
              <p class="c-text-desc">Configure rules like <em>"Attempt Any 5 of 8 Questions"</em> or Grouped Optionals (Grp A/B) &mdash; the system automatically honors best-marked attempts and flags excess answers.</p>
            </div>
          </li>
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">Mathematical Sum Integrity:</span>
              <p class="c-text-desc">The validation engine strictly ensures that the sum of all individual question marks mathematically matches the paper's maximum marks before locking.</p>
            </div>
          </li>
        </ul>

        <!-- Actual Screenshot: Batch Configure Modal -->
        <div class="browser-frame">
          <div class="browser-header">
            <div class="browser-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <div class="browser-url">https://osm.portal.edu/sections/batch-configure</div>
            <div class="browser-tag" style="color: var(--teal);">Rubric Manager</div>
          </div>
          <img src="{batch_modal_b64}" class="browser-img" style="height: 38mm; object-fit: cover;" alt="Configure Batch Sections">
          <div class="caption-strip">
            <span><strong>RUBRIC SCHEMA:</strong> Section A, Question Types, Optional Flags &amp; Exact Marks</span>
            <span class="highlight">Actual Screen</span>
          </div>
        </div>
      </div>

      <!-- Stages 03 & 04: Examiner Invitation & Script Allocation Strategies -->
      <div class="section-bar">
        <div class="section-badge-wrap">
          <span class="stage-tag portal">Web Stages 03 &amp; 04</span>
          <span class="section-heading">Examiner Invitation, Workload Ordering &amp; Script Allocation</span>
        </div>
        <span class="section-subtext">Production Allocation Engine &bull; Dual Distribution Models</span>
      </div>

      <div class="card-grid-3" style="margin-bottom: 2.2mm;">
        <!-- Card 1 -->
        <div class="chic-card" style="padding: 2.2mm 2.6mm;">
          <div style="font-size: 7.2pt; font-weight: 800; color: var(--navy); margin-bottom: 0.8mm; display: flex; align-items: center; gap: 1.4mm;">
            <span style="color: var(--cyan);">&#10003;</span> Examiner Invitation &amp; Ordering
          </div>
          <p style="font-size: 6pt; color: var(--slate); line-height: 1.35;">
            Invite certified faculty via official invitation tokens, assign them to specific subjects, set priority ordering (First Marker, Moderator), and track active evaluation capacity in real-time.
          </p>
          <div class="mini-tag" style="margin-top: 1.4mm; display: inline-block;">Faculty Onboarding</div>
        </div>

        <!-- Card 2 -->
        <div class="chic-card" style="padding: 2.2mm 2.6mm;">
          <div style="font-size: 7.2pt; font-weight: 800; color: var(--navy); margin-bottom: 0.8mm; display: flex; align-items: center; gap: 1.4mm;">
            <span style="color: var(--electric);">&#10003;</span> Equal Distribution + Date Limit
          </div>
          <p style="font-size: 6pt; color: var(--slate); line-height: 1.35;">
            Mathematically partitions scanned answer scripts equally across all verified examiners for that paper, enforced with a strict <strong>Completion Date Target</strong> deadline.
          </p>
          <div class="mini-tag" style="margin-top: 1.4mm; display: inline-block;">Target Deadline</div>
        </div>

        <!-- Card 3 -->
        <div class="chic-card" style="padding: 2.2mm 2.6mm;">
          <div style="font-size: 7.2pt; font-weight: 800; color: var(--navy); margin-bottom: 0.8mm; display: flex; align-items: center; gap: 1.4mm;">
            <span style="color: var(--teal);">&#10003;</span> Daily Allocation &amp; Randomization
          </div>
          <p style="font-size: 6pt; color: var(--slate); line-height: 1.35;">
            Allots scripts under strict daily quota caps (e.g. 50 scripts/day). All scripts are delivered in <strong>randomized order</strong> to eliminate bias and prevent collusion.
          </p>
          <div class="mini-tag" style="margin-top: 1.4mm; display: inline-block;">Anti-Collusion Delivery</div>
        </div>
      </div>

      <!-- 3-Point Pre-Allocation Readiness Gate -->
      <div style="background: var(--navy); border-radius: 2mm; padding: 1.8mm 2.8mm; display: flex; align-items: center; justify-content: space-between; color: #ffffff;">
        <div style="display: flex; align-items: center; gap: 2.2mm;">
          <div style="width: 5mm; height: 5mm; background: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 6.4pt; font-weight: 800;">!</div>
          <div>
            <span style="font-size: 6.4pt; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.4px;">Three-Point Institutional Readiness Verification Gate</span>
            <p style="font-size: 5.5pt; color: #94a3b8; margin: 0;">Scripts remain locked until: [1] Section Rubrics Validated, [2] Certified Evaluators Ordered, [3] Master QP PDF Bound.</p>
          </div>
        </div>
        <span style="font-size: 5.8pt; font-weight: 700; color: #38bdf8; background: rgba(56, 189, 248, 0.14); padding: 1px 5.5px; border-radius: 1.5mm; border: 1px solid rgba(56, 189, 248, 0.3); white-space: nowrap;">Zero Setup Failure</span>
      </div>
    </div>

    <!-- Unified Footer -->
    <div class="footer-bar">
      <span>OSM Portal Enterprise Edition &bull; Paper Creation, Rubrics &amp; Script Allocation Lifecycle</span>
      <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
      <span>Page 4 of 5</span>
    </div>
  </div>
</div>


<!-- =================================================================== -->
<!-- PAGE 5: LIVE MARKING, SPEED PACING, SCRIPT SNATCHING & GOVERNANCE   -->
<!-- =================================================================== -->
<div class="page">
  <div class="content-layer">
    <div>
      <!-- Executive Header with OSM Logo -->
      <div class="header-bar">
        <div class="brand-group">
          <div class="brand-logo-icon">OSM</div>
          <div class="brand-title-wrap">
            <div class="brand-name">
              OSM PORTAL
              <span class="brand-badge">Evaluation &amp; Governance</span>
            </div>
            <div class="brand-sub">Stages 05 - 08 &bull; Live Marking Workspace, Speed Pacing &amp; Dynamic Deallocation</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">Live Marking Engine</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Hero Headline -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Question-Wise Evaluation, Pacing Safeguards &amp; Administrative Controls
        </div>
        <h1 class="hero-headline">PRECISION DIGITAL MARKING, PACING &amp; SCRIPT SNATCHING</h1>
        <p class="hero-subhead">
          Examiners grade scripts question-by-question with zero arithmetic errors and AI proctoring, while administrators enforce minimum checking times and retain the power to deallocate or snatch scripts from inactive evaluators.
        </p>
      </div>

      <!-- Stage 05: Live On-Screen Evaluation Workspace -->
      <div class="section-bar">
        <div class="section-badge-wrap">
          <span class="stage-tag portal">Web Stage 05 : Marking</span>
          <span class="section-heading">Live On-Screen Evaluation &amp; Question-Wise Rubric Marking</span>
        </div>
        <span class="section-subtext">100% Blind Anonymity &bull; Question Palette &bull; Annotations &bull; Dynamic 0% Tally Summation</span>
      </div>

      <div class="split-layout" style="margin-bottom: 2.6mm;">
        <!-- Actual Screenshot: Evaluator Workspace -->
        <div class="browser-frame">
          <div class="browser-header">
            <div class="browser-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <div class="browser-url">https://osm.portal.edu/evaluate/script/view</div>
            <div class="browser-tag" style="color: var(--teal);">Marking Workspace</div>
          </div>
          <img src="{eval_workspace_b64}" class="browser-img" style="height: 38mm; object-fit: cover;" alt="OSM Marking Workspace">
          <div class="caption-strip">
            <span><strong>ACTUAL APPLICATION SCREENSHOT:</strong> Live Candidate Script Evaluation Workspace</span>
            <span class="highlight">100% Blind Barcode Mask &bull; AI Proctoring Active</span>
          </div>
        </div>

        <!-- Question-Based Marking Bullets -->
        <ul class="chic-list">
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">100% Blind Barcode Masking:</span>
              <p class="c-text-desc">Candidate names, roll numbers, and physical barcodes are automatically masked with system tokens (<code>EXAM-2026_02_07...</code>) guaranteeing zero bias.</p>
            </div>
          </li>
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">Question-Based Rubric Scoring:</span>
              <p class="c-text-desc">Clicking any question in Section A/B/C palette opens rubric popup to award marks (0, 0.5, 1, 1.5, 2...) strictly matching configured max marks.</p>
            </div>
          </li>
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">Precision Annotation Stamps:</span>
              <p class="c-text-desc">Affix official Green Ticks, Red Crosses, Fractional Points, Text Remarks, and Blank Page stamps recorded into the audit ledger.</p>
            </div>
          </li>
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">0% Arithmetic &amp; Tally Errors:</span>
              <p class="c-text-desc">Dynamic automated aggregation continuously compiles section marks and total scores in real time, eliminating manual calculation errors.</p>
            </div>
          </li>
        </ul>
      </div>

      <!-- Stages 06 & 07: Dual Action Grid (Pacing & Snatching) -->
      <div class="card-grid-2" style="margin-bottom: 2.6mm;">
        <!-- Checking Time Limit / Pacing -->
        <div class="chic-card" style="padding: 2.2mm 2.8mm;">
          <div style="font-size: 7.2pt; font-weight: 800; color: var(--navy); margin-bottom: 1mm; display: flex; align-items: center; gap: 1.4mm;">
            <span style="color: var(--cyan);">&#10003;</span> Script Checking Time Limits &amp; Anti-Rush Profiles
          </div>
          <p style="font-size: 6pt; color: var(--slate); line-height: 1.35; margin-bottom: 1.2mm;">
            <strong>Mandatory Minimum Time-per-Copy:</strong> Administrators enforce a mandatory minimum duration per booklet (e.g. 15 minutes/copy). Marks submission remains locked until the evaluator spends adequate time reviewing every page.
          </p>
          <p style="font-size: 6pt; color: var(--slate); line-height: 1.35; margin-bottom: 0;">
            <strong>AI Proctoring &amp; Idle Timeouts:</strong> Continuous webcam face landmark verification (<code>compareFaces</code>), browser tab-blur detection, and automatic session lock after inactivity.
          </p>
        </div>

        <!-- Dynamic Deallocation / Snatching -->
        <div class="chic-card" style="padding: 2.2mm 2.8mm;">
          <div style="font-size: 7.2pt; font-weight: 800; color: var(--navy); margin-bottom: 1mm; display: flex; align-items: center; gap: 1.4mm;">
            <span style="color: var(--teal);">&#10003;</span> Dynamic Script Deallocation &amp; Snatching Control
          </div>
          <p style="font-size: 6pt; color: var(--slate); line-height: 1.35; margin-bottom: 1.2mm;">
            <strong>Administrative Script Snatching:</strong> If an examiner is inactive, unassigned, or falling behind schedule, coordinators can instantly overwrite allocation counts and <strong>snatch un-evaluated scripts</strong> back.
          </p>
          <p style="font-size: 6pt; color: var(--slate); line-height: 1.35; margin-bottom: 0;">
            <strong>Instant Reassignment &amp; Expiry Cleanup:</strong> Snatched scripts are immediately returned to the pending pool or reassigned to active examiners, preventing bottlenecks and guaranteeing deadlines.
          </p>
        </div>
      </div>

      <!-- Stage 08: Institutional Governance, 2FA & Audit Trail -->
      <div class="section-bar">
        <div class="section-badge-wrap">
          <span class="stage-tag" style="background: #0f172a;">Institutional Governance</span>
          <span class="section-heading">Portal Preferences, 2FA &amp; Security Compliance</span>
        </div>
        <span class="section-subtext">Script Assignment Models &bull; Speed Profile Pacing &bull; Immutable Audit Logs</span>
      </div>

      <div class="split-layout reverse" style="margin-bottom: 2.2mm;">
        <!-- Governance Bullets -->
        <ul class="chic-list">
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">Enterprise Security &amp; 2FA:</span>
              <p class="c-text-desc">Mandatory two-factor authentication for examiner logins and strict Role-Based Access Control (RBAC) across apex coordinators, controllers, and evaluators.</p>
            </div>
          </li>
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">Immutable Transaction Audit Trail:</span>
              <p class="c-text-desc">Every question mark awarded, annotation stamped, script allocated or snatched is logged into a tamper-evident audit record with examiner ID and timestamp.</p>
            </div>
          </li>
          <li class="chic-item">
            <div class="c-check teal">&#10003;</div>
            <div>
              <span class="c-text-title">Continuous Auto-Save &amp; Telemetry:</span>
              <p class="c-text-desc">Evaluations auto-save continuously every 30 seconds. Central control room monitors active grading velocity and department-wise deadlines.</p>
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
          <img src="{settings_b64}" class="browser-img" style="height: 34mm; object-fit: cover;" alt="Portal Settings &amp; Preferences">
          <div class="caption-strip">
            <span><strong>INSTITUTIONAL POLICIES:</strong> Script Assignment Models, Speed Pacing &amp; 2FA</span>
            <span class="highlight">Actual Screen</span>
          </div>
        </div>
      </div>

      <!-- Chic Trust Footer Strip -->
      <div style="background: var(--navy); border-radius: 1.8mm; padding: 1.6mm 2.8mm; display: flex; justify-content: space-between; align-items: center; color: #ffffff;">
        <span style="font-size: 5.8pt; font-weight: 700; display: flex; align-items: center; gap: 1.2mm; color: #e2e8f0;"><span style="color: #38bdf8; font-weight: 800;">&#10003;</span> 100% Blind Anonymity</span>
        <span style="font-size: 5.8pt; font-weight: 700; display: flex; align-items: center; gap: 1.2mm; color: #e2e8f0;"><span style="color: #38bdf8; font-weight: 800;">&#10003;</span> Question-Wise Rubric Marking</span>
        <span style="font-size: 5.8pt; font-weight: 700; display: flex; align-items: center; gap: 1.2mm; color: #e2e8f0;"><span style="color: #38bdf8; font-weight: 800;">&#10003;</span> Anti-Rush Speed Pacing</span>
        <span style="font-size: 5.8pt; font-weight: 700; display: flex; align-items: center; gap: 1.2mm; color: #e2e8f0;"><span style="color: #38bdf8; font-weight: 800;">&#10003;</span> Dynamic Script Snatching</span>
        <span style="font-size: 5.8pt; font-weight: 700; display: flex; align-items: center; gap: 1.2mm; color: #e2e8f0;"><span style="color: #38bdf8; font-weight: 800;">&#10003;</span> Immutable Audit Security</span>
      </div>
    </div>

    <!-- Unified Footer -->
    <div class="footer-bar">
      <span>Request an Executive Demonstration: contact@osm.portal.edu &bull; Smart OSM Unified Platform</span>
      <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
      <span>Page 5 of 5</span>
    </div>
  </div>
</div>

</body>
</html>
"""

html_path = r"d:\OnScreenMarking\osm_chic_5page_brochure.html"
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"HTML written to {html_path} ({len(html_content)} characters)")
