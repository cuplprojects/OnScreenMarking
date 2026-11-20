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
img_batch = get_base64_img(r"d:\OnScreenMarking\OSMNew\extracted_screenshots\screenshot_5_1700x837.png")
img_settings = get_base64_img(r"d:\OnScreenMarking\OSMNew\extracted_screenshots\screenshot_3_1700x556.png")
img_marking = get_base64_img(r"d:\OnScreenMarking\OSMNew\extracted_screenshots\screenshot_4_1700x847.png")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Smart OSM - On-Screen Marking Platform</title>
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
    padding: 13mm 17mm 11mm 17mm;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #ffffff;
    position: relative;
  }}

  /* Running Header */
  .page-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 7px;
    margin-bottom: 12px;
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
    font-size: 12.5pt;
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

  .header-tag {{
    font-size: 9pt;
    font-weight: 600;
    color: #475569;
  }}

  /* Content Core */
  .content-area {{
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  .kicker {{
    font-size: 8.5pt;
    font-weight: 800;
    color: #1e40af;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 3px;
  }}

  .headline {{
    font-size: 17.5pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.22;
    margin-bottom: 7px;
    letter-spacing: -0.3px;
  }}

  .lead-para {{
    font-size: 8.6pt;
    color: #334155;
    line-height: 1.48;
    text-align: justify;
    margin-bottom: 11px;
  }}

  .lead-para strong {{
    color: #0f172a;
    font-weight: 700;
  }}

  /* Section Titles with clean bottom rule (No Boxes) */
  .section-title {{
    font-size: 10.5pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 3px;
    margin-top: 6px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }}

  .section-tag {{
    font-size: 7.5pt;
    font-weight: 700;
    color: #2563eb;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}

  /* Two Column Flowing Narrative (No Boxes) */
  .two-col-narrative {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 18px;
    margin-bottom: 9px;
  }}

  .narrative-item {{
    border-left: 2.5px solid #2563eb;
    padding-left: 9px;
  }}

  .narrative-heading {{
    font-size: 8.7pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }}

  .narrative-text {{
    font-size: 8pt;
    color: #475569;
    line-height: 1.4;
    text-align: justify;
  }}

  .narrative-text strong {{
    color: #1e293b;
    font-weight: 600;
  }}

  /* Four Item Flowing Row (No Boxes) */
  .four-item-row {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 10px;
  }}

  .row-item {{
    border-left: 2px solid #0284c7;
    padding-left: 8px;
  }}

  .row-item-title {{
    font-size: 8.3pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }}

  .row-item-desc {{
    font-size: 7.6pt;
    color: #475569;
    line-height: 1.36;
  }}

  /* Numbered Flowing List (Page 2) */
  .numbered-audit-list {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px 18px;
    margin-bottom: 11px;
  }}

  .audit-entry {{
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }}

  .audit-digit {{
    width: 20px;
    height: 20px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    font-size: 8pt;
    font-weight: 800;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }}

  .audit-body {{
    flex: 1;
  }}

  .audit-name {{
    font-size: 8.7pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 1px;
  }}

  .audit-detail {{
    font-size: 7.9pt;
    color: #475569;
    line-height: 1.38;
    text-align: justify;
  }}

  /* Clean Screenshot Frame */
  .screenshot-frame {{
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }}

  .screenshot-caption-bar {{
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 6px 12px;
    font-size: 7.8pt;
    color: #334155;
    line-height: 1.38;
  }}

  .screenshot-caption-bar strong {{
    color: #0f172a;
  }}

  .img-responsive {{
    display: block;
    width: 100%;
    height: auto;
    object-fit: contain;
  }}

  /* Split View (Screenshot + Detailed Narrative) */
  .split-narrative-row {{
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    gap: 15px;
    align-items: center;
    margin-bottom: 11px;
  }}

  .split-narrative-row.reverse {{
    grid-template-columns: 1fr 1.05fr;
  }}

  .split-text-col {{
    display: flex;
    flex-direction: column;
    justify-content: center;
  }}

  .split-text-col p {{
    font-size: 8.1pt;
    color: #475569;
    line-height: 1.42;
    margin-bottom: 6px;
    text-align: justify;
  }}

  .split-text-col p:last-child {{
    margin-bottom: 0;
  }}

  .split-text-col strong {{
    color: #0f172a;
  }}

  /* Clean Horizontal Highlights Strip (No Boxes) */
  .text-highlights-strip {{
    border-top: 1.5px solid #e2e8f0;
    padding-top: 7px;
    margin-top: 6px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }}

  .highlight-point {{
    display: flex;
    flex-direction: column;
  }}

  .highlight-point-title {{
    font-size: 8.4pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }}

  .highlight-point-desc {{
    font-size: 7.6pt;
    color: #64748b;
    line-height: 1.34;
  }}

  /* Running Footer */
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
     PAGE 1: PHYSICAL BOOKLET DIGITISATION & INGESTION
     ========================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-group">
      <div class="brand-logo-icon">OSM</div>
      <div class="brand-titles">
        <div class="brand-main">SMART OSM PLATFORM</div>
        <div class="brand-sub">DIGITAL EXAMINATION EVALUATION ECOSYSTEM</div>
      </div>
    </div>
    <div class="header-tag">Physical Script Ingestion & Hardware Bridging</div>
  </div>

  <div class="content-area">
    <div>
      <div class="kicker">HIGH-THROUGHPUT EXAMINATION DIGITISATION</div>
      <h1 class="headline">Transforming Physical Answer Scripts Into Digital Intelligence</h1>
      <p class="lead-para">
        The <strong>Smart OSM Platform</strong> provides an enterprise-grade digital evaluation ecosystem designed to transition examination boards and universities from manual paper-based grading to a streamlined digital assessment environment. Manual evaluation cycles frequently suffer from physical transit delays, script misplacement risks, unverified totaling arithmetic mistakes, and zero operational tracking. Smart OSM bridges physical examination desks to high-speed digital evaluation through <strong>native hardware camera drivers</strong>, <strong>automated curvature flattening</strong>, <strong>neural sequence verification</strong>, and <strong>centralized cloud synchronization</strong>.
      </p>

      <div class="section-title">
        <span>1. High-Speed Booklet Digitisation Desk</span>
        <span class="section-tag">Native Hardware Integration</span>
      </div>
      <div class="two-col-narrative">
        <div class="narrative-item">
          <div class="narrative-heading">Direct CZUR & TWAIN Hardware Bridging</div>
          <div class="narrative-text">
            Integrates directly with overhead production book scanners (CZUR ET and Aura series) and high-volume ADF TWAIN document scanners. Direct C++ SDK bridging eliminates third-party scanner dependencies, ensuring zero-latency capture control directly from the application interface.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">Spine Curvature Flattening & Page Whitening</div>
          <div class="narrative-text">
            Specialized computer vision algorithms analyze physical answer booklet binding curves in real time, automatically flattening geometric spine distortion, removing operator finger traces, and purifying page backgrounds to pure 300 DPI optical contrast.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">Multi-Threaded Asynchronous Image Buffer</div>
          <div class="narrative-text">
            High-speed video capture is completely decoupled from disk compression and PDF/A encoding through a non-blocking asynchronous pipeline. Operators scan continuously at maximum physical page-turning speed without experiencing camera freeze or interface lag.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">Ergonomic Hands-Free Ingestion Controls</div>
          <div class="narrative-text">
            Supports USB foot-pedal triggers, physical desktop keyboard hotkeys, and optical turn-detection sensors. Operators turn physical booklet pages with both hands unimpeded while the scanner fires automatically upon page stability, minimizing operator fatigue.
          </div>
        </div>
      </div>

      <div class="section-title">
        <span>2. Centralized Ingestion Streams</span>
        <span class="section-tag">Cross-Reconciliation Data Hub</span>
      </div>
      <div class="four-item-row">
        <div class="row-item">
          <div class="row-item-title">Scanned Answer Booklets</div>
          <div class="row-item-desc">High-resolution dual-pass PDF/A compilation cryptographically bound to candidate physical barcodes and cover pages.</div>
        </div>
        <div class="row-item">
          <div class="row-item-title">Master Question Papers</div>
          <div class="row-item-desc">Official question papers, model marking schemes, and answer keys synchronized to designated Course Paper Codes.</div>
        </div>
        <div class="row-item">
          <div class="row-item-title">Candidate Rosters</div>
          <div class="row-item-desc">Master enrollment registers containing Roll Numbers, Exam Centers, Subjects, and Categories for validation.</div>
        </div>
        <div class="row-item">
          <div class="row-item-title">Center Attendance Logs</div>
          <div class="row-item-desc">Real-time reconciliation against present and absentee logs to instantly detect missing, un-scanned, or proxy candidate scripts.</div>
        </div>
      </div>
    </div>

    <div class="screenshot-frame">
      <img class="img-responsive" src="{img_scanner}" alt="Scanner Studio">
      <div class="screenshot-caption-bar">
        <strong>Live Production Scanner Studio:</strong> Live 1080p camera stream displaying real-time spine curvature flattening, hands-free foot pedal triggers, 300 DPI optical purity, and background purification during physical candidate booklet ingestion.
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Smart OSM Platform &bull; Physical Answer Script Digitisation Architecture</div>
    <div>CZUR & TWAIN Integration &bull; 300 DPI Ingestion &bull; Multi-Stream Synchronization</div>
    <div>Page 1 of 5</div>
  </div>
</div>

<!-- ==========================================
     PAGE 2: INGESTION QUALITY DEFENSE & TEMPLATE CALIBRATION
     ========================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-group">
      <div class="brand-logo-icon">OSM</div>
      <div class="brand-titles">
        <div class="brand-main">SMART OSM PLATFORM</div>
        <div class="brand-sub">PRE-MARKING QUALITY DEFENSE & TEMPLATE CALIBRATION</div>
      </div>
    </div>
    <div class="header-tag">Scanner Desk Quality Assurance</div>
  </div>

  <div class="content-area">
    <div>
      <div class="kicker">PRE-EVALUATION DATA INTEGRITY</div>
      <h1 class="headline">Rigorous Ingestion Audits & Visual Template Calibration</h1>
      <p class="lead-para">
        Maintaining uncompromising evaluation integrity requires eliminating scanning errors before digital scripts enter the marking pool. The Smart OSM Platform enforces automated multi-stage pre-scoring audits directly at the physical ingestion desk. Corrupted, mis-ordered, or unverified booklets are quarantined immediately, allowing operators to rectify discrepancies with non-destructive tooling without invalidating legitimate work.
      </p>

      <div class="section-title">
        <span>The Mandatory Pre-Marking Ingestion Audits</span>
        <span class="section-tag">Algorithmic Integrity Engine</span>
      </div>

      <div class="numbered-audit-list">
        <div class="audit-entry">
          <div class="audit-digit">1</div>
          <div class="audit-body">
            <div class="audit-name">Multi-Pass Neural Page Sequence OCR</div>
            <div class="audit-detail">Automated optical recognition extracts printed booklet page numbers across every scanned leaf, immediately detecting missing pages, sequence jumps, or physical scanning skips before document finalization.</div>
          </div>
        </div>

        <div class="audit-entry">
          <div class="audit-digit">5</div>
          <div class="audit-body">
            <div class="audit-name">Missing Booklet Triangulation Audit</div>
            <div class="audit-detail">Triangulates physical booklet counts with registered candidate enrollment rosters and center absentee logs, ensuring that zero physical examination sheets are lost or left un-scanned.</div>
          </div>
        </div>

        <div class="audit-entry">
          <div class="audit-digit">2</div>
          <div class="audit-body">
            <div class="audit-name">Two-Page Facing Spread Detection</div>
            <div class="audit-detail">Mathematical parity algorithms (2k, 2k+1) evaluate open-booklet dual page spreads, preventing false sequence jump warnings on bound answer sheets and preserving correct reading orientation.</div>
          </div>
        </div>

        <div class="audit-entry">
          <div class="audit-digit">6</div>
          <div class="audit-body">
            <div class="audit-name">Barcode Syntax & Checksum Validation</div>
            <div class="audit-detail">Decodes Code 128 and 2D QR codes on booklet covers, validating structural format against configured institutional roll number masks and verifying checksum parity.</div>
          </div>
        </div>

        <div class="audit-entry">
          <div class="audit-digit">3</div>
          <div class="audit-body">
            <div class="audit-name">Interactive Sequence Nudge & Adjustment</div>
            <div class="audit-detail">Provides scanner operators with side-by-side ROI close-ups and horizontal coordinate nudge controls to resolve edge-skewed or shifted page numbers without re-scanning the physical booklet.</div>
          </div>
        </div>

        <div class="audit-entry">
          <div class="audit-digit">7</div>
          <div class="audit-body">
            <div class="audit-name">Roster Registration Cross-Match</div>
            <div class="audit-detail">Cross-references decoded candidate roll numbers against master student databases in real time, isolating unregistered candidates, mistyped barcodes, or incorrect exam center allocations.</div>
          </div>
        </div>

        <div class="audit-entry">
          <div class="audit-digit">4</div>
          <div class="audit-body">
            <div class="audit-name">Non-Destructive Page Rescanning</div>
            <div class="audit-detail">Enables operators to replace blurred, folded, or poorly aligned individual pages on-the-fly while completely preserving the integrity of all previously scanned pages within the booklet.</div>
          </div>
        </div>

        <div class="audit-entry">
          <div class="audit-digit">8</div>
          <div class="audit-body">
            <div class="audit-name">Optical Illumination & Glare Telemetry</div>
            <div class="audit-detail">Built-in luminance sensors continuously evaluate ambient lighting conditions, preventing capture under excessive glare, dark shadows, or physical lens obstructions.</div>
          </div>
        </div>
      </div>

      <div class="section-title">
        <span>Interactive Visual Template Editor</span>
        <span class="section-tag">Zero-Code Coordinate Mapping</span>
      </div>
      <p class="lead-para" style="margin-bottom: 8px;">
        The <strong>Visual Template Editor</strong> enables administrators to configure booklet specifications visually. By drawing coordinates directly over sample booklet scans, administrators establish page boundaries, page-number ROI zones, barcode regions, and confidential masking fields. Once saved, these calibration schemas govern automated sequence auditing across tens of thousands of booklets.
      </p>
    </div>

    <div class="screenshot-frame">
      <img class="img-responsive" src="{img_template}" alt="Visual Template Editor">
      <div class="screenshot-caption-bar">
        <strong>Visual Template Studio:</strong> Administrators define sheet dimensions, page-number bounding boxes, barcode recognition zones, and confidential candidate blur areas with drag-and-drop precision.
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Smart OSM Platform &bull; Pre-Marking Ingestion Quality & Template Calibration</div>
    <div>8 Algorithmic Ingestion Audits &bull; Visual Coordinate Calibration &bull; Zero Scanning Drift</div>
    <div>Page 2 of 5</div>
  </div>
</div>

<!-- ==========================================
     PAGE 3: PAPERS MANAGEMENT & SECTION BATCH RUBRICS
     ========================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-group">
      <div class="brand-logo-icon">OSM</div>
      <div class="brand-titles">
        <div class="brand-main">SMART OSM PLATFORM</div>
        <div class="brand-sub">EXAMINATION BLUEPRINTS & RUBRIC ARCHITECTURE</div>
      </div>
    </div>
    <div class="header-tag">Curriculum Architecture & Rubric Engine</div>
  </div>

  <div class="content-area">
    <div>
      <div class="kicker">CURRICULUM MAPPING & RUBRIC INTEGRITY</div>
      <h1 class="headline">Centralized Paper Ingestion & Dynamic Section Rubrics</h1>
      <p class="lead-para">
        Bridging digitised answer scripts to digital evaluation requires structural examination blueprints. The Smart OSM Platform organizes complex academic papers into modular section batches, binding master question papers, configuring question-wise rubrics, and enforcing mathematical integrity rules before scripts are released to examiners.
      </p>

      <div class="split-narrative-row">
        <div class="split-text-col">
          <div class="section-title" style="margin-top: 0;">
            <span>Centralized Paper & Catch Management</span>
            <span class="section-tag">Master Catalog</span>
          </div>
          <p>
            <strong>Comprehensive Examination Ingestion:</strong> Administrators register academic examinations with Paper Code, Course Title, Subject, Total Questions, and Maximum Marks, assigning unique institutional Catch Numbers for end-to-end tracking.
          </p>
          <p>
            <strong>Master Question Paper Integration:</strong> Official question papers and authoritative marking schemes are uploaded as master reference PDFs, permanently bound to the paper record for instant one-click evaluator reference during live marking.
          </p>
          <p>
            <strong>Three-Point Readiness Telemetry Gate:</strong> Examination papers remain locked from examiner access until three verification checkpoints are satisfied: [1] Sections & Rubrics Configured, [2] Certified Evaluators Allotted, and [3] Master Question Paper Bound.
          </p>
        </div>

        <div class="screenshot-frame">
          <img class="img-responsive" src="{img_papers}" alt="Papers Management">
          <div class="screenshot-caption-bar">
            <strong>Master Paper Registry:</strong> Displays active Catch Numbers, question counts, linked Question Paper PDFs, and live status badges across all verification gates.
          </div>
        </div>
      </div>

      <div class="split-narrative-row reverse">
        <div class="screenshot-frame">
          <img class="img-responsive" src="{img_batch}" alt="Section Batch Blueprint">
          <div class="screenshot-caption-bar">
            <strong>Section Batch Configuration:</strong> Configures Section A/B/C batches, question types, optional rules ("Attempt Any 5 of 8"), and validates mathematical sum integrity.
          </div>
        </div>

        <div class="split-text-col">
          <div class="section-title" style="margin-top: 0;">
            <span>Dynamic Section Batch Blueprints</span>
            <span class="section-tag">Rubric Validation</span>
          </div>
          <p>
            <strong>Multi-Tier Section Architecture:</strong> Deconstructs examinations into distinct logical sections (Section A: Objective MCQs, Section B: Analytical Short Questions, Section C: Descriptive Essays) with defined question ranges and allocated marks.
          </p>
          <p>
            <strong>Flexible Optional Rules ("Attempt Any 5 of 8"):</strong> Supports granular choice structures, including internal group optionals (Group A/B) and universal attempt limits. The evaluation engine automatically honors best-marked answers while flagging surplus attempts.
          </p>
          <p>
            <strong>Mathematical Sum Integrity Enforcement:</strong> The validation engine strictly ensures that the sum of all individual question marks mathematically matches the paper's maximum marks prior to rubric locking, eliminating curriculum configuration discrepancies.
          </p>
        </div>
      </div>
    </div>

    <div class="text-highlights-strip">
      <div class="highlight-point">
        <div class="highlight-point-title">Catch Number Registry</div>
        <div class="highlight-point-desc">Unique institutional catch codes eliminate paper confusion across academic sessions.</div>
      </div>
      <div class="highlight-point">
        <div class="highlight-point-title">Master Question PDF</div>
        <div class="highlight-point-desc">Official question papers embedded directly for instant evaluator reference.</div>
      </div>
      <div class="highlight-point">
        <div class="highlight-point-title">Attempt Limits Engine</div>
        <div class="highlight-point-desc">Automated enforcement of optional choice rubrics and best-marked scoring.</div>
      </div>
      <div class="highlight-point">
        <div class="highlight-point-title">Sum Lock Integrity</div>
        <div class="highlight-point-desc">Prevents release of rubrics whose component marks do not equal total maximum marks.</div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Smart OSM Platform &bull; Curriculum Blueprints & Rubric Architecture</div>
    <div>Catch Number Mapping &bull; Section Batch Blueprints &bull; Mathematical Sum Integrity</div>
    <div>Page 3 of 5</div>
  </div>
</div>

<!-- ==========================================
     PAGE 4: EXAMINER ALLOCATION & ANTI-COLLUSION ENGINE
     ========================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-group">
      <div class="brand-logo-icon">OSM</div>
      <div class="brand-titles">
        <div class="brand-main">SMART OSM PLATFORM</div>
        <div class="brand-sub">WORKLOAD ALLOCATION & ANTI-COLLUSION GOVERNANCE</div>
      </div>
    </div>
    <div class="header-tag">Script Allocation & Quota Management</div>
  </div>

  <div class="content-area">
    <div>
      <div class="kicker">FAIR WORKLOAD DISTRIBUTION</div>
      <h1 class="headline">Intelligent Quota Allocation & Dynamic Script Snatching</h1>
      <p class="lead-para">
        Maintaining examination timelines and unbiased evaluation requires intelligent allocation governance. The Smart OSM Platform replaces arbitrary manual script allotment with an automated distribution engine that balances workloads, enforces daily evaluation caps, delivers scripts in randomized order, and dynamically reallocates stalled scripts to prevent grading bottlenecks.
      </p>

      <div class="section-title">
        <span>1. Examiner Onboarding & Workload Prioritization</span>
        <span class="section-tag">Faculty Governance</span>
      </div>
      <div class="two-col-narrative">
        <div class="narrative-item">
          <div class="narrative-heading">Secure Faculty Invitation Tokens</div>
          <div class="narrative-text">
            Institutional controllers onboard certified academic examiners through encrypted single-use invitation tokens, binding verified faculty credentials directly to authorized subjects, courses, and evaluation tiers without manual credential distribution.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">Role Prioritization & Evaluation Ordering</div>
          <div class="narrative-text">
            Defines hierarchical evaluation sequences (First Marker, Second Marker, Subject Moderator, Head Examiner). Scripts progress seamlessly through configured multi-tier evaluation paths based on defined institutional moderation parameters.
          </div>
        </div>
      </div>

      <div class="section-title">
        <span>2. Dual Allocation Distribution Models</span>
        <span class="section-tag">Anti-Collusion Delivery</span>
      </div>
      <div class="two-col-narrative">
        <div class="narrative-item">
          <div class="narrative-heading">Equal Distribution with Target Completion Dates</div>
          <div class="narrative-text">
            Mathematically divides the entire pool of scanned answer scripts equally among verified examiners assigned to that subject. Every examiner receives an identical script quota bound to a strict institutional Target Completion Date deadline.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">Daily Quota Caps & Randomized Delivery</div>
          <div class="narrative-text">
            Limits active script access to configured daily quotas (e.g., maximum 50 scripts per examiner per day). Answer scripts are delivered in dynamically randomized order, ensuring examiners cannot predict or select specific candidates, completely eliminating bias.
          </div>
        </div>
      </div>

      <div class="section-title">
        <span>3. Dynamic Script Snatching & Workload Balancing</span>
        <span class="section-tag">Bottleneck Elimination</span>
      </div>
      <div class="two-col-narrative">
        <div class="narrative-item">
          <div class="narrative-heading">Automated Script Revocation (Script Snatching)</div>
          <div class="narrative-text">
            If an allocated examiner remains inactive past threshold hours or falls behind their mandatory daily quota milestone, the administrative engine automatically snatches un-evaluated scripts from their queue, returning them to the central pool.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">Instant Redistribution & Turnaround Guarantee</div>
          <div class="narrative-text">
            Snatched scripts are immediately reallocated across high-performing active examiners. This dynamic reallocation prevents individual examiner delays from stalling overall examination result schedules, guaranteeing timely result publication.
          </div>
        </div>
      </div>
    </div>

    <div class="screenshot-frame" style="margin-top: 8px;">
      <img class="img-responsive" src="{img_settings}" alt="Script Assignment Configuration">
      <div class="screenshot-caption-bar">
        <strong>Script Assignment & Governance Console:</strong> Live portal configuration displaying Equal Distribution model, Time-per-Copy speed pacing enforcement, Target Completion Deadlines, and automated compliance logging.
      </div>
    </div>

    <div class="text-highlights-strip">
      <div class="highlight-point">
        <div class="highlight-point-title">Token Invitation</div>
        <div class="highlight-point-desc">Encrypted faculty invitations bind certified examiners to authorized subjects securely.</div>
      </div>
      <div class="highlight-point">
        <div class="highlight-point-title">Equal Distribution</div>
        <div class="highlight-point-desc">Mathematical partitioning guarantees uniform evaluation workload across faculty.</div>
      </div>
      <div class="highlight-point">
        <div class="highlight-point-title">Randomized Delivery</div>
        <div class="highlight-point-desc">Scripts delivered in random order eliminate examiner bias, favoritism, and collusion.</div>
      </div>
      <div class="highlight-point">
        <div class="highlight-point-title">Dynamic Snatching</div>
        <div class="highlight-point-desc">Automated reclamation of un-evaluated scripts prevents evaluation schedule bottlenecks.</div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Smart OSM Platform &bull; Workload Allocation & Anti-Collusion Governance</div>
    <div>Equal Distribution &bull; Daily Quota Caps &bull; Randomized Delivery &bull; Dynamic Script Snatching</div>
    <div>Page 4 of 5</div>
  </div>
</div>

<!-- ==========================================
     PAGE 5: LIVE MARKING WORKSPACE & ENTERPRISE SECURITY
     ========================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-group">
      <div class="brand-logo-icon">OSM</div>
      <div class="brand-titles">
        <div class="brand-main">SMART OSM PLATFORM</div>
        <div class="brand-sub">LIVE EVALUATION WORKSPACE & ENTERPRISE GOVERNANCE</div>
      </div>
    </div>
    <div class="header-tag">Digital Marking & Institutional Governance</div>
  </div>

  <div class="content-area">
    <div>
      <div class="kicker">PRECISION EVALUATION & INSTITUTIONAL CONTROL</div>
      <h1 class="headline">Ergonomic Digital Marking, Speed Pacing & Governance</h1>
      <p class="lead-para">
        The Smart OSM live evaluation environment delivers an examiner-friendly interface engineered for maximum grading accuracy and statutory compliance. By combining 100% blind anonymity with question-based rubric palettes, anti-rush speed pacing, and immutable audit logs, the platform ensures fair, consistent, and defensible examination results.
      </p>

      <div class="screenshot-frame" style="margin-bottom: 9px;">
        <img class="img-responsive" src="{img_marking}" alt="Live Marking Workspace">
        <div class="screenshot-caption-bar">
          <strong>Live On-Screen Marking Workspace:</strong> 100% blind barcode masking, question palette rubric scoring popup, precision annotation ledger, continuous zero-drift arithmetic totaling, and active AI proctoring telemetry.
        </div>
      </div>

      <div class="section-title">
        <span>1. Precision Marking Workspace Capabilities</span>
        <span class="section-tag">Examiner Ergonomics</span>
      </div>
      <div class="two-col-narrative">
        <div class="narrative-item">
          <div class="narrative-heading">100% Blind Barcode Anonymity</div>
          <div class="narrative-text">
            Candidate names, roll numbers, and physical barcodes are automatically obscured with dynamic cryptographic tokens (e.g., EXAM-2026_02_27...), guaranteeing completely unbiased evaluation without examiner prejudice.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">Question-Wise Rubric Scoring Palette</div>
          <div class="narrative-text">
            Evaluators click questions from the palette to open rubric popups, awarding marks strictly conforming to configured step-marks (0, 0.5, 1, 1.5, 2) and sectional caps, completely eliminating out-of-boundary marks.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">Precision Annotation Stamps</div>
          <div class="narrative-text">
            Official Green Ticks, Red Crosses, Fractional Marks, Text Remarks, and Blank Page stamps are stamped directly onto candidate answer pages and permanently recorded into the document ledger with examiner ID and timestamp.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">Zero Arithmetic Totaling Drift</div>
          <div class="narrative-text">
            Dynamic aggregation algorithms continuously compute section totals and grand scores in real time. Total marks are compiled automatically with zero arithmetic errors, eliminating manual recalculation requests.
          </div>
        </div>
      </div>

      <div class="section-title">
        <span>2. Speed Pacing & Institutional Compliance</span>
        <span class="section-tag">Quality Safeguards</span>
      </div>
      <div class="two-col-narrative">
        <div class="narrative-item">
          <div class="narrative-heading">Anti-Rush Speed Pacing Limits</div>
          <div class="narrative-text">
            Controllers enforce a mandatory minimum checking time per booklet (e.g. 15 minutes/copy). Marks submission remains locked until the examiner has spent sufficient time reviewing every page thoroughly.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">AI Proctoring & Session Lockouts</div>
          <div class="narrative-text">
            Continuous evaluator facial landmark monitoring, browser tab-blur detection, and automatic session lockouts safeguard evaluation integrity during decentralized remote marking operations.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">Multi-Tier Moderation & Quality Review</div>
          <div class="narrative-text">
            Supports configurable second-marking, blind re-evaluation of borderline papers, and head examiner review workflows before marks are officially committed to student gazettes.
          </div>
        </div>
        <div class="narrative-item">
          <div class="narrative-heading">Institutional 2FA & Granular RBAC</div>
          <div class="narrative-text">
            Mandatory two-factor authentication, granular role permissions (Supervisors, Coordinators, Evaluators), and offline-to-cloud TLS 1.3 sync safeguard examination data.
          </div>
        </div>
      </div>
    </div>

    <div class="text-highlights-strip">
      <div class="highlight-point">
        <div class="highlight-point-title">Dual Database Sync</div>
        <div class="highlight-point-desc">Offline Local SQLite/SQL Express at scanning desks with TLS 1.3 sync to cloud database.</div>
      </div>
      <div class="highlight-point">
        <div class="highlight-point-title">Immutable Audit Trail</div>
        <div class="highlight-point-desc">Every score awarded, stamp affixed, or script snatched logs timestamp, user ID, and IP address.</div>
      </div>
      <div class="highlight-point">
        <div class="highlight-point-title">Sub-Second Grading</div>
        <div class="highlight-point-desc">Compiled evaluation algorithms support 10,000+ concurrent evaluators with zero latency.</div>
      </div>
      <div class="highlight-point">
        <div class="highlight-point-title">Statutory Compliance</div>
        <div class="highlight-point-desc">Court-admissible tamper-evident digital records withstand judicial scrutiny and RTI audits.</div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Smart OSM Platform &bull; Live Marking Workspace & Enterprise Governance</div>
    <div>100% Blind Anonymity &bull; Speed Pacing Enforcement &bull; Immutable Audit Trail &bull; 2FA Security</div>
    <div>Page 5 of 5</div>
  </div>
</div>

</body>
</html>
"""

html_out_path = r"d:\OnScreenMarking\osm_chic_nobox_5page_brochure.html"
with open(html_out_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML successfully generated: {html_out_path} ({len(html_content)} characters)")
