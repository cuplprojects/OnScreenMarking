import os
import base64
import subprocess

def get_b64(path):
    with open(path, 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')

# Using app_content images for clean single browser header!
app1_b64 = get_b64('extracted_assets/cropped/app_content_1.png')
app2_b64 = get_b64('extracted_assets/cropped/app_content_2.png')
app3_b64 = get_b64('extracted_assets/cropped/app_content_3.png')
app4_b64 = get_b64('extracted_assets/cropped/app_content_4.png')

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OSM Enterprise Platform - Executive Corporate Brochure</title>
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
    padding: 10mm 12mm 9mm 12mm;
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
    width: 100mm;
    height: 100mm;
    background: radial-gradient(circle at top right, rgba(2, 132, 199, 0.07), transparent 70%);
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
    padding-bottom: 2.2mm;
    border-bottom: 1.5px solid #e2e8f0;
  }}

  .brand-group {{
    display: flex;
    align-items: center;
    gap: 2.8mm;
  }}

  .brand-logo-icon {{
    width: 8mm;
    height: 8mm;
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
    margin-top: 2.8mm;
    margin-bottom: 2.6mm;
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
    margin-bottom: 1.2mm;
  }}

  .hero-headline {{
    font-size: 15.5pt;
    font-weight: 800;
    line-height: 1.16;
    letter-spacing: -0.4px;
    color: #0b192c;
  }}

  .hero-subhead {{
    font-size: 7.6pt;
    font-weight: 500;
    line-height: 1.38;
    color: #475569;
    margin-top: 1.4mm;
  }}

  /* Horizontal Value Chain Process Infographic */
  .process-strip {{
    background: linear-gradient(90deg, #0b192c 0%, #1e293b 100%);
    border-radius: 2mm;
    padding: 2.2mm 3.2mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 3mm;
    box-shadow: 0 2px 5px rgba(11, 25, 44, 0.1);
  }}

  .process-step {{
    display: flex;
    align-items: center;
    gap: 1.6mm;
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
    font-size: 6.6pt;
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
    grid-template-columns: 1.45fr 1fr;
    gap: 3mm;
    margin-bottom: 3.2mm;
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
    font-size: 6.2pt;
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
    padding: 2.5mm 2.8mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  }}

  .side-card-title {{
    font-size: 8.2pt;
    font-weight: 800;
    color: #0b192c;
    display: flex;
    align-items: center;
    gap: 1.8mm;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 1.5mm;
    margin-bottom: 2mm;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }}

  .feature-point {{
    display: flex;
    align-items: flex-start;
    gap: 1.8mm;
    margin-bottom: 1.8mm;
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
    font-size: 5.8pt;
    font-weight: 500;
    color: #64748b;
    line-height: 1.3;
  }}

  /* Papers Registry Mini Window */
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
    margin-bottom: 1.8mm;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 1mm;
  }}

  .section-title {{
    font-size: 9.5pt;
    font-weight: 800;
    letter-spacing: -0.2px;
    color: #0b192c;
    text-transform: uppercase;
  }}

  .section-subtitle {{
    font-size: 6.6pt;
    font-weight: 700;
    color: #0284c7;
    letter-spacing: 0.3px;
  }}

  .modules-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2.4mm;
    margin-bottom: 3mm;
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
    font-size: 7.4pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
  }}

  .module-desc {{
    font-size: 6pt;
    font-weight: 500;
    color: #475569;
    line-height: 1.32;
  }}

  /* Differentiator Ecosystem Card */
  .diff-card {{
    background: linear-gradient(135deg, #091a2f 0%, #0f2e4d 100%);
    border-radius: 2.2mm;
    padding: 2.8mm 3.2mm;
    color: #ffffff;
    margin-bottom: 2.8mm;
    box-shadow: 0 4px 10px rgba(11, 25, 44, 0.12);
  }}

  .diff-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.8mm;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    padding-bottom: 1.2mm;
  }}

  .diff-title {{
    font-size: 8.5pt;
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
    gap: 2.4mm;
  }}

  .diff-item {{
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1.8mm;
    padding: 1.8mm;
  }}

  .diff-item-title {{
    font-size: 6.8pt;
    font-weight: 800;
    color: #38bdf8;
    margin-bottom: 0.8mm;
    display: flex;
    align-items: center;
    gap: 1.2mm;
  }}

  .diff-item-desc {{
    font-size: 5.6pt;
    font-weight: 400;
    color: #cbd5e1;
    line-height: 1.3;
  }}

  /* Benefits Strip */
  .benefits-strip {{
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 1.8mm;
    padding: 2mm 3mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}

  .benefit-item {{
    display: flex;
    align-items: center;
    gap: 1.2mm;
    font-size: 6.6pt;
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
  /* PAGE 2 STYLING: ANALYTICS & CONFIGURABILITY */
  /* ========================================= */
  .page2-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3mm;
    margin-bottom: 2.8mm;
  }}

  .analytics-card {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 2.2mm;
    padding: 2.8mm 3mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    border-top: 3px solid #0284c7;
  }}

  .card-top {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.4mm;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 1.2mm;
  }}

  .card-title-group {{
    display: flex;
    flex-direction: column;
  }}

  .card-main-title {{
    font-size: 8.2pt;
    font-weight: 800;
    color: #0b192c;
    text-transform: uppercase;
    letter-spacing: 0.1px;
  }}

  .card-sub-title {{
    font-size: 5.8pt;
    font-weight: 600;
    color: #0284c7;
  }}

  .card-badge {{
    font-size: 5.6pt;
    font-weight: 700;
    background: #f0f9ff;
    color: #0369a1;
    border: 0.8px solid #bae6fd;
    padding: 1px 4px;
    border-radius: 2px;
  }}

  .chart-box {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1.8mm;
    padding: 1.8mm;
    margin: 1.5mm 0;
  }}

  .bullets-list {{
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1.2mm;
  }}

  .bullet-item {{
    display: flex;
    align-items: flex-start;
    gap: 1.4mm;
    font-size: 5.8pt;
    line-height: 1.32;
    color: #334155;
  }}

  .bullet-marker {{
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

  .disclaimer-box {{
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-left: 3px solid #f59e0b;
    border-radius: 1.5mm;
    padding: 1.5mm 2mm;
    margin-top: 1.8mm;
    display: flex;
    align-items: flex-start;
    gap: 1.8mm;
  }}

  .disclaimer-icon {{
    color: #d97706;
    font-size: 7.5pt;
    font-weight: bold;
    flex-shrink: 0;
    margin-top: 0.5px;
  }}

  .disclaimer-text {{
    font-size: 5.4pt;
    font-weight: 600;
    color: #92400e;
    line-height: 1.3;
  }}

  /* Full Width Configurability Section */
  .config-section {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 2.2mm;
    padding: 2.8mm 3mm;
    margin-bottom: 2.8mm;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    border-top: 3px solid #0d9488;
  }}

  .config-grid {{
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 3mm;
    align-items: center;
  }}

  .config-features-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.8mm;
  }}

  .config-feature-box {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1.8mm;
    padding: 1.8mm;
  }}

  .config-feature-title {{
    font-size: 6.4pt;
    font-weight: 800;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 1.2mm;
    margin-bottom: 0.6mm;
  }}

  .config-feature-desc {{
    font-size: 5.5pt;
    font-weight: 500;
    color: #475569;
    line-height: 1.25;
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
<!-- PAGE 1: INTRODUCING THE OSM PLATFORM                   -->
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
          An integrated digital assessment and evaluation ecosystem designed to simplify examination management, eliminate tally errors, protect student anonymity through dynamic barcode masking, and transform raw marking records into actionable institutional intelligence.
        </p>
      </div>

      <!-- Horizontal Value-Chain Process Infographic -->
      <div class="process-strip">
        <div class="process-step">
          <div class="step-num">1</div>
          <div class="step-text">Exam Setup &amp; Catch Mapping</div>
        </div>
        <div class="process-arrow">&#10148;</div>
        <div class="process-step">
          <div class="step-num">2</div>
          <div class="step-text">Blind Script Ingestion</div>
        </div>
        <div class="process-arrow">&#10148;</div>
        <div class="process-step">
          <div class="step-num">3</div>
          <div class="step-text">Digital On-Screen Marking</div>
        </div>
        <div class="process-arrow">&#10148;</div>
        <div class="process-step">
          <div class="step-num">4</div>
          <div class="step-text">Moderation &amp; Quality Control</div>
        </div>
        <div class="process-arrow">&#10148;</div>
        <div class="process-step">
          <div class="step-num">5</div>
          <div class="step-text">Result Analytics &amp; Insights</div>
        </div>
      </div>

      <!-- Hero Visual Showcase: Actual Application Screenshot -->
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
          <!-- Single clean browser mockup embedding the high-res app content -->
          <img src="{app4_b64}" class="browser-img" alt="OSM Marking Workspace">
          <div class="caption-strip">
            <span><strong>AUTHENTIC SYSTEM SCREENSHOT:</strong> Live Candidate Script Evaluation</span>
            <span class="highlight">100% Blind Barcode Masking &bull; Sub-Question Rubrics &bull; Active AI Proctoring</span>
          </div>
        </div>

        <!-- Accompanying Operational Hub Card -->
        <div class="hero-side-card">
          <div>
            <div class="side-card-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Strategic Evaluation Objectives
            </div>
            
            <div class="feature-point">
              <div class="point-check">&#10003;</div>
              <div>
                <div class="point-text-title">100% Blind Anonymity</div>
                <div class="point-text-desc">Automated masking of student names, roll numbers, and barcodes guarantees zero evaluator bias.</div>
              </div>
            </div>

            <div class="feature-point">
              <div class="point-check">&#10003;</div>
              <div>
                <div class="point-text-title">Zero Tally &amp; Calculation Errors</div>
                <div class="point-text-desc">Dynamic automated mathematical aggregation calculates section and booklet scores with zero manual arithmetic.</div>
              </div>
            </div>

            <div class="feature-point">
              <div class="point-check">&#10003;</div>
              <div>
                <div class="point-text-title">Pacing &amp; Anti-Rush Profiles</div>
                <div class="point-text-desc">Enforces mandatory minimum minutes per booklet (e.g. 15 min/copy) to prevent hurried evaluations.</div>
              </div>
            </div>

            <div class="feature-point">
              <div class="point-check">&#10003;</div>
              <div>
                <div class="point-text-title">Active AI Proctoring Guard</div>
                <div class="point-text-desc">Continuous face verification, tab-focus tracking, and idle timeouts ensure high-stakes integrity.</div>
              </div>
            </div>
          </div>

          <!-- Secondary Micro-Preview: Papers Hub -->
          <div class="mini-window">
            <div class="mini-header">
              <span>OPERATIONS &amp; REGISTRY HUB</span>
              <span style="color: #0284c7;">Papers Management Dashboard</span>
            </div>
            <img src="{app3_b64}" style="width: 100%; height: 23mm; object-fit: cover; display: block;" alt="Papers Management">
          </div>
        </div>
      </div>

      <!-- Core Functional Modules (6 Enterprise Modules) -->
      <div>
        <div class="section-heading-bar">
          <div class="section-title">Core Functional Architecture</div>
          <div class="section-subtitle">Substantiated &amp; Production-Ready Capabilities</div>
        </div>

        <div class="modules-grid">
          <!-- 1. Examination Management -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">01</div>
              <div class="module-name">Examination Management</div>
            </div>
            <div class="module-desc">Centralized paper registry, official Catch Number tracking, subject master mapping, and question paper PDF repository.</div>
          </div>

          <!-- 2. Answer Script Management -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">02</div>
              <div class="module-name">Answer Script Management</div>
            </div>
            <div class="module-desc">Bulk booklet ingestion, automated barcode anonymization, multi-tier indexing, and encrypted cloud storage vault.</div>
          </div>

          <!-- 3. On-Screen Evaluation -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">03</div>
              <div class="module-name">Digital Evaluation Suite</div>
            </div>
            <div class="module-desc">Full zoom/pan canvas, precision annotation stamps (ticks, crosses, remarks), question rubrics, and dynamic marks tally.</div>
          </div>

          <!-- 4. Examiner Allocation & Pacing -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">04</div>
              <div class="module-name">Examiner Pacing Engine</div>
            </div>
            <div class="module-desc">Equal distribution allocation algorithms, daily quota locks, minimum time-per-copy speed profiles, and active proctoring.</div>
          </div>

          <!-- 5. Rubrics & Answer Key Management -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">05</div>
              <div class="module-name">Section Batch Rubrics</div>
            </div>
            <div class="module-desc">Configurable multi-tier sections (MCQ, Short, Essay), mandatory vs optional choice caps, and mark weighting schemas.</div>
          </div>

          <!-- 6. Audit & Governance Control -->
          <div class="module-card">
            <div class="module-header">
              <div class="module-icon">06</div>
              <div class="module-name">Audit &amp; Governance Hub</div>
            </div>
            <div class="module-desc">Immutable transaction logging, two-factor authentication (2FA), role-based permissions, and complete moderation workflows.</div>
          </div>
        </div>
      </div>

      <!-- Differentiators Banner -->
      <div class="diff-card">
        <div class="diff-header">
          <div class="diff-title">MORE THAN DIGITAL EVALUATION. A COMPLETE ASSESSMENT INTELLIGENCE ECOSYSTEM.</div>
          <div class="diff-badge">Key Differentiators</div>
        </div>
        <div class="diff-grid">
          <div class="diff-item">
            <div class="diff-item-title">&#9670; Mathematical Integrity</div>
            <div class="diff-item-desc">Eliminates recalculations, unmarked questions, and unauthorized mark modifications automatically.</div>
          </div>
          <div class="diff-item">
            <div class="diff-item-title">&#9670; Speed-Pacing Safeguard</div>
            <div class="diff-item-desc">Prevents rush-marking by mandating thorough script reading time before mark submission is unlocked.</div>
          </div>
          <div class="diff-item">
            <div class="diff-item-title">&#9670; AI Proctoring &amp; Face ID</div>
            <div class="diff-item-desc">Verifies examiner biometric identity throughout evaluation sessions to prevent unauthorized grading.</div>
          </div>
          <div class="diff-item">
            <div class="diff-item-title">&#9670; Actionable Analytics</div>
            <div class="diff-item-desc">Transforms static marks into deep score distributions, item discrimination, and anomaly detection.</div>
          </div>
        </div>
      </div>

    </div>

    <!-- Bottom Benefits Strip & Page 1 Footer -->
    <div>
      <div class="benefits-strip">
        <div class="benefit-item"><span>&#9679;</span> ACCURACY</div>
        <div class="benefit-item"><span class="dot-sep">&bull;</span> EFFICIENCY</div>
        <div class="benefit-item"><span class="dot-sep">&bull;</span> TRANSPARENCY</div>
        <div class="benefit-item"><span class="dot-sep">&bull;</span> INTELLIGENCE</div>
        <div class="benefit-item"><span class="dot-sep">&bull;</span> CONFIGURABILITY</div>
        <div class="benefit-item"><span class="dot-sep">&bull;</span> SCALABILITY</div>
      </div>

      <div class="footer-bar">
        <span>OSM Enterprise Platform &bull; Corporate Product Brochure</span>
        <span>Technology Summit Edition &bull; Confidential &amp; Proprietary</span>
        <span>Page 1 of 2</span>
      </div>
    </div>

  </div>
</div>


<!-- ======================================================= -->
<!-- PAGE 2: INTELLIGENCE, ANALYTICS AND CONFIGURABILITY    -->
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
              <span class="brand-badge">Intelligence &amp; Governance</span>
            </div>
            <div class="brand-sub">Assessment Intelligence, Advanced Analytics &amp; Architecture</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">Actionable Examination Analytics</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Page 2 Main Headline -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          From Answer Scripts to Assessment Intelligence
        </div>
        <h1 class="hero-headline">TURNING EXAMINATION DATA INTO INTELLIGENT DECISIONS</h1>
        <p class="hero-subhead">
          Advanced graphical insights, evaluation velocity tracking, candidate score distributions, and statistical anomaly indicators provide examination controllers and academic leaders with unmatched oversight, transparency, and operational rigor.
        </p>
      </div>

      <!-- 2x2 Core Intelligence Grid -->
      <div class="page2-grid">

        <!-- Section A: Answer Key Accuracy & Item Analysis -->
        <div class="analytics-card">
          <div>
            <div class="card-top">
              <div class="card-title-group">
                <div class="card-main-title">Answer Key Accuracy &amp; Item Analytics</div>
                <div class="card-sub-title">Visual Intelligence for Answer-Key Accuracy and Evaluation Quality</div>
              </div>
              <div class="card-badge">Item Difficulty</div>
            </div>

            <!-- Vector Graphic: Question Correctness & Difficulty Matrix -->
            <div class="chart-box">
              <svg viewBox="0 0 340 98" style="width: 100%; height: auto; display: block;">
                <!-- Axis lines -->
                <line x1="30" y1="78" x2="330" y2="78" stroke="#cbd5e1" stroke-width="1"/>
                <line x1="30" y1="20" x2="30" y2="78" stroke="#cbd5e1" stroke-width="1"/>
                <text x="25" y="23" font-size="7" fill="#64748b" text-anchor="end">100%</text>
                <text x="25" y="50" font-size="7" fill="#64748b" text-anchor="end">50%</text>
                <text x="25" y="78" font-size="7" fill="#64748b" text-anchor="end">0%</text>

                <!-- Gridlines -->
                <line x1="30" y1="48" x2="330" y2="48" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="2,2"/>
                <line x1="30" y1="20" x2="330" y2="20" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="2,2"/>

                <!-- Alert badge placed at top-left/center away from labels -->
                <rect x="35" y="3" width="135" height="13" rx="2.5" fill="#fef2f2" stroke="#fecaca"/>
                <circle cx="43" cy="9.5" r="2.2" fill="#ef4444"/>
                <text x="50" y="12" font-size="6" fill="#991b1b" font-weight="700">*Q3 Flagged: Key Ambiguity Alert</text>

                <!-- Bars (Q1 to Q8) -->
                <!-- Q1 -->
                <rect x="42" y="28" width="18" height="50" rx="2" fill="#0284c7"/>
                <text x="51" y="88" font-size="7" fill="#475569" font-weight="600" text-anchor="middle">Q1</text>
                <text x="51" y="25" font-size="6.5" fill="#0284c7" font-weight="700" text-anchor="middle">88%</text>

                <!-- Q2 -->
                <rect x="76" y="32" width="18" height="46" rx="2" fill="#0284c7"/>
                <text x="85" y="88" font-size="7" fill="#475569" font-weight="600" text-anchor="middle">Q2</text>
                <text x="85" y="29" font-size="6.5" fill="#0284c7" font-weight="700" text-anchor="middle">82%</text>

                <!-- Q3: Anomaly / Discrepancy Flagged -->
                <rect x="110" y="66" width="18" height="12" rx="2" fill="#ef4444"/>
                <text x="119" y="88" font-size="7" fill="#ef4444" font-weight="800" text-anchor="middle">Q3*</text>
                <text x="119" y="62" font-size="6.5" fill="#ef4444" font-weight="800" text-anchor="middle">18%</text>

                <!-- Q4 -->
                <rect x="144" y="36" width="18" height="42" rx="2" fill="#0284c7"/>
                <text x="153" y="88" font-size="7" fill="#475569" font-weight="600" text-anchor="middle">Q4</text>
                <text x="153" y="33" font-size="6.5" fill="#0284c7" font-weight="700" text-anchor="middle">75%</text>

                <!-- Q5 -->
                <rect x="178" y="30" width="18" height="48" rx="2" fill="#0284c7"/>
                <text x="187" y="88" font-size="7" fill="#475569" font-weight="600" text-anchor="middle">Q5</text>
                <text x="187" y="27" font-size="6.5" fill="#0284c7" font-weight="700" text-anchor="middle">85%</text>

                <!-- Q6 -->
                <rect x="212" y="44" width="18" height="34" rx="2" fill="#0284c7"/>
                <text x="221" y="88" font-size="7" fill="#475569" font-weight="600" text-anchor="middle">Q6</text>
                <text x="221" y="41" font-size="6.5" fill="#0284c7" font-weight="700" text-anchor="middle">62%</text>

                <!-- Q7 -->
                <rect x="246" y="34" width="18" height="44" rx="2" fill="#0284c7"/>
                <text x="255" y="88" font-size="7" fill="#475569" font-weight="600" text-anchor="middle">Q7</text>
                <text x="255" y="31" font-size="6.5" fill="#0284c7" font-weight="700" text-anchor="middle">79%</text>

                <!-- Q8 -->
                <rect x="280" y="40" width="18" height="38" rx="2" fill="#0284c7"/>
                <text x="289" y="88" font-size="7" fill="#475569" font-weight="600" text-anchor="middle">Q8</text>
                <text x="289" y="37" font-size="6.5" fill="#0284c7" font-weight="700" text-anchor="middle">68%</text>
              </svg>
            </div>

            <ul class="bullets-list">
              <li class="bullet-item">
                <span class="bullet-marker">&#10003;</span>
                <span><strong>Question Correctness Indices:</strong> Real-time tracking detects ambiguous keys or questions with unexpected low success.</span>
              </li>
              <li class="bullet-item">
                <span class="bullet-marker">&#10003;</span>
                <span><strong>Discrepancy Identification:</strong> Visual flags notify academic controllers of potential answer-key misalignment prior to result compilation.</span>
              </li>
              <li class="bullet-item">
                <span class="bullet-marker">&#10003;</span>
                <span><strong>Response Spread Analytics:</strong> Item-level discrimination metrics measure assessment fairness and syllabus alignment.</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Section B: Score Distribution & Gaussian Performance -->
        <div class="analytics-card">
          <div>
            <div class="card-top">
              <div class="card-title-group">
                <div class="card-main-title">Score Distribution &amp; Benchmarking</div>
                <div class="card-sub-title">Transforming Evaluation Results into Actionable Performance Insights</div>
              </div>
              <div class="card-badge">Gaussian Curve</div>
            </div>

            <!-- Vector Graphic: Score Distribution Histogram + Bell Curve -->
            <div class="chart-box">
              <svg viewBox="0 0 340 98" style="width: 100%; height: auto; display: block;">
                <!-- Axis lines -->
                <line x1="30" y1="78" x2="330" y2="78" stroke="#cbd5e1" stroke-width="1"/>
                <line x1="30" y1="18" x2="30" y2="78" stroke="#cbd5e1" stroke-width="1"/>
                <text x="25" y="21" font-size="7" fill="#64748b" text-anchor="end">Count</text>

                <!-- Stat badge -->
                <rect x="210" y="3" width="118" height="13" rx="2.5" fill="#f0fdf4" stroke="#bbf7d0"/>
                <text x="269" y="12" font-size="6" fill="#166534" font-weight="700" text-anchor="middle">&mu;: 68.4% | &sigma;: &plusmn;12.2% | N: 14,850</text>

                <!-- Histogram Bars -->
                <rect x="38" y="71" width="22" height="7" rx="1.5" fill="#bae6fd"/>
                <rect x="65" y="63" width="22" height="15" rx="1.5" fill="#bae6fd"/>
                <rect x="92" y="49" width="22" height="29" rx="1.5" fill="#7dd3fc"/>
                <rect x="119" y="33" width="22" height="45" rx="1.5" fill="#38bdf8"/>
                <rect x="146" y="23" width="22" height="55" rx="1.5" fill="#0284c7"/>
                <rect x="173" y="25" width="22" height="53" rx="1.5" fill="#0284c7"/>
                <rect x="200" y="35" width="22" height="43" rx="1.5" fill="#38bdf8"/>
                <rect x="227" y="51" width="22" height="27" rx="1.5" fill="#7dd3fc"/>
                <rect x="254" y="65" width="22" height="13" rx="1.5" fill="#bae6fd"/>
                <rect x="281" y="73" width="22" height="5" rx="1.5" fill="#bae6fd"/>

                <!-- Bell Curve Stroke -->
                <path d="M 40 76 C 90 73, 115 25, 157 21 C 190 21, 225 68, 300 76" fill="none" stroke="#0f172a" stroke-width="2"/>

                <!-- Labels -->
                <text x="49" y="88" font-size="6.5" fill="#64748b" text-anchor="middle">0-20</text>
                <text x="103" y="88" font-size="6.5" fill="#64748b" text-anchor="middle">41-50</text>
                <text x="157" y="88" font-size="6.5" fill="#0b192c" font-weight="700" text-anchor="middle">Mean (68)</text>
                <text x="211" y="88" font-size="6.5" fill="#64748b" text-anchor="middle">71-80</text>
                <text x="292" y="88" font-size="6.5" fill="#64748b" text-anchor="middle">91-100</text>
              </svg>
            </div>

            <ul class="bullets-list">
              <li class="bullet-item">
                <span class="bullet-marker">&#10003;</span>
                <span><strong>Candidate-Wise Bell Curve:</strong> Instant visualization of mark distributions across multi-college cohorts.</span>
              </li>
              <li class="bullet-item">
                <span class="bullet-marker">&#10003;</span>
                <span><strong>Subject-Wise Comparisons:</strong> Comparative benchmarks highlight standard deviations and grading variances across evaluators.</span>
              </li>
              <li class="bullet-item">
                <span class="bullet-marker">&#10003;</span>
                <span><strong>Outlier Identification:</strong> Automated detection identifies bimodal clusters or abnormal skewness for review.</span>
              </li>
            </ul>
          </div>
        </div>

      </div>

      <!-- Section C: Suspicious Pattern Detection (Full Width Analytical Deep-Dive) -->
      <div class="analytics-card" style="margin-bottom: 2.8mm; border-top: 3px solid #f59e0b;">
        <div>
          <div class="card-top">
            <div class="card-title-group">
              <div class="card-main-title">Suspicious Examination Pattern Detection &amp; Audit Telemetry</div>
              <div class="card-sub-title">IDENTIFYING ANOMALIES. SUPPORTING TRANSPARENT INVESTIGATION.</div>
            </div>
            <div class="card-badge" style="background: #fffbeb; color: #b45309; border-color: #fde68a;">Investigation Support</div>
          </div>

          <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 3mm; align-items: center;">
            <!-- Vector Graphic: Telemetry / Heatmap -->
            <div class="chart-box" style="margin: 0;">
              <svg viewBox="0 0 340 82" style="width: 100%; height: auto; display: block;">
                <!-- Telemetry metric boxes -->
                <g transform="translate(10, 8)">
                  <rect width="90" height="30" rx="2" fill="#ffffff" stroke="#e2e8f0"/>
                  <text x="8" y="13" font-size="5.5" fill="#64748b" font-weight="600">RAPID EVALUATION</text>
                  <text x="8" y="25" font-size="8.8" fill="#dc2626" font-weight="800">4 Scripts &lt; 2 min</text>
                </g>
                <g transform="translate(115, 8)">
                  <rect width="95" height="30" rx="2" fill="#ffffff" stroke="#e2e8f0"/>
                  <text x="8" y="13" font-size="5.5" fill="#64748b" font-weight="600">RESPONSE SIMILARITY</text>
                  <text x="8" y="25" font-size="8.8" fill="#f59e0b" font-weight="800">Cluster #12 (94%)</text>
                </g>
                <g transform="translate(225, 8)">
                  <rect width="105" height="30" rx="2" fill="#ffffff" stroke="#e2e8f0"/>
                  <text x="8" y="13" font-size="5.5" fill="#64748b" font-weight="600">PROCTOR TAB-BLURS</text>
                  <text x="8" y="25" font-size="8.8" fill="#0284c7" font-weight="800">0 Security Breaches</text>
                </g>

                <!-- Timeline Audit Visual -->
                <line x1="15" y1="56" x2="325" y2="56" stroke="#cbd5e1" stroke-width="1.5"/>
                <circle cx="45" cy="56" r="3.5" fill="#0284c7"/>
                <text x="45" y="70" font-size="5.8" fill="#475569" font-weight="600" text-anchor="middle">Script Allotted</text>
                
                <circle cx="120" cy="56" r="3.5" fill="#0284c7"/>
                <text x="120" y="70" font-size="5.8" fill="#475569" font-weight="600" text-anchor="middle">Face ID Verified</text>

                <circle cx="210" cy="56" r="3.5" fill="#f59e0b"/>
                <text x="210" y="70" font-size="5.8" fill="#b45309" font-weight="700" text-anchor="middle">Pacing Checkpoint</text>

                <circle cx="295" cy="56" r="3.5" fill="#10b981"/>
                <text x="295" y="70" font-size="5.8" fill="#15803d" font-weight="700" text-anchor="middle">Audit Sealed</text>
              </svg>
            </div>

            <!-- Bulleted Capabilities -->
            <ul class="bullets-list">
              <li class="bullet-item">
                <span class="bullet-marker">&#10003;</span>
                <span><strong>Unusual Response Patterns:</strong> Identifies statistical similarity clusters in candidate objective responses for human audit.</span>
              </li>
              <li class="bullet-item">
                <span class="bullet-marker">&#10003;</span>
                <span><strong>Speed Pacing Outliers:</strong> Flags evaluators whose grading velocity bypasses normal cognitive reading thresholds.</span>
              </li>
              <li class="bullet-item">
                <span class="bullet-marker">&#10003;</span>
                <span><strong>Proctoring Telemetry:</strong> Logs tab-switching occurrences, webcam face verifications, and evaluation session pauses.</span>
              </li>
            </ul>
          </div>

          <!-- Mandatory Official Disclaimer -->
          <div class="disclaimer-box">
            <div class="disclaimer-icon">&#9888;</div>
            <div class="disclaimer-text">
              <strong>OFFICIAL SYSTEM GOVERNANCE NOTICE:</strong> Analytical indicators support investigation and human review. They do not independently establish cheating or misconduct. All flagged scripts undergo secondary expert verification before administrative action.
            </div>
          </div>
        </div>
      </div>

      <!-- Section D: Configurability & Flexible Architecture -->
      <div class="config-section">
        <div class="card-top" style="margin-bottom: 1.8mm;">
          <div class="card-title-group">
            <div class="card-main-title">CONFIGURED AROUND YOUR EXAMINATION ECOSYSTEM</div>
            <div class="card-sub-title">Flexible Configuration &bull; Organisational Control &bull; Adaptable Digital Evaluation</div>
          </div>
          <div class="card-badge" style="background: #f0fdfa; color: #0f766e; border-color: #99f6e4;">Zero Code Customization</div>
        </div>

        <div class="config-grid">
          <!-- Real Application Screenshot of Settings -->
          <div class="browser-frame">
            <div class="browser-header" style="padding: 1mm 2.2mm;">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">https://osm.portal.edu/settings/preferences</div>
              <div class="browser-tag" style="color: #0d9488;">Institutional Governance</div>
            </div>
            <img src="{app1_b64}" class="browser-img" style="height: 28mm; object-fit: cover;" alt="Portal Settings &amp; Preferences">
            <div class="caption-strip" style="padding: 1mm 2mm; font-size: 5.6pt;">
              <span><strong>SETTINGS &amp; POLICIES:</strong> Script Assignment, Marking Speed Pacing &amp; 2FA</span>
              <span class="highlight">Production View</span>
            </div>
          </div>

          <!-- 4 Configurable Capabilities -->
          <div class="config-features-grid">
            <div class="config-feature-box">
              <div class="config-feature-title">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                Allocation Models
              </div>
              <div class="config-feature-desc">Choose between mathematical Equal Distribution across examiners or daily quota limits with automatic reassignment.</div>
            </div>

            <div class="config-feature-box">
              <div class="config-feature-title">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Pacing &amp; Speed Profiles
              </div>
              <div class="config-feature-desc">Configure mandatory minimum evaluation duration per booklet and idle timeout enforcement to prevent rushed grading.</div>
            </div>

            <div class="config-feature-box">
              <div class="config-feature-title">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                2FA &amp; Security Controls
              </div>
              <div class="config-feature-desc">Enforce two-factor authentication, granular Role-Based Access Control (RBAC), and immutable transaction audit logs.</div>
            </div>

            <div class="config-feature-box">
              <div class="config-feature-title">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                Dynamic Rubric Schemas
              </div>
              <div class="config-feature-desc">Define multi-tier sections (MCQ, Analytical, Essay), attempt rules (e.g. Best 5 of 8), and custom question weightings.</div>
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
          <span>100% Blind Anonymity</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>Zero-Trust Immutable Audit Trail</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>AI &amp; Biometric Proctoring</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>Examination Standards Compliant</span>
        </div>
      </div>

      <div class="footer-bar">
        <span>Request an Executive Demonstration: contact@osm-platform.edu &bull; +1 (800) OSM-EVAL</span>
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

print('Updated HTML written successfully!')
