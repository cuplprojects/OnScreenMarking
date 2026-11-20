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
<title>OSM Software Platform - End-to-End Workflow Brochure</title>
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
    padding: 9mm 12mm 8mm 12mm;
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
    padding-bottom: 2mm;
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
    margin-top: 2.2mm;
    margin-bottom: 2mm;
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
    margin-bottom: 0.8mm;
  }}

  .hero-headline {{
    font-size: 14.5pt;
    font-weight: 800;
    line-height: 1.16;
    letter-spacing: -0.4px;
    color: #0b192c;
  }}

  .hero-subhead {{
    font-size: 7.2pt;
    font-weight: 500;
    line-height: 1.35;
    color: #475569;
    margin-top: 1mm;
  }}

  /* Linear Operational Timeline */
  .workflow-timeline {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 1.8mm;
    padding: 1.8mm 3mm;
    margin-bottom: 2.5mm;
  }}

  .timeline-step {{
    display: flex;
    align-items: center;
    gap: 1.5mm;
  }}

  .step-circle {{
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
  }}

  .step-label {{
    font-size: 6.4pt;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: 0.2px;
  }}

  .timeline-arrow {{
    color: #94a3b8;
    font-size: 7.5pt;
    font-weight: bold;
  }}

  /* Narrative Sections */
  .story-section {{
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2.2mm;
    margin-bottom: 2.2mm;
  }}

  .story-section:last-of-type {{
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
  }}

  .story-header {{
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 1.4mm;
  }}

  .story-title-wrap {{
    display: flex;
    align-items: center;
    gap: 2mm;
  }}

  .story-step-badge {{
    background: #0284c7;
    color: white;
    font-size: 5.8pt;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}

  .story-title {{
    font-size: 8.8pt;
    font-weight: 800;
    color: #0b192c;
    letter-spacing: -0.2px;
  }}

  .story-tagline {{
    font-size: 6.2pt;
    font-weight: 600;
    color: #64748b;
  }}

  .story-split {{
    display: grid;
    grid-template-columns: 1.28fr 1fr;
    gap: 3mm;
    align-items: center;
  }}

  .story-split.reverse {{
    grid-template-columns: 1fr 1.28fr;
  }}

  /* Browser Window Style */
  .browser-frame {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 2mm;
    box-shadow: 0 3px 10px rgba(15, 23, 42, 0.07);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }}

  .browser-header {{
    background: #f1f5f9;
    padding: 1.2mm 2.5mm;
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
    font-size: 5.4pt;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    padding: 0.6px 5mm;
    border-radius: 1mm;
    color: #475569;
    font-weight: 500;
  }}

  .browser-tag {{
    font-size: 5.6pt;
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
    padding: 1.2mm 2.2mm;
    font-size: 5.8pt;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }}

  .caption-strip .highlight {{
    color: #38bdf8;
    font-weight: 700;
  }}

  /* Clean Bullet Points */
  .narrative-list {{
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1.8mm;
  }}

  .narrative-item {{
    display: flex;
    align-items: flex-start;
    gap: 1.8mm;
  }}

  .item-icon {{
    width: 3.8mm;
    height: 3.8mm;
    border-radius: 50%;
    background: #e0f2fe;
    color: #0284c7;
    font-size: 5.5pt;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 0.5px;
  }}

  .item-content {{
    display: flex;
    flex-direction: column;
  }}

  .item-title {{
    font-size: 6.8pt;
    font-weight: 800;
    color: #0b192c;
    line-height: 1.15;
  }}

  .item-desc {{
    font-size: 5.8pt;
    font-weight: 500;
    color: #475569;
    line-height: 1.32;
    margin-top: 0.4mm;
  }}

  /* Allocation Strategy Banner */
  .strategy-banner {{
    background: linear-gradient(135deg, #091a2f 0%, #0f2e4d 100%);
    border-radius: 2mm;
    padding: 2.4mm 3mm;
    color: #ffffff;
    margin-top: 2.2mm;
  }}

  .strategy-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5mm;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    padding-bottom: 1mm;
  }}

  .strategy-title {{
    font-size: 7.8pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #ffffff;
  }}

  .strategy-cols {{
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 2.5mm;
  }}

  .strat-col {{
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1.5mm;
    padding: 1.6mm;
  }}

  .strat-col-title {{
    font-size: 6.5pt;
    font-weight: 800;
    color: #38bdf8;
    margin-bottom: 0.6mm;
    display: flex;
    align-items: center;
    gap: 1mm;
  }}

  .strat-col-desc {{
    font-size: 5.4pt;
    font-weight: 400;
    color: #cbd5e1;
    line-height: 1.28;
  }}

  /* Footer Bar */
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

  /* Trust Banner */
  .trust-banner {{
    background: linear-gradient(90deg, #0b192c 0%, #1e293b 100%);
    border-radius: 1.8mm;
    padding: 2mm 3.2mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #ffffff;
  }}

  .trust-item {{
    display: flex;
    align-items: center;
    gap: 1.5mm;
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
</style>
</head>
<body>

<!-- ======================================================= -->
<!-- PAGE 1: SETUP, BLUEPRINTING & SCRIPT ALLOCATION        -->
<!-- ======================================================= -->
<div class="page">
  <div class="content-layer">
    
    <div>
      <!-- Top Brand Header -->
      <div class="header-bar">
        <div class="brand-group">
          <div class="brand-logo-icon">OSM</div>
          <div class="brand-title-wrap">
            <div class="brand-name">
              OSM PORTAL
              <span class="brand-badge">Enterprise Edition</span>
            </div>
            <div class="brand-sub">End-to-End On-Screen Marking &amp; Assessment Ecosystem</div>
          </div>
        </div>
        <div class="header-pills">
          <div class="pill pill-teal">Integrated Workflow</div>
          <div class="pill pill-navy">Technology Summit 2026</div>
        </div>
      </div>

      <!-- Main Headline Block -->
      <div class="hero-block">
        <div class="hero-eyebrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Structured Examination Administration Lifecycle
        </div>
        <h1 class="hero-headline">THE COMPLETE DIGITAL EXAMINATION EVALUATION PIPELINE</h1>
        <p class="hero-subhead">
          Follow the transparent operational path: from paper registration and multi-tier rubric blueprints to certified examiner invitation, randomized script allocation, and automated quota distribution.
        </p>
      </div>

      <!-- Linear Operational Timeline -->
      <div class="workflow-timeline">
        <div class="timeline-step">
          <div class="step-circle">1</div>
          <div class="step-label">Paper Creation &amp; Catch Registry</div>
        </div>
        <div class="timeline-arrow">&#10148;</div>
        <div class="timeline-step">
          <div class="step-circle">2</div>
          <div class="step-label">Section &amp; Rubric Blueprinting</div>
        </div>
        <div class="timeline-arrow">&#10148;</div>
        <div class="timeline-step">
          <div class="step-circle">3</div>
          <div class="step-label">Examiner Invitation &amp; Ordering</div>
        </div>
        <div class="timeline-arrow">&#10148;</div>
        <div class="timeline-step">
          <div class="step-circle">4</div>
          <div class="step-label">Randomized Script Allocation</div>
        </div>
      </div>

      <!-- STEP 1: Paper Creation & Master Registry -->
      <div class="story-section">
        <div class="story-header">
          <div class="story-title-wrap">
            <span class="story-step-badge">Stage 01</span>
            <span class="story-title">Examination Paper Creation &amp; Catch Mapping</span>
          </div>
          <span class="story-tagline">Centralized Paper Catalog &amp; Master Question Repository</span>
        </div>
        
        <div class="story-split">
          <!-- Actual Screenshot: Papers Management -->
          <div class="browser-frame">
            <div class="browser-header">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">https://osm.portal.edu/project/papers-management</div>
              <div class="browser-tag">Papers Hub</div>
            </div>
            <img src="{app3_b64}" class="browser-img" style="height: 27mm; object-fit: cover;" alt="Papers Management Dashboard">
            <div class="caption-strip">
              <span><strong>PRODUCTION VIEW:</strong> Paper Code, Catch No, Master QP PDF &amp; Examiner Allotment</span>
              <span class="highlight">Live Registry</span>
            </div>
          </div>

          <!-- Clean Narrative Bullets -->
          <ul class="narrative-list">
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">Comprehensive Paper Ingestion:</span>
                <span class="item-desc">Register examination papers with Paper Code, Course Name, official Catch Number, Subject, Total Questions, and Maximum Marks.</span>
              </div>
            </li>
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">Question Master PDF Integration:</span>
                <span class="item-desc">Upload official question paper PDFs directly linked to the paper record for instant evaluator reference during live marking.</span>
              </div>
            </li>
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">Readiness Telemetry Pills:</span>
                <span class="item-desc">Instant visual indicators track preparation status across three mandatory checkpoints: Sections Configured, Evaluator Allotted, and QP PDF Uploaded.</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- STEP 2: Section & Question Rubric Configuration -->
      <div class="story-section">
        <div class="story-header">
          <div class="story-title-wrap">
            <span class="story-step-badge">Stage 02</span>
            <span class="story-title">Section Batch Blueprints &amp; Question Rubric Schemas</span>
          </div>
          <span class="story-tagline">Granular Multi-Tier Rules, Optional Attempts &amp; Mark Validations</span>
        </div>

        <div class="story-split reverse">
          <!-- Clean Narrative Bullets -->
          <ul class="narrative-list">
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">Multi-Tier Section Architecture:</span>
                <span class="item-desc">Structure papers into Section Batches (e.g. Section A: MCQs, Section B: Analytical, Section C: Descriptive Long Essay) with defined Start and End Q# ranges.</span>
              </div>
            </li>
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">Attempt Limits &amp; Optional Controls:</span>
                <span class="item-desc">Configure rules like <em>"Attempt Any 5 of 8 Questions"</em> or Grouped Optionals (Grp A/B) — the system automatically honors best-marked attempts and flags excess answers.</span>
              </div>
            </li>
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">Mathematical Sum Integrity:</span>
                <span class="item-desc">The validation engine strictly ensures that the sum of all individual question marks mathematically matches the paper's maximum marks before locking.</span>
              </div>
            </li>
          </ul>

          <!-- Actual Screenshot: Batch Configure Modal (Optimized Size) -->
          <div class="browser-frame" style="background: #f8fafc;">
            <div class="browser-header">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">https://osm.portal.edu/sections/batch-configure</div>
              <div class="browser-tag">Rubric Manager</div>
            </div>
            <div style="padding: 0.8mm; display: flex; align-items: center; justify-content: center; background: #f1f5f9;">
              <img src="{modal2_b64}" style="width: 100%; max-height: 29mm; object-fit: contain; border-radius: 1.5mm; display: block;" alt="Configure Batch Sections">
            </div>
            <div class="caption-strip">
              <span><strong>RUBRIC SCHEMA:</strong> Section A, Question Types, Optional Flags &amp; Exact Marks</span>
              <span class="highlight">Actual Screen</span>
            </div>
          </div>
        </div>
      </div>

      <!-- STEP 3 & 4: Examiner Invitation, Ordering & Script Allocation Strategy -->
      <div class="strategy-banner">
        <div class="strategy-header">
          <div class="strategy-title">Stages 03 &amp; 04: Examiner Invitation, Workload Ordering &amp; Script Allocation</div>
          <span style="font-size: 5.5pt; font-weight: 700; background: #0284c7; padding: 1px 5px; border-radius: 2px;">Production Allocation Engine</span>
        </div>
        <div class="strategy-cols">
          <div class="strat-col">
            <div class="strat-col-title">&#10003; Examiner Invitation &amp; Ordering</div>
            <div class="strat-col-desc">Invite certified faculty via official invitation tokens, assign them to specific subjects, set priority ordering, and track active evaluation capacity in real-time.</div>
          </div>

          <div class="strat-col">
            <div class="strat-col-title">&#10003; Equal Distribution + Date Limit</div>
            <div class="strat-col-desc">Mathematically partitions scanned answer scripts equally across all verified examiners for that paper, enforced with a strict <strong>Completion Date Target</strong>.</div>
          </div>

          <div class="strat-col">
            <div class="strat-col-title">&#10003; Daily Allocation &amp; Randomized Order</div>
            <div class="strat-col-desc">Allots scripts under strict daily quota caps (e.g. 50 scripts/day). All scripts are delivered in <strong>randomized order</strong> to eliminate bias and prevent collusion.</div>
          </div>
        </div>
      </div>

    </div>

    <!-- Page 1 Bottom Status Bar -->
    <div>
      <div class="footer-bar">
        <span>OSM Enterprise Platform &bull; Paper Creation, Rubrics &amp; Script Allocation Lifecycle</span>
        <span>Corporate Technology Summit Edition &bull; Production Architecture</span>
        <span>Page 1 of 2</span>
      </div>
    </div>

  </div>
</div>


<!-- ======================================================= -->
<!-- PAGE 2: LIVE EVALUATION, PACING, DEALLOCATION & AUDIT  -->
<!-- ======================================================= -->
<div class="page">
  <div class="content-layer">

    <div>
      <!-- Top Brand Header -->
      <div class="header-bar">
        <div class="brand-group">
          <div class="brand-logo-icon">OSM</div>
          <div class="brand-title-wrap">
            <div class="brand-name">
              OSM PORTAL
              <span class="brand-badge">Evaluation &amp; Governance</span>
            </div>
            <div class="brand-sub">Live Marking Workspace, Speed Pacing &amp; Dynamic Deallocation</div>
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
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Question-Wise Evaluation, Pacing &amp; Administrative Controls
        </div>
        <h1 class="hero-headline">PRECISION DIGITAL MARKING, PACING &amp; SCRIPT SNATCHING</h1>
        <p class="hero-subhead">
          Examiners grade scripts question-by-question with zero arithmetic errors and AI proctoring, while administrators enforce minimum checking times and retain the power to deallocate or snatch scripts from inactive evaluators.
        </p>
      </div>

      <!-- STEP 5: Live Evaluator Workspace & Question-Based Marking (Large Hero Feature) -->
      <div class="story-section">
        <div class="story-header">
          <div class="story-title-wrap">
            <span class="story-step-badge">Stage 05</span>
            <span class="story-title">Live On-Screen Evaluation &amp; Question-Wise Rubric Marking</span>
          </div>
          <span class="story-tagline">100% Blind Anonymity, Digital Annotation Tools &amp; Dynamic 0% Tally Summation</span>
        </div>

        <div class="story-split">
          <!-- Actual Screenshot: Evaluator Workspace -->
          <div class="browser-frame">
            <div class="browser-header">
              <div class="browser-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="browser-url">https://osm.portal.edu/evaluate/script/view</div>
              <div class="browser-tag">Marking Workspace</div>
            </div>
            <img src="{app4_b64}" class="browser-img" alt="OSM Marking Workspace">
            <div class="caption-strip">
              <span><strong>ACTUAL APPLICATION SCREENSHOT:</strong> Live Candidate Script Evaluation Workspace</span>
              <span class="highlight">100% Blind Barcode Mask &bull; Question Palette &bull; AI Proctoring Active</span>
            </div>
          </div>

          <!-- Question-Based Marking & Safeguards Bullets -->
          <ul class="narrative-list">
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">100% Blind Barcode Masking:</span>
                <span class="item-desc">Candidate names, roll numbers, and physical barcodes are automatically masked with system tokens (e.g. <code>EXAM-2026_02_07...</code>) guaranteeing zero bias.</span>
              </div>
            </li>
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">Question-Based Rubric Scoring:</span>
                <span class="item-desc">Clicking any question in the Section A/B/C palette opens the exact rubric scoring modal. Evaluators award marks (0, 0.5, 1, 1.5, 2...) strictly matching that question's configured max marks.</span>
              </div>
            </li>
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">Precision Annotation Stamps:</span>
                <span class="item-desc">Affix official Green Ticks, Red Crosses, Fractional Points, Text Remarks, and Blank Page stamps permanently recorded into the booklet's audit ledger.</span>
              </div>
            </li>
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">0% Arithmetic &amp; Tally Errors:</span>
                <span class="item-desc">Dynamic automated aggregation continuously compiles section marks and total scores in real-time, completely eliminating manual recalculation errors.</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- STEP 6 & 7: Checking Time Limits, Anti-Rush Pacing & Script Deallocation / Snatching -->
      <div class="story-section">
        <div class="story-header">
          <div class="story-title-wrap">
            <span class="story-step-badge" style="background: #0d9488;">Stages 06 &amp; 07</span>
            <span class="story-title">Checking Time Limits, Pacing Safeguards &amp; Dynamic Script Snatching</span>
          </div>
          <span class="story-tagline">Enforcing Evaluation Thoroughness &amp; Re-Allotting Idle Scripts</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3mm;">
          <!-- Checking Time Limit / Pacing -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1.8mm; padding: 2mm;">
            <div style="font-size: 7.2pt; font-weight: 800; color: #0b192c; display: flex; align-items: center; gap: 1.5mm; margin-bottom: 1.2mm;">
              <span style="color: #0284c7;">&#10003;</span>
              Script Checking Time Limits &amp; Anti-Rush Profiles
            </div>
            <p style="font-size: 5.7pt; color: #475569; line-height: 1.32; margin-bottom: 1.2mm;">
              <strong>Mandatory Minimum Time-per-Copy:</strong> Administrators enforce a mandatory minimum duration per booklet (e.g. 15 minutes/copy). Marks submission remains locked until the evaluator spends adequate time reviewing every page.
            </p>
            <p style="font-size: 5.7pt; color: #475569; line-height: 1.32;">
              <strong>Active AI Proctoring &amp; Idle Timeouts:</strong> Continuous webcam face landmark verification (<code>compareFaces</code>), browser tab-blur detection, and automatic session lock after inactivity.
            </p>
          </div>

          <!-- Dynamic Deallocation / Snatching -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1.8mm; padding: 2mm;">
            <div style="font-size: 7.2pt; font-weight: 800; color: #0b192c; display: flex; align-items: center; gap: 1.5mm; margin-bottom: 1.2mm;">
              <span style="color: #0d9488;">&#10003;</span>
              Dynamic Script Deallocation &amp; Snatching Control
            </div>
            <p style="font-size: 5.7pt; color: #475569; line-height: 1.32; margin-bottom: 1.2mm;">
              <strong>Administrative Script Snatching:</strong> If an examiner is inactive, unassigned, or falling behind schedule, coordinators can instantly overwrite allocation counts and <strong>snatch un-evaluated scripts</strong> back.
            </p>
            <p style="font-size: 5.7pt; color: #475569; line-height: 1.32;">
              <strong>Instant Reassignment &amp; Expiry Cleanup:</strong> Snatched scripts are immediately returned to the pending pool or reassigned to active examiners, preventing bottlenecks and guaranteeing result deadlines.
            </p>
          </div>
        </div>
      </div>

      <!-- STEP 8: Institutional Governance & Policies (Actual Settings Screenshot) -->
      <div class="story-section" style="border-bottom: none; margin-bottom: 0;">
        <div class="story-header">
          <div class="story-title-wrap">
            <span class="story-step-badge" style="background: #0f172a;">Stage 08</span>
            <span class="story-title">Institutional Governance &amp; Security Compliance</span>
          </div>
          <span class="story-tagline">Portal Settings &bull; Two-Factor Authentication (2FA) &bull; Immutable Audit Logs</span>
        </div>

        <div class="story-split">
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
            <img src="{app1_b64}" class="browser-img" style="height: 25mm; object-fit: cover;" alt="Portal Settings &amp; Preferences">
            <div class="caption-strip">
              <span><strong>INSTITUTIONAL POLICIES:</strong> Script Assignment Models, Speed Pacing &amp; 2FA</span>
              <span class="highlight">Actual Screen</span>
            </div>
          </div>

          <!-- Governance Bullets -->
          <ul class="narrative-list">
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">Enterprise Security &amp; 2FA:</span>
                <span class="item-desc">Mandatory two-factor authentication for examiner logins and strict Role-Based Access Control (RBAC) across administrators and coordinators.</span>
              </div>
            </li>
            <li class="narrative-item">
              <div class="item-icon">&#10003;</div>
              <div class="item-content">
                <span class="item-title">Immutable Transaction Audit Trail:</span>
                <span class="item-desc">Every question mark entered, annotation stamped, script allocated or snatched is logged into a tamper-evident audit record with examiner ID and timestamp.</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

    </div>

    <!-- Bottom Institutional Trust Banner & Page 2 Footer -->
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
          <span>Administrative Script Snatching</span>
        </div>
        <div class="trust-item">
          <div class="trust-badge-icon">&#10003;</div>
          <span>Immutable Audit Security</span>
        </div>
      </div>

      <div class="footer-bar">
        <span>Request an Executive Demonstration: contact@osm.portal.edu &bull; Integrated Assessment Platform</span>
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

print('Updated polished workflow brochure HTML written successfully!')
