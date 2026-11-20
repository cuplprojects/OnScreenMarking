import os
import base64
import subprocess

def get_b64(path):
    with open(path, 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')

app1_b64 = get_b64('extracted_assets/cropped/app_content_1.png')
modal2_b64 = get_b64('extracted_assets/cropped/batch_configure_modal.png')
app3_b64 = get_b64('extracted_assets/cropped/app_content_3.png')
app4_b64 = get_b64('extracted_assets/cropped/app_content_4.png')

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OSM Enterprise Platform - Corporate Technology Brochure</title>
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
    padding: 9.5mm 12mm 8.5mm 12mm;
    page-break-after: always;
    page-break-inside: avoid;
    overflow: hidden;
    position: relative;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  /* Ambient Glow */
  .page::before {{
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 110mm;
    height: 110mm;
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

  /* Top Navigation & Brand Header */
  .header-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 2mm;
    border-bottom: 1.5px solid #e2e8f0;
  }}

  .brand-group {{
    display: flex;
    align-items: center;
    gap: 2.8mm;
  }}

  .brand-logo-icon {{
    width: 8.2mm;
    height: 8.2mm;
    background: linear-gradient(135deg, #0284c7 0%, #0b192c 100%);
    border-radius: 2mm;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 800;
    font-size: 11pt;
    letter-spacing: -0.5px;
    box-shadow: 0 3px 6px rgba(2, 132, 199, 0.28);
  }}

  .brand-title-wrap {{
    display: flex;
    flex-direction: column;
  }}

  .brand-name {{
    font-size: 13pt;
    font-weight: 800;
    letter-spacing: -0.3px;
    color: #0b192c;
    display: flex;
    align-items: center;
    gap: 2mm;
  }}

  .brand-badge {{
    font-size: 6.5pt;
    font-weight: 700;
    background: #e0f2fe;
    color: #0369a1;
    padding: 1px 6px;
    border-radius: 3px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }}

  .brand-sub {{
    font-size: 6.8pt;
    font-weight: 600;
    letter-spacing: 0.4px;
    color: #64748b;
    text-transform: uppercase;
  }}

  .header-pills {{
    display: flex;
    align-items: center;
    gap: 2mm;
  }}

  .pill {{
    font-size: 6.8pt;
    font-weight: 700;
    padding: 1.8px 7px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1.2mm;
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
    margin-top: 2.4mm;
    margin-bottom: 2.2mm;
  }}

  .hero-eyebrow {{
    display: inline-flex;
    align-items: center;
    gap: 1.5mm;
    font-size: 6.8pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #0284c7;
    margin-bottom: 1mm;
  }}

  .hero-headline {{
    font-size: 15pt;
    font-weight: 800;
    line-height: 1.16;
    letter-spacing: -0.4px;
    color: #0b192c;
  }}

  .hero-subhead {{
    font-size: 7.4pt;
    font-weight: 500;
    line-height: 1.35;
    color: #475569;
    margin-top: 1.2mm;
  }}

  /* Operational 4-Phase Value Chain */
  .process-strip {{
    background: linear-gradient(90deg, #0b192c 0%, #1e293b 100%);
    border-radius: 2mm;
    padding: 2.2mm 3.2mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2.8mm;
    box-shadow: 0 2px 5px rgba(11, 25, 44, 0.1);
  }}

  .process-step {{
    display: flex;
    align-items: center;
    gap: 1.8mm;
  }}

  .step-num {{
    width: 4.2mm;
    height: 4.2mm;
    border-radius: 50%;
    background: #0284c7;
    color: white;
    font-size: 6pt;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(2, 132, 199, 0.4);
  }}

  .step-text {{
    font-size: 6.5pt;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }}

  .process-arrow {{
    color: #38bdf8;
    font-size: 7.5pt;
    font-weight: bold;
    opacity: 0.8;
  }}

  /* Showcase Section */
  .showcase-container {{
    display: grid;
    grid-template-columns: 1.42fr 1fr;
    gap: 3mm;
    margin-bottom: 2.8mm;
  }}

  .browser-frame {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 2mm;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }}

  .browser-header {{
    background: #f1f5f9;
    padding: 1.4mm 2.8mm;
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
    border: 1px solid #cbd5e1;
    padding: 0.6px 6mm;
    border-radius: 1.2mm;
    color: #475569;
    font-weight: 500;
  }}

  .browser-tag {{
    font-size: 5.8pt;
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
    padding: 1.4mm 2.5mm;
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

  /* Strategic Objectives Card */
  .hero-side-card {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 2mm;
    padding: 2.4mm 2.8mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  }}

  .side-card-title {{
    font-size: 8pt;
    font-weight: 800;
    color: #0b192c;
    display: flex;
    align-items: center;
    gap: 1.8mm;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 1.4mm;
    margin-bottom: 1.8mm;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }}

  .feature-point {{
    display: flex;
    align-items: flex-start;
    gap: 1.8mm;
    margin-bottom: 1.6mm;
  }}

  .point-check {{
    width: 3.6mm;
    height: 3.6mm;
    background: #0284c7;
    border-radius: 50%;
    color: white;
    font-size: 5.5pt;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 0.5px;
  }}

  .point-text-title {{
    font-size: 6.8pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
  }}

  .point-text-desc {{
    font-size: 5.7pt;
    font-weight: 500;
    color: #64748b;
    line-height: 1.28;
  }}

  .mini-window {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 1.8mm;
    overflow: hidden;
    margin-top: 1mm;
  }}

  .mini-header {{
    background: #f1f5f9;
    padding: 1mm 2mm;
    font-size: 5.2pt;
    font-weight: 700;
    color: #475569;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
  }}

  /* Core Functional Modules */
  .section-heading-bar {{
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 1.6mm;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 1mm;
  }}

  .section-title {{
    font-size: 9.2pt;
    font-weight: 800;
    letter-spacing: -0.2px;
    color: #0b192c;
    text-transform: uppercase;
  }}

  .section-subtitle {{
    font-size: 6.5pt;
    font-weight: 700;
    color: #0284c7;
    letter-spacing: 0.3px;
  }}

  .modules-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2.2mm;
    margin-bottom: 2.8mm;
  }}

  .module-card {{
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 2mm;
    padding: 2.2mm 2.4mm;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    border-left: 2.8px solid #0284c7;
  }}

  .module-header {{
    display: flex;
    align-items: center;
    gap: 1.8mm;
    margin-bottom: 1mm;
  }}

  .module-icon {{
    width: 4.6mm;
    height: 4.6mm;
    background: #f0f9ff;
    color: #0284c7;
    border-radius: 1.2mm;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 6.8pt;
    font-weight: 800;
    flex-shrink: 0;
  }}

  .module-name {{
    font-size: 7.3pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
  }}

  .module-desc {{
    font-size: 5.9pt;
    font-weight: 500;
    color: #475569;
    line-height: 1.3;
  }}

  /* Differentiator Ecosystem Card */
  .diff-card {{
    background: linear-gradient(135deg, #091a2f 0%, #0f2e4d 100%);
    border-radius: 2.2mm;
    padding: 2.5mm 3.2mm;
    color: #ffffff;
    margin-bottom: 2.5mm;
    box-shadow: 0 4px 10px rgba(11, 25, 44, 0.12);
  }}

  .diff-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.6mm;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    padding-bottom: 1mm;
  }}

  .diff-title {{
    font-size: 8.2pt;
    font-weight: 800;
    letter-spacing: 0.3px;
    color: #ffffff;
    text-transform: uppercase;
  }}

  .diff-badge {{
    font-size: 6pt;
    font-weight: 700;
    background: #0284c7;
    color: #ffffff;
    padding: 1px 5px;
    border-radius: 2px;
    letter-spacing: 0.5px;
  }}

  .diff-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2.2mm;
  }}

  .diff-item {{
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1.8mm;
    padding: 1.6mm;
  }}

  .diff-item-title {{
    font-size: 6.6pt;
    font-weight: 800;
    color: #38bdf8;
    margin-bottom: 0.8mm;
    display: flex;
    align-items: center;
    gap: 1.2mm;
  }}

  .diff-item-desc {{
    font-size: 5.5pt;
    font-weight: 400;
    color: #cbd5e1;
    line-height: 1.28;
  }}

  /* Benefits Strip */
  .benefits-strip {{
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 1.8mm;
    padding: 1.8mm 3mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}

  .benefit-item {{
    display: flex;
    align-items: center;
    gap: 1.2mm;
    font-size: 6.5pt;
    font-weight: 800;
    color: #0b192c;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }}

  .benefit-item .dot-sep {{
    color: #0284c7;
    font-size: 8pt;
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

  /* ========================================= */
  /* PAGE 2 STYLING: PRODUCTION ARCHITECTURE   */
  /* ========================================= */
  .phase-card {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 2.2mm;
    padding: 2.4mm 2.8mm;
    margin-bottom: 2.4mm;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    border-top: 3px solid #0d9488;
  }}

  .phase-header {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.4mm;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 1mm;
  }}

  .phase-title-group {{
    display: flex;
    flex-direction: column;
  }}

  .phase-label {{
    font-size: 5.8pt;
    font-weight: 800;
    color: #0d9488;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }}

  .phase-main-title {{
    font-size: 8.5pt;
    font-weight: 800;
    color: #0b192c;
    letter-spacing: -0.2px;
  }}

  .phase-sub {{
    font-size: 5.8pt;
    font-weight: 500;
    color: #64748b;
  }}

  .phase-grid {{
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 2.8mm;
    align-items: center;
  }}

  .caps-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.6mm;
  }}

  .cap-box {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1.6mm;
    padding: 1.6mm;
  }}

  .cap-title {{
    font-size: 6.4pt;
    font-weight: 800;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 1.2mm;
    margin-bottom: 0.6mm;
  }}

  .cap-desc {{
    font-size: 5.5pt;
    font-weight: 500;
    color: #475569;
    line-height: 1.25;
  }}

  /* Telemetry Monitoring Section (Actual ReportsController Features) */
  .telemetry-section {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 2.2mm;
    padding: 2.4mm 2.8mm;
    margin-bottom: 2.4mm;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    border-top: 3px solid #0284c7;
  }}

  .telemetry-stats-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2mm;
    margin-bottom: 1.8mm;
  }}

  .stat-pill-box {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1.6mm;
    padding: 1.6mm;
    display: flex;
    flex-direction: column;
  }}

  .stat-pill-label {{
    font-size: 5.2pt;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }}

  .stat-pill-val {{
    font-size: 9.5pt;
    font-weight: 800;
    color: #0b192c;
    margin-top: 0.4mm;
  }}

  .stat-pill-sub {{
    font-size: 5pt;
    font-weight: 600;
    color: #0284c7;
  }}

  .telemetry-detail-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5mm;
  }}

  .audit-item {{
    display: flex;
    align-items: flex-start;
    gap: 1.4mm;
    font-size: 5.7pt;
    color: #334155;
    line-height: 1.3;
  }}

  .audit-bullet {{
    width: 2.8mm;
    height: 2.8mm;
    border-radius: 50%;
    background: #0284c7;
    color: white;
    font-size: 4.5pt;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 0.5px;
  }}

  /* Trust Banner */
  .trust-banner {{
    background: linear-gradient(90deg, #0b192c 0%, #1e293b 100%);
    border-radius: 2mm;
    padding: 2.2mm 3.5mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #ffffff;
    box-shadow: 0 2px 6px rgba(11, 25, 44, 0.1);
  }}

  .trust-item {{
    display: flex;
    align-items: center;
    gap: 1.6mm;
    font-size: 6.4pt;
    font-weight: 700;
    letter-spacing: 0.3px;
  }}

  .trust-badge-icon {{
    width: 3.8mm;
    height: 3.8mm;
    background: #0284c7;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 5.5pt;
  }}
</style>
</head>
<body>

<!-- ======================================================= -->
<!-- PAGE 1: LIVE EVALUATION & OPERATIONAL HUB              -->
<!-- ======================================================= -->
<div class="page">
  <div class="content-layer">
    
    <!-- Top Brand & Executive Header -->
    <div>
      <div class="header-bar">
        <div class="brand-group">
          <div class="brand-logo-icon">OSM</div>
          <div class="brand-title-wrap">
            <div class="brand-name">
              OSM PORTAL
              <span class="brand-badge">Enterprise Edition</span>
            </div>
            <div class="brand-sub">Enterprise On-Screen Marking &amp; Assessment Platform</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Technology Summit Showcase
          </div>
          <div class="pill pill-navy">Executive Brief 2026</div>
        </div>
      </div>

      <!-- Main Headline Block -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          Transforming Examination Evaluation Through Intelligent Digital Technology
        </div>
        <h1 class="hero-headline">THE NEXT GENERATION OF INTELLIGENT ON-SCREEN MARKING</h1>
        <p class="hero-subhead">
          An integrated digital assessment ecosystem designed to streamline examination management, enforce blind evaluation impartiality, eradicate arithmetic calculation errors, and provide real-time operational control across universities and examination boards.
        </p>
      </div>

      <!-- Horizontal 4-Phase Operational Workflow -->
      <div class="process-strip">
        <div class="process-step">
          <div class="step-num">1</div>
          <div class="step-text">Setup &amp; Governance</div>
        </div>
        <div class="process-arrow">&#10148;</div>
        <div class="process-step">
          <div class="step-num">2</div>
          <div class="step-text">Academic Blueprinting</div>
        </div>
        <div class="process-arrow">&#10148;</div>
        <div class="process-step">
          <div class="step-num">3</div>
          <div class="step-text">Operations &amp; Registry</div>
        </div>
        <div class="process-arrow">&#10148;</div>
        <div class="process-step">
          <div class="step-num">4</div>
          <div class="step-text">Live Blind Evaluation</div>
        </div>
      </div>

      <!-- Hero Visual Showcase: Actual Live Evaluator Workspace -->
      <div class="showcase-container">
        <!-- Main Browser Window with Live Marking Workspace -->
        <div class="browser-frame">
          <div class="browser-header">
            <div class="browser-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <div class="browser-url">https://osm.portal.edu/evaluate/script/view</div>
            <div class="browser-tag">Flagship Evaluator Workspace</div>
          </div>
          <img src="{app4_b64}" class="browser-img" alt="OSM Marking Workspace">
          <div class="caption-strip">
            <span><strong>ACTUAL APPLICATION SCREENSHOT:</strong> Evaluator Workspace &amp; On-Screen Script Marking</span>
            <span class="highlight">100% Blind Barcode Mask &bull; Section Rubrics &bull; AI Proctoring Active</span>
          </div>
        </div>

        <!-- Accompanying Operational Capabilities -->
        <div class="hero-side-card">
          <div>
            <div class="side-card-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Live Evaluation Safeguards
            </div>
            
            <div class="feature-point">
              <div class="point-check">&#10003;</div>
              <div>
                <div class="point-text-title">100% Blind Anonymity</div>
                <div class="point-text-desc">Automated masking of student names, roll numbers, and barcodes guarantees complete examiner impartiality.</div>
              </div>
            </div>

            <div class="feature-point">
              <div class="point-check">&#10003;</div>
              <div>
                <div class="point-text-title">0% Tally Calculation Errors</div>
                <div class="point-text-desc">Dynamic automated mathematical summation aggregates section and booklet marks in real-time with zero manual arithmetic.</div>
              </div>
            </div>

            <div class="feature-point">
              <div class="point-check">&#10003;</div>
              <div>
                <div class="point-text-title">Rich Annotation Toolbar</div>
                <div class="point-text-desc">Green Ticks, Red Crosses, Text Remarks, Fractional Points, and Blank Page stamps permanently recorded into script audit history.</div>
              </div>
            </div>

            <div class="feature-point">
              <div class="point-check">&#10003;</div>
              <div>
                <div class="point-text-title">AI &amp; Live Proctoring Guard</div>
                <div class="point-text-desc">Continuous webcam face landmark verification, browser tab-focus monitoring, and session timeouts ensure high integrity.</div>
              </div>
            </div>
          </div>

          <!-- Secondary Micro-Preview: Papers Hub -->
          <div class="mini-window">
            <div class="mini-header">
              <span>OPERATIONS &amp; REGISTRY HUB</span>
              <span style="color: #0284c7;">Papers Management Dashboard</span>
            </div>
            <img src="{app3_b64}" style="width: 100%; height: 23mm; object-fit: cover;" alt="Papers Management">
          </div>
        </div>
      </div>

      <!-- Core Functional Modules (Grounded in Real Codebase) -->
      <div>
        <div class="section-heading-bar">
          <div class="section-title">Core Production Modules</div>
          <div class="section-subtitle">Implemented &amp; Validated System Capabilities</div>
        </div>

        <div class="modules-grid">
          <!-- 1. Examination Papers Hub -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">01</div>
              <div class="module-name">Papers &amp; Catch Registry</div>
            </div>
            <div class="module-desc">Centralized paper tracking, official Catch Numbers, course mappings, question master PDFs, and real-time telemetry status pills.</div>
          </div>

          <!-- 2. Answer Script Allocation -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">02</div>
              <div class="module-name">Script Allocation Engine</div>
            </div>
            <div class="module-desc">Partition exam scripts equally across certified evaluators (Equal Distribution) or enforce strict daily quota limits with auto-reallocation.</div>
          </div>

          <!-- 3. On-Screen Evaluation -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">03</div>
              <div class="module-name">On-Screen Marking Suite</div>
            </div>
            <div class="module-desc">Full zoom/pan canvas, question-wise navigation palette, interactive rubric popups, zero unmarked pages rule, and auto-save every 30s.</div>
          </div>

          <!-- 4. Examiner Pacing & Controls -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">04</div>
              <div class="module-name">Speed Pacing &amp; Anti-Rush</div>
            </div>
            <div class="module-desc">Enforces mandatory evaluation time-per-copy thresholds (e.g. 15 mins/copy) and session idle timeouts to prevent rushed grading.</div>
          </div>

          <!-- 5. Rubrics & Question Blueprints -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">05</div>
              <div class="module-name">Batch Rubric Blueprints</div>
            </div>
            <div class="module-desc">Multi-tier question schemas (MCQ, Short, Essay), individual mark weightings, optional choice rules (Best 5 of 8), and templates.</div>
          </div>

          <!-- 6. Governance & Compliance -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">06</div>
              <div class="module-name">Enterprise Security &amp; 2FA</div>
            </div>
            <div class="module-desc">Two-factor authentication (2FA), role-based access permissions (RBAC), and persistent audit trails capturing every mark modification.</div>
          </div>
        </div>
      </div>

      <!-- Differentiators Banner -->
      <div class="diff-card">
        <div class="diff-header">
          <div class="diff-title">MORE THAN DIGITAL EVALUATION. A COMPLETE ASSESSMENT ECOSYSTEM.</div>
          <div class="diff-badge">Production Architecture</div>
        </div>
        <div class="diff-grid">
          <div class="diff-item">
            <div class="diff-item-title">&#9670; Mathematical Integrity</div>
            <div class="diff-item-desc">Zero manual tallying. Section and booklet marks auto-compile with real-time rubric constraint validation.</div>
          </div>
          <div class="diff-item">
            <div class="diff-item-title">&#9670; Anti-Rush Pacing</div>
            <div class="diff-item-desc">Mandates thorough script review time before marks submission is unlocked, guaranteeing evaluation quality.</div>
          </div>
          <div class="diff-item">
            <div class="diff-item-title">&#9670; Continuous Face ID</div>
            <div class="diff-item-desc">Integrated AI biometric proctoring verifies examiner identity and detects window tab-blurring during marking.</div>
          </div>
          <div class="diff-item">
            <div class="diff-item-title">&#9670; Equal Distribution</div>
            <div class="diff-item-desc">Automated algorithms balance script workloads equally across certified faculty based on subject expertise.</div>
          </div>
        </div>
      </div>

    </div>

    <!-- Bottom Benefits Strip & Page 1 Footer -->
    <div>
      <div class="benefits-strip">
        <div class="benefit-item"><span>&#9679;</span> 100% BLIND EVALUATION</div>
        <div class="benefit-item"><span class="dot-sep">&bull;</span> 0% TALLY ERRORS</div>
        <div class="benefit-item"><span class="dot-sep">&bull;</span> SPEED PACING</div>
        <div class="benefit-item"><span class="dot-sep">&bull;</span> AI PROCTORING</div>
        <div class="benefit-item"><span class="dot-sep">&bull;</span> EQUAL ALLOCATION</div>
        <div class="benefit-item"><span class="dot-sep">&bull;</span> AUDIT SECURITY</div>
      </div>

      <div class="footer-bar">
        <span>OSM Enterprise Platform &bull; Corporate Product Brochure</span>
        <span>Technology Summit Edition &bull; Production Architecture</span>
        <span>Page 1 of 2</span>
      </div>
    </div>

  </div>
</div>


<!-- ======================================================= -->
<!-- PAGE 2: GOVERNANCE, BLUEPRINTS & EVALUATION TELEMETRY   -->
<!-- ======================================================= -->
<div class="page">
  <div class="content-layer">

    <!-- Top Brand Bar -->
    <div>
      <div class="header-bar">
        <div class="brand-group">
          <div class="brand-logo-icon">OSM</div>
          <div class="brand-title-wrap">
            <div class="brand-name">
              OSM PORTAL
              <span class="brand-badge">Governance &amp; Blueprints</span>
            </div>
            <div class="brand-sub">Institutional Policies, Academic Rubrics &amp; Evaluation Monitoring</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">Production Capabilities</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Page 2 Main Headline -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Institutional Control, Academic Blueprinting &amp; Monitoring
        </div>
        <h1 class="hero-headline">INSTITUTIONAL GOVERNANCE, PRECISION RUBRICS &amp; TELEMETRY</h1>
        <p class="hero-subhead">
          Configure transparent script allocation models, enforce anti-rush speed pacing, construct multi-tier question schemas with automated attempt rules, and track evaluation velocity through live administrative dashboards.
        </p>
      </div>

      <!-- Section 1: Institutional Governance & Policies (Actual Settings Screenshot) -->
      <div class="phase-card">
        <div class="phase-header">
          <div class="phase-title-group">
            <div class="phase-label">PHASE 1 / 4: SETUP &amp; GOVERNANCE</div>
            <div class="phase-main-title">Institutional Governance &amp; Evaluation Policies</div>
            <div class="phase-sub">Establishing script assignment algorithms, examiner pacing controls, and enterprise security.</div>
          </div>
          <div class="pill pill-teal" style="font-size: 5.5pt;">Portal Settings &amp; Preferences</div>
        </div>

        <div class="phase-grid">
          <!-- Actual Screenshot of Settings -->
          <div class="browser-frame">
            <div class="browser-header" style="padding: 1mm 2.2mm;">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">https://osm.portal.edu/settings/preferences</div>
              <div class="browser-tag" style="color: #0d9488;">Portal Preferences</div>
            </div>
            <img src="{app1_b64}" class="browser-img" style="height: 30mm; object-fit: cover;" alt="Portal Settings &amp; Preferences">
            <div class="caption-strip" style="padding: 0.8mm 1.8mm; font-size: 5.4pt;">
              <span><strong>SETTINGS:</strong> Script Assignment Models, Speed Pacing, Session Timeouts &amp; 2FA</span>
              <span class="highlight">Actual Screen</span>
            </div>
          </div>

          <!-- 4 Configurable Capabilities from Settings.jsx -->
          <div class="caps-grid">
            <div class="cap-box">
              <div class="cap-title">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                Equal Script Distribution
              </div>
              <div class="cap-desc">Partition exam scripts equally across certified evaluators based on subject expertise and target completion dates.</div>
            </div>

            <div class="cap-box">
              <div class="cap-title">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Speed Pacing Profiles
              </div>
              <div class="cap-desc">Enforce mandatory evaluation duration per booklet (e.g. 15 min/copy) and session idle timeouts to prevent rushed grading.</div>
            </div>

            <div class="cap-box">
              <div class="cap-title">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                2FA &amp; Security Controls
              </div>
              <div class="cap-desc">Enforce two-factor authentication, role-based permissions (RBAC), and immutable audit logs capturing every action.</div>
            </div>

            <div class="cap-box">
              <div class="cap-title">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                Automated Alerts Hub
              </div>
              <div class="cap-desc">Instant system notifications when new script batches are allotted, deadlines approach, and daily summary digests.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Academic Blueprinting & Question Rubrics (Actual Clean Modal Screenshot) -->
      <div class="phase-card">
        <div class="phase-header">
          <div class="phase-title-group">
            <div class="phase-label">PHASE 2 / 4: ACADEMIC BLUEPRINTING</div>
            <div class="phase-main-title">Section Batch Blueprints &amp; Question Rubrics</div>
            <div class="phase-sub">Constructing multi-tier question schemas, MCQ/descriptive rubrics, optional attempt limits, and mark validations.</div>
          </div>
          <div class="pill pill-teal" style="font-size: 5.5pt;">Section &amp; Rubric Manager</div>
        </div>

        <div class="phase-grid">
          <!-- Actual Screenshot of Clean Batch Configure Modal -->
          <div class="browser-frame" style="background: #f8fafc;">
            <div class="browser-header" style="padding: 1mm 2.2mm;">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">https://osm.portal.edu/sections/batch-configure</div>
              <div class="browser-tag" style="color: #0d9488;">Batch Configure Modal</div>
            </div>
            <div style="padding: 1.5mm; display: flex; align-items: center; justify-content: center; background: #f1f5f9;">
              <img src="{modal2_b64}" style="width: 95%; max-height: 29mm; object-fit: contain; border-radius: 1.5mm; box-shadow: 0 2px 6px rgba(0,0,0,0.1); display: block;" alt="Configure Batch Sections">
            </div>
            <div class="caption-strip" style="padding: 0.8mm 1.8mm; font-size: 5.4pt;">
              <span><strong>BLUEPRINT:</strong> Section A (MCQ / Descriptive), Question Weighting, Optional Groups</span>
              <span class="highlight">Actual Screen</span>
            </div>
          </div>

          <!-- 4 Blueprint Capabilities from SectionConfig.jsx -->
          <div class="caps-grid">
            <div class="cap-box">
              <div class="cap-title">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                Granular Question Schemas
              </div>
              <div class="cap-desc">Define question types (MCQ, Short Answer, Long Essay), start/end ranges, individual marks, and optional grouping codes.</div>
            </div>

            <div class="cap-box">
              <div class="cap-title">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Attempt Limit &amp; Optional Control
              </div>
              <div class="cap-desc">Enforce rules like "Attempt Any 5 of 8 Questions" — the system automatically flags excess attempts and honors best marks.</div>
            </div>

            <div class="cap-box">
              <div class="cap-title">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Real-Time Mark Validation
              </div>
              <div class="cap-desc">Integrated validation prevents setup errors by ensuring section question marks perfectly match overall paper maximum marks.</div>
            </div>

            <div class="cap-box">
              <div class="cap-title">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                Reusable Master Templates
              </div>
              <div class="cap-desc">Save configured section batches as institutional templates, reusable across subjects, departments, and semesters.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 3: Evaluation Telemetry & Performance Monitoring (Actual Reports Features) -->
      <div class="telemetry-section">
        <div class="phase-header" style="margin-bottom: 1.2mm;">
          <div class="phase-title-group">
            <div class="phase-label" style="color: #0284c7;">OPERATIONS TELEMETRY &amp; MONITORING</div>
            <div class="phase-main-title">Evaluation Velocity, Examiner Auditing &amp; Real-Time Reports</div>
            <div class="phase-sub">Centralized evaluation telemetry implemented via ReportsController and operational dashboards.</div>
          </div>
          <div class="pill pill-navy" style="font-size: 5.5pt;">Real-Time Dashboard API</div>
        </div>

        <!-- 4 Real Metrics from ReportsController.cs -->
        <div class="telemetry-stats-grid">
          <div class="stat-pill-box">
            <span class="stat-pill-label">Total Scripts Ingested</span>
            <span class="stat-pill-val">Central Vault</span>
            <span class="stat-pill-sub">Encrypted &amp; Indexed</span>
          </div>
          <div class="stat-pill-box">
            <span class="stat-pill-label">Completion Velocity</span>
            <span class="stat-pill-val">Live Tracking</span>
            <span class="stat-pill-sub">Evaluated vs Pending</span>
          </div>
          <div class="stat-pill-box">
            <span class="stat-pill-label">Examiner Performance</span>
            <span class="stat-pill-val">Pacing Audited</span>
            <span class="stat-pill-sub">Avg Time / Script Logged</span>
          </div>
          <div class="stat-pill-box">
            <span class="stat-pill-label">Department Breakdown</span>
            <span class="stat-pill-val">Subject-Wise</span>
            <span class="stat-pill-sub">Real-Time Progress %</span>
          </div>
        </div>

        <div class="telemetry-detail-grid">
          <div class="audit-item">
            <div class="audit-bullet">&#10003;</div>
            <div>
              <strong>Live Completion Velocity Dashboards:</strong> Coordinators monitor script throughput, completed vs. in-progress marking status, and pending backlog across subjects in real time.
            </div>
          </div>

          <div class="audit-item">
            <div class="audit-bullet">&#10003;</div>
            <div>
              <strong>Examiner Performance &amp; Pacing Audits:</strong> Tracks total scripts evaluated per examiner, individual average minutes per script, and compliance with institutional pacing thresholds.
            </div>
          </div>

          <div class="audit-item">
            <div class="audit-bullet">&#10003;</div>
            <div>
              <strong>Subject &amp; Department-Wise Telemetry:</strong> Real-time progress tracking across academic faculties, comparing allocation fulfillment and marking completion schedules.
            </div>
          </div>

          <div class="audit-item">
            <div class="audit-bullet">&#10003;</div>
            <div>
              <strong>Persistent Compliance Audit Trail:</strong> Immutable transaction logging capturing every mark entry, question-level update, re-allocation event, and evaluator session history.
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Bottom Institutional Trust Banner & Page 2 Footer -->
    <div>
      <div class="trust-banner">
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>Enterprise Grade Architecture</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>100% Blind Evaluation</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>Zero-Trust Immutable Audit Trail</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>AI Biometric Proctoring</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>Examination Standards Compliant</span>
        </div>
      </div>

      <div class="footer-bar">
        <span>Request an Executive Demonstration: contact@osm.portal.edu &bull; Integrated Assessment Platform</span>
        <span>Corporate Technology Summit Edition &bull; All Rights Reserved</span>
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

print('Updated real brochure HTML written successfully!')
