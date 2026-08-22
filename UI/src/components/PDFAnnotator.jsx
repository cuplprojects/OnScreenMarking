import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { RotateCcw, Copy, Type, ZoomIn, ZoomOut, Check, X, Undo, Move, Trash2, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import message from '../services/messageService';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PDFAnnotator = forwardRef(({ onAnnotationsChange, currentQuestionId, onNextQuestion, maxMarks, sections = [], pdfUrl, scriptId, readOnly }, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#FF0000');
  const [lineWidth, setLineWidth] = useState(2);
  const [selectedText, setSelectedText] = useState('');
  const canvasContextRef = useRef(null);
  const [imageSource, setImageSource] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [pdfPages, setPdfPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showTextInput, setShowTextInput] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [selectedAnno, setSelectedAnno] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState([]);
  const [showMarkPopup, setShowMarkPopup] = useState(false);
  const [markInput, setMarkInput] = useState('');
  const [stepName, setStepName] = useState('');
  const [pendingAnno, setPendingAnno] = useState(null);
  const [isSkipped, setIsSkipped] = useState(false);
  const [loadingPdf, setLoadingLoadingPdf] = useState(false);

  // Expose PDF generation and uploading to the parent component
  useImperativeHandle(ref, () => ({
    generateEvaluatedPdf: async (mId) => {
      try {
        if (pdfPages.length === 0) return "";
        
        const { jsPDF } = await import('jspdf');
        
        // Setup PDF with identical dimensions
        const pdf = new jsPDF({
          orientation: canvasSize.width > canvasSize.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvasSize.width, canvasSize.height]
        });

        for (let i = 0; i < pdfPages.length; i++) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvasSize.width;
          tempCanvas.height = canvasSize.height;
          const tempCtx = tempCanvas.getContext('2d');
          
          // Clear background
          tempCtx.fillStyle = '#ffffff';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          // Draw clean page image
          if (pdfPages[i]) {
            tempCtx.drawImage(pdfPages[i], 0, 0, tempCanvas.width, tempCanvas.height);
          }
          
          // Draw annotations at standard zoom scale of 1
          annotations
            .filter(anno => anno.page === undefined || anno.page === i)
            .forEach(anno => {
              drawAnnotation(tempCtx, anno, 1);
            });

          // Draw dynamic evaluation summary at top right of the front page (page index 0)
          if (i === 0) {
            drawSummaryStamp(tempCtx, 1);
          }

          const imgData = tempCanvas.toDataURL('image/jpeg', 0.95);
          
          if (i > 0) {
            pdf.addPage([canvasSize.width, canvasSize.height], canvasSize.width > canvasSize.height ? 'landscape' : 'portrait');
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, canvasSize.width, canvasSize.height);
        }

        const pdfBlob = pdf.output('blob');
        const formData = new FormData();
        formData.append('file', pdfBlob, `evaluated_${scriptId}.pdf`);

        const token = sessionStorage.getItem('token');
        const uploadUrl = mId 
          ? `${import.meta.env.VITE_API_URL}/upload?markingId=${mId}`
          : `${import.meta.env.VITE_API_URL}/upload`;

        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        const uploadResult = await uploadResponse.json();
        return uploadResult.url || "";
      } catch (err) {
        console.error("Failed to generate evaluated PDF:", err);
        return "";
      }
    },
    syncAnnotations: () => {
      if (scriptId) {
        const saved = sessionStorage.getItem(`annotations_${scriptId}`);
        if (saved) {
          try {
            setAnnotations(JSON.parse(saved));
          } catch (e) {}
        }
      }
    }
  }));

  // Helper to fit zoom to container width (Shrink to Fit)
  const fitZoomToContainer = (pageWidth) => {
    setTimeout(() => {
      const container = canvasRef.current?.parentNode;
      if (container) {
        const containerWidth = container.clientWidth - 32; // subtract padding
        if (containerWidth > 0 && pageWidth > 0) {
          const fitZoom = Math.min(1, containerWidth / pageWidth);
          setZoom(parseFloat(fitZoom.toFixed(2)));
        }
      }
    }, 150);
  };

  // Helper to save annotations to storage
  const saveAnnotationsToStorage = (updatedAnnos) => {
    if (scriptId) {
      sessionStorage.setItem(`annotations_${scriptId}`, JSON.stringify(updatedAnnos));
    }
  };

  // Sync annotations from sessionStorage based on scriptId
  useEffect(() => {
    if (scriptId) {
      const saved = sessionStorage.getItem(`annotations_${scriptId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAnnotations(parsed);
          onAnnotationsChange?.(parsed);
        } catch (e) {
          console.error("Failed to parse annotations from sessionStorage:", e);
        }
      } else {
        setAnnotations([]);
        onAnnotationsChange?.([]);
      }
      setSelectedAnno(null);
    }
  }, [scriptId]);

  // Backspace/Delete key listener for deleting selected annotations
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnno) {
        const updated = annotations.filter(anno => anno.id !== selectedAnno.id);
        setAnnotations(updated);
        saveAnnotationsToStorage(updated);
        onAnnotationsChange?.(updated);
        setSelectedAnno(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnno, annotations]);

  // Auto-load PDF from URL
  useEffect(() => {
    if (pdfUrl) {
      loadPdfFromUrl(pdfUrl);
    }
  }, [pdfUrl]);

  const loadPdfFromUrl = async (url) => {
    try {
      setLoadingLoadingPdf(true);
      const token = sessionStorage.getItem('token');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        pages.push(canvas);
      }

      setPdfPages(pages);
      setCurrentPage(0);
      setImageSource(null);
      if (pages.length > 0) {
        setCanvasSize({ width: pages[0].width, height: pages[0].height });
        fitZoomToContainer(pages[0].width);
      }
    } catch (err) {
      console.error("Failed to load PDF:", err);
    } finally {
      setLoadingLoadingPdf(false);
    }
  };

  // Sync stepName to first section name when sections are loaded
  useEffect(() => {
    if (sections.length > 0 && !stepName) {
      setStepName(sections[0].name);
    }
  }, [sections]);

  // Redraw everything whenever relevant state changes
  useEffect(() => {
    redrawCanvas();
  }, [imageSource, zoom, canvasSize, pdfPages, currentPage, annotations, currentPath, selectedAnno]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    canvasContextRef.current = context;

    // Set canvas size
    canvas.width = canvasSize.width * zoom;
    canvas.height = canvasSize.height * zoom;

    // Clear canvas
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw PDF page or image
    if (pdfPages.length > 0 && pdfPages[currentPage]) {
      context.drawImage(pdfPages[currentPage], 0, 0, canvas.width, canvas.height);
    } else if (imageSource) {
      context.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
    } else {
      // Draw placeholder
      context.fillStyle = '#f0f0f0';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#999';
      context.font = '16px Arial';
      context.textAlign = 'center';
      context.fillText('Upload Answer Sheet Image or PDF', canvas.width / 2, canvas.height / 2 - 20);
      context.fillText('(JPG, PNG, PDF)', canvas.width / 2, canvas.height / 2 + 20);
      return;
    }

    // Draw all annotations for current page
    annotations.filter(anno => anno.page === undefined || anno.page === currentPage).forEach(anno => {
      drawAnnotation(context, anno);
    });

    // Highlight selected annotation when in move tool
    if (selectedAnno && tool === 'move' && (selectedAnno.page === undefined || selectedAnno.page === currentPage)) {
      context.strokeStyle = '#3b82f6';
      context.lineWidth = 1.5 * zoom;
      context.setLineDash([5 * zoom, 5 * zoom]);
      const px = selectedAnno.x !== undefined ? selectedAnno.x * zoom : (selectedAnno.points?.[0]?.x * zoom);
      const py = selectedAnno.y !== undefined ? selectedAnno.y * zoom : (selectedAnno.points?.[0]?.y * zoom);
      context.strokeRect(px - 15 * zoom, py - 15 * zoom, 30 * zoom, 30 * zoom);
      context.setLineDash([]);
    }

    // Draw current path if drawing
    if (currentPath.length > 1) {
      drawAnnotation(context, {
        type: 'pen',
        points: currentPath,
        color: color,
        lineWidth: lineWidth
      });
    }

    // Draw dynamic evaluation summary at top right of the front page (page index 0)
    if (currentPage === 0) {
      drawSummaryStamp(context, zoom);
    }
  };

  const drawSummaryStamp = (ctx, drawZoom) => {
    // Aggregate section-wise marks from current annotations
    const secTotals = {};
    sections.forEach(sec => {
      secTotals[sec.name] = 0;
    });
    
    annotations.forEach(anno => {
      if (anno.marks !== undefined && !anno.isSkipped) {
        const sName = anno.stepName || (sections[0]?.name || '');
        if (sName) {
          secTotals[sName] = (secTotals[sName] || 0) + (anno.marks || 0);
        }
      }
    });

    const grandTotal = Object.values(secTotals).reduce((sum, v) => sum + v, 0);

    ctx.save();
    const boxWidth = 220 * drawZoom;
    const boxHeight = (40 + (sections.length * 18) + 30) * drawZoom;
    const boxX = ctx.canvas.width - boxWidth - 30 * drawZoom;
    const boxY = 30 * drawZoom;

    // Translucent backing
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Double border effect
    ctx.strokeStyle = '#D32F2F'; // Rich Deep Red
    ctx.lineWidth = 3 * drawZoom;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    ctx.strokeStyle = '#FFCDD2';
    ctx.lineWidth = 1 * drawZoom;
    ctx.strokeRect(boxX + 3 * drawZoom, boxY + 3 * drawZoom, boxWidth - 6 * drawZoom, boxHeight - 6 * drawZoom);

    // Header text
    ctx.fillStyle = '#D32F2F';
    ctx.font = `bold ${12 * drawZoom}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('ON-SCREEN EVALUATION', boxX + boxWidth / 2, boxY + 20 * drawZoom);

    // Divider line
    ctx.beginPath();
    ctx.moveTo(boxX + 15 * drawZoom, boxY + 28 * drawZoom);
    ctx.lineTo(boxX + boxWidth - 15 * drawZoom, boxY + 28 * drawZoom);
    ctx.strokeStyle = '#D32F2F';
    ctx.lineWidth = 1 * drawZoom;
    ctx.stroke();

    // Draw section totals
    ctx.textAlign = 'left';
    ctx.fillStyle = '#333333';
    ctx.font = `${11 * drawZoom}px Arial`;
    let lineY = boxY + 45 * drawZoom;
    sections.forEach(sec => {
      const sTotal = secTotals[sec.name] || 0;
      ctx.fillText(`${sec.name}:`, boxX + 20 * drawZoom, lineY);
      ctx.textAlign = 'right';
      ctx.font = `bold ${11 * drawZoom}px Arial`;
      ctx.fillText(`${sTotal} Marks`, boxX + boxWidth - 20 * drawZoom, lineY);
      ctx.textAlign = 'left';
      ctx.font = `${11 * drawZoom}px Arial`;
      lineY += 18 * drawZoom;
    });

    // Divider line for grand total
    ctx.beginPath();
    ctx.moveTo(boxX + 15 * drawZoom, lineY - 4 * drawZoom);
    ctx.lineTo(boxX + boxWidth - 15 * drawZoom, lineY - 4 * drawZoom);
    ctx.strokeStyle = '#E0E0E0';
    ctx.stroke();

    // Draw grand total
    ctx.fillStyle = '#D32F2F';
    ctx.font = `bold ${13 * drawZoom}px Arial`;
    ctx.fillText('GRAND TOTAL:', boxX + 20 * drawZoom, lineY + 12 * drawZoom);
    ctx.textAlign = 'right';
    ctx.font = `bold ${14 * drawZoom}px Arial`;
    ctx.fillText(`${grandTotal} Marks`, boxX + boxWidth - 20 * drawZoom, lineY + 12 * drawZoom);

    ctx.restore();
  };

  const drawAnnotation = (ctx, anno, drawZoom = zoom) => {
    ctx.strokeStyle = anno.color;
    ctx.fillStyle = anno.color;
    ctx.lineWidth = anno.lineWidth * drawZoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
 
    switch (anno.type) {
      case 'tick':
        drawTick(ctx, anno.x * drawZoom, anno.y * drawZoom, (anno.lineWidth * 10) * drawZoom);
        break;
      case 'cross':
        drawCross(ctx, anno.x * drawZoom, anno.y * drawZoom, (anno.lineWidth * 10) * drawZoom);
        break;
      case 'text':
        ctx.font = `${anno.lineWidth * 5 * drawZoom}px Arial`;
        ctx.fillText(anno.text, anno.x * drawZoom, anno.y * drawZoom);
        break;
      case 'blank_page':
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 4 * drawZoom;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ctx.canvas.width, ctx.canvas.height);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.85)';
        ctx.font = `bold ${32 * drawZoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('BLANK PAGE', ctx.canvas.width / 2, ctx.canvas.height / 2);
        break;
    }
 
    // Draw question tag if linked
    if (anno.questionId) {
      ctx.font = `bold ${11 * drawZoom}px Arial`;
      const isCorrect = anno.type === 'tick' || (anno.marks > 0);
      const isSkipped = anno.isSkipped;
      
      const themeColor = isSkipped ? '#FF6B6B' : (isCorrect ? '#008000' : '#FF0000');
      ctx.fillStyle = themeColor;
      
      const markStr = anno.marks !== undefined ? `(${anno.marks})` : '(?)';
      const qNo = !isNaN(anno.questionId) && Number(anno.questionId) < 10 ? '0' + anno.questionId : anno.questionId;
      const secLabel = anno.stepName ? ` | ${anno.stepName}` : '';
      const label = `${markStr} Q${qNo}${secLabel}`;
      const px = anno.x ? anno.x * drawZoom : (anno.points?.[0]?.x * drawZoom);
      const py = anno.y ? anno.y * drawZoom : (anno.points?.[0]?.y * drawZoom);
      
      // Draw a small pill background
      const metrics = ctx.measureText(label);
      ctx.fillStyle = isSkipped ? 'rgba(255, 107, 107, 0.1)' : (isCorrect ? 'rgba(0, 128, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)');
      ctx.fillRect(px - 4, py - 20, metrics.width + 8, 16);
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 4, py - 20, metrics.width + 8, 16);
      
      ctx.fillStyle = themeColor;
      ctx.fillText(label, px, py - 8);

      // Draw beautiful circle badge containing marks next to it
      if (anno.marks !== undefined && (anno.type === 'tick' || anno.type === 'cross')) {
        ctx.save();
        const cx = px + 26 * drawZoom;
        const cy = py - 6 * drawZoom;
        const radius = 13 * drawZoom;
        
        // Draw white backing
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        // Draw circle border
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1.8 * drawZoom;
        ctx.stroke();
        
        // Draw centered marks text
        ctx.font = `bold ${10 * drawZoom}px Arial`;
        ctx.fillStyle = themeColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(anno.marks), cx, cy);
        ctx.restore();
      }
    }
  };

  const drawTick = (ctx, x, y, size) => {
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x - size / 3, y + size);
    ctx.lineTo(x + size, y - size);
    ctx.stroke();
  };

  const drawCross = (ctx, x, y, size) => {
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.stroke();
  };


  const startDrawing = (e) => {
    if (!canvasRef.current || readOnly) return;
    
    // Core check: drawing and annotation tools are locked until a question is selected
    if (!currentQuestionId) {
      message.warning("Please select a question from the right panel before you begin marking or annotating!");
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (tool === 'move') {
      // Find item to drag
      const item = [...annotations].reverse().find(anno => {
        if (anno.page !== undefined && anno.page !== currentPage) return false;
        if (anno.x !== undefined) {
          const dist = Math.sqrt(Math.pow(anno.x - x, 2) + Math.pow(anno.y - y, 2));
          return dist < 30;
        }
        if (anno.points) {
          return anno.points.some(p => Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2)) < 20);
        }
        return false;
      });

      if (item) {
        setIsDragging(true);
        setDraggedItem({ ...item, originalIndex: annotations.indexOf(item), offsetX: (item.x || item.points?.[0]?.x) - x, offsetY: (item.y || item.points?.[0]?.y) - y });
        setSelectedAnno(item);
      } else {
        setSelectedAnno(null);
      }
      return;
    }

    if (tool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
      setTool('move'); // Switch back to select/move mode immediately
      return;
    }

    if (tool === 'pen') {
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    } else {
      // Single click tools (Tick, Cross, etc.)
      const activeSectionName = sections.find(sec => 
        sec.questions?.some(q => q.questionNo === currentQuestionId)
      )?.name || (sections[0]?.name || '');

      const newAnno = {
        type: tool,
        x, y,
        color,
        lineWidth,
        questionId: currentQuestionId,
        stepName: activeSectionName,
        page: currentPage,
        id: Date.now()
      };
      
      if (tool === 'tick' || tool === 'cross') {
        setPendingAnno(newAnno);
        setShowMarkPopup(true);
        setMarkInput('');
        setStepName(activeSectionName);
        setIsSkipped(false);
        setTool('move'); // Switch back to select/move mode immediately
      } else {
        const updated = [...annotations, newAnno];
        setAnnotations(updated);
        saveAnnotationsToStorage(updated);
        onAnnotationsChange?.(updated);
        setTool('move'); // Switch back to select/move mode immediately
      }
    }
  };

  const draw = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (isDragging && draggedItem) {
      const updated = [...annotations];
      const item = updated[draggedItem.originalIndex];
      if (item.x !== undefined) {
        item.x = x + draggedItem.offsetX;
        item.y = y + draggedItem.offsetY;
      } else if (item.points) {
        const dx = x + draggedItem.offsetX - item.points[0].x;
        const dy = y + draggedItem.offsetY - item.points[0].y;
        item.points = item.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
      }
      setAnnotations(updated);
      return;
    }

    if (!isDrawing || tool !== 'pen') return;
    setCurrentPath(prev => [...prev, { x, y }]);
  };

  const stopDrawing = () => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedItem(null);
      saveAnnotationsToStorage(annotations);
      onAnnotationsChange?.(annotations);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPath.length > 1) {
      const newAnno = {
        type: 'pen',
        points: currentPath,
        color,
        lineWidth,
        questionId: currentQuestionId,
        page: currentPage,
        id: Date.now()
      };
      const updated = [...annotations, newAnno];
      setAnnotations(updated);
      saveAnnotationsToStorage(updated);
      onAnnotationsChange?.(updated);
    }
    setCurrentPath([]);
  };
  const handleUndo = () => {
    const updated = annotations.slice(0, -1);
    setAnnotations(updated);
    saveAnnotationsToStorage(updated);
    onAnnotationsChange?.(updated);
    setSelectedAnno(null);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (!canvasRef.current || readOnly) return;
    
    // Lock context menu quick annotations if no question is selected
    if (!currentQuestionId) {
      message.warning("Please select a question from the right panel before you begin marking or annotating!");
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const activeSectionName = sections.find(sec => 
      sec.questions?.some(q => q.questionNo === currentQuestionId)
    )?.name || (sections[0]?.name || '');

    const newAnno = {
      type: 'tick',
      x, y,
      color: '#00AA00',
      lineWidth: 2,
      questionId: currentQuestionId,
      stepName: activeSectionName,
      page: currentPage,
      id: Date.now()
    };
    
    setPendingAnno(newAnno);
    setShowMarkPopup(true);
    setMarkInput('');
    setStepName(activeSectionName);
    setIsSkipped(false);
  };

  const getMarkOptions = () => {
    const options = [0];
    const max = maxMarks || 10;
    for (let i = 0.5; i <= max; i += 0.5) {
      options.push(i);
    }
    return options;
  };

  const submitMark = () => {
    if (pendingAnno) {
      const finalMark = parseFloat(markInput) || 0;
      const finalAnno = { 
        ...pendingAnno, 
        marks: finalMark,
        stepName: stepName,
        isSkipped: isSkipped,
        type: isSkipped ? 'cross' : (finalMark > 0 ? 'tick' : 'cross'),
        color: isSkipped ? '#FF6B6B' : (finalMark > 0 ? '#00AA00' : '#FF0000')
      };
      const updated = [...annotations, finalAnno];
      setAnnotations(updated);
      saveAnnotationsToStorage(updated);
      onAnnotationsChange?.(updated);
      setPendingAnno(null);
      setShowMarkPopup(false);
      setMarkInput('');
      setIsSkipped(false);
      
      // Auto advance to next question if successful
      if (onNextQuestion) {
        onNextQuestion();
      }
    }
  };

  const clearCanvas = () => {
    setAnnotations([]);
    saveAnnotationsToStorage([]);
    onAnnotationsChange?.([]);
    setSelectedAnno(null);
  };

  const addTextAnnotation = () => {
    if (!textInput.trim()) return;
    
    const newAnno = {
      type: 'text',
      text: textInput,
      x: textPosition.x,
      y: textPosition.y,
      color,
      lineWidth,
      questionId: currentQuestionId,
      page: currentPage,
      id: Date.now()
    };
    
    const updated = [...annotations, newAnno];
    setAnnotations(updated);
    saveAnnotationsToStorage(updated);
    onAnnotationsChange?.(updated);
    
    setTextInput('');
    setShowTextInput(false);
  };

  const handleCopy = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      message.success('Text copied to clipboard!');
    }
  };

  const handleTextSelection = (e) => {
    const selected = window.getSelection().toString();
    if (selected) {
      setSelectedText(selected);
    }
  };

  const isToolDisabled = !currentQuestionId || readOnly;

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm p-3 space-y-2 border border-gray-200">
        <div className="flex gap-2 items-center border-b border-gray-200 pb-2">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Evaluation Mode: </span>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase">Q{currentQuestionId || "â€”"}</span>
          <div className="h-4 w-px bg-gray-300 mx-2" />
          <span className="text-xs font-medium text-gray-500 italic">
            {readOnly ? "Read-Only Mode (Submitted Script)" : "Right-click anywhere on the script to mark"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-xs">
          {/* Main Tools */}
          <div className="flex gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={() => setTool('move')}
              disabled={isToolDisabled}
              className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tool === 'move' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="Move & Select Annotations"
            >
              <Move size={16} />
            </button>
            <button
              onClick={() => setTool('text')}
              disabled={isToolDisabled}
              className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tool === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="Text"
            >
              <Type size={16} />
            </button>
            <button
              onClick={() => setTool('tick')}
              disabled={isToolDisabled}
              className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tool === 'tick' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="Tick"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => setTool('cross')}
              disabled={isToolDisabled}
              className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tool === 'cross' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="Cross"
            >
              <X size={16} />
            </button>
          </div>

          {/* History */}
          <div className="flex gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={handleUndo}
              disabled={annotations.length === 0 || readOnly}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
              title="Undo"
            >
              <Undo size={16} />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex gap-1 items-center border-r border-gray-300 pr-2">
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"><ZoomOut size={16} /></button>
            <span className="w-10 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"><ZoomIn size={16} /></button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 items-center">
            <button onClick={handleCopy} disabled={!selectedText} className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50" title="Copy Text"><Copy size={16} /></button>
            
            {/* Blank Page Toggle Button */}
            <button
              onClick={() => {
                const hasBlank = annotations.some(anno => anno.type === 'blank_page' && anno.page === currentPage);
                let updated;
                if (hasBlank) {
                  updated = annotations.filter(anno => !(anno.type === 'blank_page' && anno.page === currentPage));
                } else {
                  updated = [...annotations, {
                    type: 'blank_page',
                    page: currentPage,
                    color: '#FF0000',
                    lineWidth: 3,
                    id: Date.now()
                  }];
                }
                setAnnotations(updated);
                saveAnnotationsToStorage(updated);
                onAnnotationsChange?.(updated);
              }}
              disabled={readOnly}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                annotations.some(anno => anno.type === 'blank_page' && anno.page === currentPage)
                  ? 'bg-red-600 text-white shadow-sm border border-red-700 animate-pulse'
                  : 'bg-white hover:bg-red-50 text-red-600 border border-red-200'
              }`}
              title="Mark page as blank (draws red diagonal line)"
            >
              <FileText size={16} /> Blank Page
            </button>

            <button onClick={clearCanvas} disabled={readOnly} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed" title="Clear Page"><RotateCcw size={16} /></button>
          </div>

          {/* Delete Selected Annotation Button */}
          {selectedAnno && (
            <div className="flex gap-1 items-center bg-red-50 px-2 py-1 rounded-lg border border-red-200 animate-in slide-in-from-right duration-200 ml-auto">
              <button
                onClick={() => {
                  const updated = annotations.filter(anno => anno.id !== selectedAnno.id);
                  setAnnotations(updated);
                  saveAnnotationsToStorage(updated);
                  onAnnotationsChange?.(updated);
                  setSelectedAnno(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shadow-sm text-xs"
                title="Delete Selected Annotation"
              >
                <Trash2 size={16} /> Delete Selected
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl border border-gray-200 w-96">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Add Feedback</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && addTextAnnotation()}
            />
            <div className="flex gap-2">
              <button onClick={addTextAnnotation} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">Add</button>
              <button onClick={() => setShowTextInput(false)} className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Entry Popup */}
      {showMarkPopup && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg border border-gray-300 shadow-xl w-80 animate-in zoom-in duration-150">
            <div className="bg-gray-50 p-3 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">Section:</p>
              <select 
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                className="w-full text-sm font-semibold p-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {sections.length > 0
                  ? sections.map((sec) => (
                      <option key={sec.id} value={sec.name}>{sec.name}</option>
                    ))
                  : <option value="">No sections</option>
                }
              </select>
            </div>
            
            {/* Skip Question Checkbox */}
            <div className="p-3 border-b border-gray-200 bg-orange-50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSkipped}
                  onChange={(e) => setIsSkipped(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-orange-900">Mark as Skipped</span>
              </label>
              <p className="text-xs text-orange-700 mt-1 ml-7">Question was not attempted by student</p>
            </div>

            {/* Marks Grid */}
            {!isSkipped && (
              <div className="p-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-4 gap-1">
                  {getMarkOptions().map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMarkInput(m.toString());
                        const finalAnno = { 
                          ...pendingAnno, 
                          marks: m,
                          stepName: stepName,
                          isSkipped: false,
                          type: m > 0 ? 'tick' : 'cross',
                          color: m > 0 ? '#00AA00' : '#FF0000'
                        };
                        const updated = [...annotations, finalAnno];
                        setAnnotations(updated);
                        saveAnnotationsToStorage(updated);
                        onAnnotationsChange?.(updated);
                        setPendingAnno(null);
                        setShowMarkPopup(false);
                        if (onNextQuestion) onNextQuestion();
                      }}
                      className="text-center py-2 hover:bg-blue-600 hover:text-white text-sm font-semibold border border-gray-200 rounded transition-colors"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-3 flex gap-2 border-t border-gray-200">
              {isSkipped ? (
                <button 
                  onClick={() => {
                    const finalAnno = { 
                      ...pendingAnno, 
                      marks: 0,
                      stepName: stepName,
                      isSkipped: true,
                      type: 'cross',
                      color: '#FF6B6B'
                    };
                    const updated = [...annotations, finalAnno];
                    setAnnotations(updated);
                    saveAnnotationsToStorage(updated);
                    onAnnotationsChange?.(updated);
                    setPendingAnno(null);
                    setShowMarkPopup(false);
                    setIsSkipped(false);
                    if (onNextQuestion) onNextQuestion();
                  }}
                  className="flex-1 text-sm bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors"
                >
                  Confirm Skip
                </button>
              ) : (
                <>
                  <input
                    type="number"
                    value={markInput}
                    onChange={(e) => setMarkInput(e.target.value)}
                    placeholder="Custom"
                    className="flex-1 text-sm p-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && submitMark()}
                  />
                  <button onClick={submitMark} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors">
                    Submit
                  </button>
                </>
              )}
              <button onClick={() => {setShowMarkPopup(false); setPendingAnno(null); setIsSkipped(false);}} className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg font-semibold transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-[400px]">
        <div
          className="bg-gray-100 overflow-auto flex-1 flex justify-center p-4"
          onMouseUp={handleTextSelection}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onContextMenu={handleContextMenu}
            className={`bg-white shadow-md rounded-lg ${tool === 'move' ? 'cursor-move' : 'cursor-crosshair'}`}
          />
        </div>

        {/* PDF Navigation */}
        {pdfPages.length > 0 && (
          <div className="flex items-center justify-center gap-4 p-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-gray-700">
              Page {currentPage + 1} of {pdfPages.length}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(pdfPages.length - 1, currentPage + 1))}
              disabled={currentPage === pdfPages.length - 1}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default PDFAnnotator;
