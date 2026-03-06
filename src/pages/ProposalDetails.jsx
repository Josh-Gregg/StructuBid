import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, Mail, Edit, ArrowLeft, PlusCircle, Download, FileText } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { computeTotals } from '../components/proposalUtils';
import Logo from '../components/Logo';
import 'react-quill/dist/quill.snow.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import htmlDocx from 'html-docx-js/dist/html-docx';

// ─────────────────────────────────────────────
// PaperSheet: one 8.5×11in page
// ─────────────────────────────────────────────
function PaperSheet({ children, hideHeaderFooter, proposal, sectionId }) {
  const pageStyle = {
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
    colorAdjust: 'exact',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
  };

  if (hideHeaderFooter) {
    return (
      <div className="print-page paper-sheet-screen bg-white mb-12 shrink-0 mx-auto" style={pageStyle} data-section={sectionId}>
        {children}
      </div>);

  }

  return (
    <div className="print-page paper-sheet-screen bg-white mb-12 shrink-0 mx-auto" style={pageStyle} data-section={sectionId}>
      











      <div className="paper-body" style={{ flex: 1, padding: '1in', overflow: 'hidden' }}>
        {children}
      </div>
    </div>);

}

function SectionTitle({ title }) {
  return (
    <h2 className="text-2xl font-black mb-4 pb-2 border-b-2" style={{ color: '#042950', borderColor: 'rgba(4,41,80,0.2)' }}>
      {title}
    </h2>);

}

function RichTextPages({ html, sectionTitle, proposal, sectionId, prefixContent }) {
  const [pages, setPages] = React.useState(null);
  const measureRef = React.useRef(null);

  const PAGE_BODY_HEIGHT = 700;
  const FIRST_PAGE_BODY = PAGE_BODY_HEIGHT;

  React.useEffect(() => {
    if (!measureRef.current || !html) return;
    const container = measureRef.current;
    const children = Array.from(container.childNodes);
    if (children.length === 0) {setPages([html]);return;}

    const result = [];
    let currentPageNodes = [];
    let currentHeight = 0;
    let availableHeight = FIRST_PAGE_BODY;

    children.forEach((node) => {
      const h = node.getBoundingClientRect?.()?.height || 24;
      if (currentHeight + h > availableHeight && currentPageNodes.length > 0) {
        const div = document.createElement('div');
        currentPageNodes.forEach((n) => div.appendChild(n.cloneNode(true)));
        result.push(div.innerHTML);
        currentPageNodes = [];
        currentHeight = 0;
        availableHeight = PAGE_BODY_HEIGHT;
      }
      currentPageNodes.push(node);
      currentHeight += h;
    });

    if (currentPageNodes.length > 0) {
      const div = document.createElement('div');
      currentPageNodes.forEach((n) => div.appendChild(n.cloneNode(true)));
      result.push(div.innerHTML);
    }
    setPages(result.length > 0 ? result : [html]);
  }, [html]);

  return (
    <>
      <div
        ref={measureRef}
        className="ql-editor ql-measure-hidden"
        style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: '6.5in', top: 0, left: 0, zIndex: -9999 }}
        dangerouslySetInnerHTML={{ __html: html }} />

      {(pages || [html]).map((pageHtml, idx) =>
      <PaperSheet key={idx} proposal={proposal} sectionId={sectionId}>
          {idx === 0 && prefixContent &&
        <div style={{ marginBottom: '20px', flexShrink: 0 }}>
              <SectionTitle title="Executive Summary" />
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontSize: '14px', marginBottom: '8px' }}>
                {prefixContent}
              </p>
              <div style={{ height: '1px', backgroundColor: 'rgba(4,41,80,0.1)', margin: '16px 0' }} />
            </div>
        }
          <SectionTitle title={idx === 0 ? sectionTitle : `${sectionTitle} (Cont.)`} />
          <div className="ql-editor p-0 text-gray-700 whitespace-normal" dangerouslySetInnerHTML={{ __html: pageHtml }} />
        </PaperSheet>
      )}
    </>);

}

const TABS = [
{ id: 'cover', label: 'Cover Page' },
{ id: 'scope', label: 'Scope of Work' },
{ id: 'estimate', label: 'Estimate' },
{ id: 'supporting', label: 'Supporting Docs' },
{ id: 'signatures', label: 'Signatures' }];


export default function ProposalDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');

  const [proposal, setProposal] = useState(null);
  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [newCO, setNewCO] = useState({ description: '', amount: 0 });
  const [isAddingCO, setIsAddingCO] = useState(false);
  const [activeTab, setActiveTab] = useState('cover');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    if (id) fetchProposal();
  }, [id]);

  const fetchProposal = () => {
    base44.entities.Proposal.get(id).then(setProposal);
  };

  const handlePrintSection = () => {
    const allPages = document.querySelectorAll('.print-page');
    allPages.forEach((p) => {
      const section = p.getAttribute('data-section');
      p.style.display = section === activeTab ? '' : 'none';
    });
    window.print();
    allPages.forEach((p) => {p.style.display = '';});
  };

  const [isGeneratingPDFs, setIsGeneratingPDFs] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);

  const stripHtml = (html) => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const handleExportWord = async () => {
    setIsGeneratingWord(true);
    try {
      const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const totals = computeTotals(proposal);

      const getDisplayCostLocal = (item) => {
        const itemSub = (item.quantity || 0) * (item.cost_per_unit || 0) * (1 + (item.markup_percentage || 0) / 100);
        if (item.exclude_from_markup) return itemSub;
        const dist = totals.totalLineItemsForMarkup > 0 ? totals.distMarkup / totals.totalLineItemsForMarkup : 0;
        return itemSub + dist;
      };

      const h = (tag, style, content) => `<${tag} style="${style}">${content}</${tag}>`;
      const hr = () => `<hr style="border:none;border-top:2px solid #042950;margin:12pt 0;" />`;

      let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; color: #111827; margin: 1in; }
          h1 { color: #042950; font-size: 20pt; font-weight: 900; border-bottom: 2px solid #042950; padding-bottom: 6pt; margin-top: 24pt; }
          h2 { color: #042950; font-size: 14pt; font-weight: 700; margin-top: 16pt; margin-bottom: 4pt; }
          table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 12pt; }
          th { background-color: #f3f4f6; text-align: left; padding: 6pt 8pt; font-weight: 600; border-bottom: 1px solid #d1d5db; }
          th.right, td.right { text-align: right; }
          td { padding: 5pt 8pt; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
          .cat-header { background-color: #f9fafb; font-weight: 700; font-size: 11pt; border: 1px solid #e5e7eb; }
          .totals-table { width: 40%; margin-left: auto; margin-top: 16pt; }
          .totals-table td { border-bottom: 1px solid #e5e7eb; padding: 4pt 8pt; }
          .grand-total td { font-weight: 900; font-size: 13pt; color: #042950; border-top: 2px solid #042950; }
          .label { font-size: 8pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin: 0 0 2pt 0; }
          .sig-table { width: 100%; margin-top: 60pt; }
          .sig-table td { padding: 0 20pt; width: 50%; vertical-align: top; }
          .sig-line { border-bottom: 1px solid #9ca3af; height: 40pt; margin-bottom: 4pt; }
          .note { font-size: 9pt; color: #6b7280; font-style: italic; }
          .page-break { page-break-after: always; }
        </style></head><body>`;

      // ── COVER ──
      html += `<div style="text-align:center; margin-bottom: 24pt;">
        <p style="font-size:10pt;color:#6b7280;margin:0 0 4pt 0;">Great White Construction &nbsp;|&nbsp; 2470 S Zephyr St, Lakewood, CO 80227 &nbsp;|&nbsp; 303-908-5421</p>
        <h1 style="font-size:28pt;font-weight:900;color:#042950;border:none;text-transform:uppercase;letter-spacing:-0.02em;margin:12pt 0;">${proposal.cover_title || 'Project Proposal'}</h1>
        ${hr()}
      </div>
      <table style="width:100%;border:none;font-size:11pt;">
        <tr>
          <td style="border:none;padding:0 20pt 0 0;vertical-align:top;width:50%;">
            <p class="label">Prepared For</p>
            <p style="font-size:14pt;font-weight:700;margin:0 0 4pt 0;">${proposal.client_name}</p>
            ${proposal.company_name ? `<p style="margin:0 0 4pt 0;">${proposal.company_name}</p>` : ''}
            <p class="label" style="margin-top:12pt;">Proposal Number</p>
            <p style="font-weight:600;color:#042950;margin:0;">#${proposal.project_number || ''}</p>
          </td>
          <td style="border:none;padding:0;vertical-align:top;width:50%;">
            <p class="label">Project Location</p>
            <p style="margin:0 0 12pt 0;">${proposal.project_address}</p>
            <p class="label">Date</p>
            <p style="margin:0;">${new Date(proposal.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </td>
        </tr>
      </table>`;

      // ── SCOPE ──
      if (proposal.executive_summary || proposal.scope_of_work) {
        html += `<div class="page-break"></div>`;
        if (proposal.executive_summary) {
          html += `<h1>Executive Summary</h1><p style="line-height:1.6;">${proposal.executive_summary.replace(/\n/g, '<br/>')}</p>`;
        }
        if (proposal.scope_of_work) {
          html += `<h1>Scope of Work</h1><div style="line-height:1.6;">${proposal.scope_of_work}</div>`;
        }
      }

      // ── ESTIMATE ──
      html += `<div class="page-break"></div><h1>Estimate</h1>`;
      if (proposal.categories?.length) {
        for (const cat of proposal.categories) {
          if (!cat.line_items?.length) continue;
          const catTotal = cat.line_items.reduce((sum, item) => sum + getDisplayCostLocal(item), 0);
          html += `<table>
            <tr><td class="cat-header" colspan="${proposal.hide_markups ? 2 : 4}" style="padding:6pt 8pt;">
              <span>${cat.name}</span>
              <span style="float:right;">$${fmt(catTotal)}</span>
            </td></tr>
            <tr>
              <th style="width:55%;">Description</th>
              <th class="right" style="width:15%;">Qty</th>
              ${!proposal.hide_markups ? `<th class="right" style="width:15%;">Unit Cost</th><th class="right" style="width:15%;">Total</th>` : ''}
            </tr>
            ${cat.line_items.map(item => {
              const cost = getDisplayCostLocal(item);
              return `<tr>
                <td>${item.description || ''}${item.show_note && item.note ? `<br/><span class="note">${item.note}</span>` : ''}</td>
                <td class="right">${item.quantity} ${item.unit || ''}</td>
                ${!proposal.hide_markups ? `<td class="right">$${fmt(cost / (item.quantity || 1))}</td><td class="right">$${fmt(cost)}</td>` : ''}
              </tr>`;
            }).join('')}
          </table>`;
        }
      }

      // Totals
      html += `<table class="totals-table">
        <tr><td>Subtotal</td><td class="right">$${fmt(totals.totalWithMarkup)}</td></tr>
        ${totals.discount > 0 ? `<tr><td>Discount</td><td class="right" style="color:#dc2626;">-$${fmt(totals.discount)}</td></tr>` : ''}
        <tr><td>Tax</td><td class="right">$${fmt(totals.tax || 0)}</td></tr>
        ${totals.contingency > 0 ? `<tr><td>Contingency (${proposal.contingency_percentage}%)</td><td class="right">$${fmt(totals.contingency)}</td></tr>` : ''}
        ${totals.changeOrdersTotal > 0 ? `<tr><td>Approved Change Orders</td><td class="right" style="color:#d97706;">$${fmt(totals.changeOrdersTotal)}</td></tr>` : ''}
        <tr class="grand-total"><td><strong>GRAND TOTAL</strong></td><td class="right"><strong>$${fmt(totals.grandTotal)}</strong></td></tr>
      </table>`;

      // ── SUPPORTING DOCS ──
      if (proposal.schedule_start_date || proposal.schedule_end_date || proposal.assumptions || proposal.attachments?.length) {
        html += `<div class="page-break"></div><h1>Supporting Documents</h1>`;
        if (proposal.schedule_start_date || proposal.schedule_end_date) {
          html += `<table style="width:auto;"><tr>`;
          if (proposal.schedule_start_date) html += `<td style="border:none;padding:0 40pt 0 0;"><p class="label">Target Start Date</p><p style="font-size:13pt;font-weight:500;margin:0;">${proposal.schedule_start_date}</p></td>`;
          if (proposal.schedule_end_date) html += `<td style="border:none;padding:0;"><p class="label">Target End Date</p><p style="font-size:13pt;font-weight:500;margin:0;">${proposal.schedule_end_date}</p></td>`;
          html += `</tr></table>`;
        }
        if (proposal.assumptions) {
          html += `<h2>Assumptions &amp; Exclusions</h2><div style="line-height:1.6;">${proposal.assumptions}</div>`;
        }
        if (proposal.attachments?.length) {
          html += `<h2>Attachments</h2>`;
          proposal.attachments.forEach(att => {
            html += `<p style="font-weight:700;font-size:12pt;color:#042950;margin:8pt 0 2pt 0;">${att.name}</p><p style="margin:0;">${att.description || ''}</p>`;
          });
        }
      }

      // ── SIGNATURES ──
      html += `<div class="page-break"></div><h1>Acceptance &amp; Signatures</h1>
        <table class="sig-table">
          <tr>
            <td>
              <div class="sig-line"></div>
              <p style="font-weight:700;margin:0;">George Gregg</p>
              <p style="color:#6b7280;font-size:10pt;margin:2pt 0 12pt 0;">Great White Construction</p>
              <p style="margin:0;">Date: _____________________</p>
            </td>
            <td>
              <div class="sig-line"></div>
              <p style="font-weight:700;margin:0;">${proposal.client_name}</p>
              <p style="color:#6b7280;font-size:10pt;margin:2pt 0 12pt 0;">Client</p>
              <p style="margin:0;">Date: _____________________</p>
            </td>
          </tr>
        </table>
        <p style="margin-top:24pt;font-size:10pt;color:#6b7280;">Upon signature, the client agrees to this proposal along with the terms, conditions for the proposal and to supply the first payment for the project.</p>`;

      html += `</body></html>`;

      const blob = htmlDocx.asBlob(html);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proposal.project_number || 'Proposal'}_Full_Proposal.docx`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } finally {
      setIsGeneratingWord(false);
    }
  };

  const handleExportAllPDFs = async () => {
    setIsGeneratingPDFs(true);
    const sectionIds = ['cover', 'scope', 'estimate', 'supporting', 'signatures'];
    const sectionLabels = {
      cover: 'Cover',
      scope: 'Scope_of_Work',
      estimate: 'Estimate',
      supporting: 'Supporting_Docs',
      signatures: 'Signatures',
    };

    // Letter page in points (1pt = 1/72 in): 8.5in × 11in
    const PDF_W_PT = 8.5 * 72;
    const PDF_H_PT = 11 * 72;

    for (const sectionId of sectionIds) {
      const pages = document.querySelectorAll(`.print-page[data-section="${sectionId}"]`);
      if (pages.length === 0) continue;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [PDF_W_PT, PDF_H_PT] });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        // Temporarily reveal hidden section wrappers
        const wrapper = page.closest('[data-section-wrapper]');
        const wrapperWasHidden = wrapper && wrapper.classList.contains('hidden');
        if (wrapperWasHidden) {
          wrapper.style.display = 'block';
          wrapper.style.visibility = 'visible';
        }

        // The page element is sized 8.5in on screen; use its actual rendered pixel size
        // and scale up to 3× for crisp text (equivalent to ~288 dpi)
        const SCALE = 3;
        const elW = page.offsetWidth;
        const elH = page.offsetHeight;

        const canvas = await html2canvas(page, {
          scale: SCALE,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: elW,
          height: elH,
          windowWidth: elW,
          windowHeight: elH,
          logging: false,
        });

        if (wrapperWasHidden) {
          wrapper.style.display = '';
          wrapper.style.visibility = '';
        }

        if (i > 0) pdf.addPage([PDF_W_PT, PDF_H_PT]);

        // Place image to fill exactly one letter page (no scaling artifacts)
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, PDF_W_PT, PDF_H_PT, '', 'FAST');
      }

      const filename = `${proposal.project_number || 'Proposal'}_${sectionLabels[sectionId]}.pdf`;
      pdf.save(filename);
      await new Promise(r => setTimeout(r, 400));
    }

    setIsGeneratingPDFs(false);
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      const link = window.location.origin + createPageUrl(`ProposalDetails?id=${id}`);
      const body = `Hello ${proposal.client_name},\n\nYour proposal for ${proposal.project_address} is ready.\n\nPlease review it here: ${link}\n\nThank you,\nGreat White Construction`;
      await base44.integrations.Core.SendEmail({
        to: proposal.client_email,
        subject: `Proposal from Great White Construction: ${proposal.project_number}`,
        body,
        from_name: 'Great White Construction'
      });
      await base44.entities.Proposal.update(id, { status: 'sent' });
      alert('Proposal sent successfully!');
      fetchProposal();
    } catch (e) {
      alert('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (status) => {
    await base44.entities.Proposal.update(id, { status });
    fetchProposal();
  };

  const handleAddCO = async () => {
    if (!newCO.description || !newCO.amount) return;
    const cos = [...(proposal.change_orders || []), newCO];
    await base44.entities.Proposal.update(id, { change_orders: cos });
    setNewCO({ description: '', amount: 0 });
    setIsAddingCO(false);
    fetchProposal();
  };

  if (!proposal || !user) return <div className="p-8">Loading...</div>;

  const totals = computeTotals(proposal);

  const getDisplayCost = (item) => {
    const itemSub = (item.quantity || 0) * (item.cost_per_unit || 0) * (1 + (item.markup_percentage || 0) / 100);
    if (item.exclude_from_markup) return itemSub;
    const itemDistMarkup = totals.totalLineItemsForMarkup > 0 ? totals.distMarkup / totals.totalLineItemsForMarkup : 0;
    return itemSub + itemDistMarkup;
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.toLowerCase() === 'tbd') return 'TBD';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
  };

  const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const PAGE_HEIGHT_PX = 760;
  const TITLE_HEIGHT = 44;
  const TOTALS_HEIGHT = 240;
  const CATEGORY_HEIGHT = 92;
  const ITEM_HEIGHT = 52;
  const ITEM_WITH_NOTE_HEIGHT = 100;

  const estimatePages = [];
  let currentPageItems = [];
  let usedHeight = TITLE_HEIGHT;

  const flushPage = () => {
    estimatePages.push(currentPageItems);
    currentPageItems = [];
    usedHeight = TITLE_HEIGHT;
  };

  if (proposal.categories) {
    proposal.categories.forEach((cat) => {
      if (!cat.line_items?.length) return;
      if (usedHeight + CATEGORY_HEIGHT + ITEM_HEIGHT > PAGE_HEIGHT_PX) {
        flushPage();
      }
      currentPageItems.push({ type: 'category', data: cat });
      usedHeight += CATEGORY_HEIGHT;

      cat.line_items.forEach((item) => {
        const itemH = item.show_note && item.note ? ITEM_WITH_NOTE_HEIGHT : ITEM_HEIGHT;
        if (usedHeight + itemH > PAGE_HEIGHT_PX) {
          flushPage();
          currentPageItems.push({ type: 'category-continued', data: cat });
          usedHeight += CATEGORY_HEIGHT;
        }
        currentPageItems.push({ type: 'item', data: item, category: cat });
        usedHeight += itemH;
      });
    });
  }

  if (usedHeight + TOTALS_HEIGHT > PAGE_HEIGHT_PX) {
    flushPage();
  }
  currentPageItems.push({ type: 'totals' });
  estimatePages.push(currentPageItems);

  return (
    <div className="w-full mx-auto animate-in fade-in">

      {/* ── Action Bar ── */}
      <div className="max-w-5xl mx-auto print:hidden">
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 sticky top-4 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-gray-900">{proposal.project_number}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
              proposal.status === 'accepted' ? 'bg-green-100 text-green-800' :
              proposal.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              proposal.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'}`
              }>
                {proposal.status || 'draft'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {user.role !== 'client' &&
            <>
                <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl(`ProposalForm?id=${id}`))}>
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleSendEmail} disabled={isSending}>
                  <Mail className="w-4 h-4 mr-1" /> {isSending ? 'Sending...' : 'Send'}
                </Button>
              </>
            }
            {user.role === 'client' && proposal.status === 'sent' &&
            <>
                <Button variant="destructive" size="sm" onClick={() => handleStatusChange('rejected')}>Reject</Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange('accepted')}>Accept</Button>
              </>
            }
            <Button size="sm" variant="outline" onClick={handlePrintSection} className="border-blue-200 text-blue-700">
              <Printer className="w-4 h-4 mr-1" /> Print This Section
            </Button>
            <Button size="sm" onClick={handleExportAllPDFs} disabled={isGeneratingPDFs} className="bg-blue-700 hover:bg-blue-800 text-white shadow-md">
              <Download className="w-4 h-4 mr-1" /> {isGeneratingPDFs ? 'Generating...' : 'Export All PDFs'}
            </Button>
            <Button size="sm" onClick={handleExportWord} disabled={isGeneratingWord} variant="outline" className="border-blue-200 text-blue-700">
              <FileText className="w-4 h-4 mr-1" /> {isGeneratingWord ? 'Generating...' : 'Export Word'}
            </Button>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 mb-6">
          {TABS.map((tab) =>
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === tab.id ?
            'bg-[#042950] text-white shadow-sm' :
            'text-gray-600 hover:bg-gray-100'}`
            }>

              {tab.label}
            </button>
          )}
        </div>

        {/* Change Orders panel */}
        {user.role !== 'client' && activeTab === 'estimate' &&
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Change Orders</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingCO(!isAddingCO)} className="text-[#042950] font-bold">
                <PlusCircle className="w-4 h-4 mr-2" /> Add CO
              </Button>
            </div>
            {isAddingCO &&
          <div className="flex items-center gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                <input
              className="flex-1 px-3 py-2 rounded-md border border-gray-300"
              placeholder="Description"
              value={newCO.description}
              onChange={(e) => setNewCO({ ...newCO, description: e.target.value })} />

                <input
              type="number"
              className="w-32 px-3 py-2 rounded-md border border-gray-300 text-right"
              placeholder="Amount"
              value={newCO.amount}
              onChange={(e) => setNewCO({ ...newCO, amount: parseFloat(e.target.value) || 0 })} />

                <Button onClick={handleAddCO} className="bg-blue-600 text-white">Add</Button>
              </div>
          }
            {proposal.change_orders?.length > 0 ?
          <div className="space-y-2">
                {proposal.change_orders.map((co, i) =>
            <div key={i} className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
                    <span className="font-medium text-gray-700">{co.description}</span>
                    <span className="font-bold">${co.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
            )}
              </div> :

          <p className="text-sm text-gray-500 italic">No change orders yet.</p>
          }
          </div>
        }
      </div>

      {/* ════════════════════════════════════════════════════
           PRINTABLE PROPOSAL
           ════════════════════════════════════════════════════ */}
      <div id="printable-proposal" className="w-full flex flex-col items-center bg-gray-200/50 rounded-2xl py-12 text-gray-900">

        {/* ── COVER PAGE ── */}
        <div className={activeTab === 'cover' ? '' : 'print:block hidden'} style={{}} data-section-wrapper="cover">
          <PaperSheet hideHeaderFooter proposal={proposal} sectionId="cover">
            <div style={{
              flex: 1,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              padding: '0.75in',
              overflow: 'hidden'
            }}>

              {/* Logo + contact */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <Logo imageClassName="h-40 object-contain" />
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#4b5563', lineHeight: '1.5' }}>
                  <p style={{ fontWeight: 'bold', color: '#111827', margin: '0 0 1px 0' }}>Great White Construction</p>
                  <p style={{ margin: '0 0 1px 0' }}>2470 S Zephyr St</p>
                  <p style={{ margin: '0 0 1px 0' }}>Lakewood, CO 80227</p>
                  <p style={{ margin: '0 0 1px 0' }}>303-908-5421</p>
                  <p style={{ margin: 0 }}>George@GreatWhiteGC.com</p>
                </div>
              </div>

              {/* Title + photo */}
              <div style={{ marginTop: '12px', flexShrink: 0 }}>
                <h1 style={{ color: '#042950', fontSize: '44px', fontWeight: 900, lineHeight: 1, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '-0.02em', margin: 0 }}>
                  {proposal.cover_title || 'Project Proposal'}
                </h1>
                {proposal.cover_photo_url &&
                <div style={{ marginTop: '12px', width: '100%', borderRadius: '10px', overflow: 'hidden', height: '3in', flexShrink: 0 }}>
                    <img src={proposal.cover_photo_url} alt="Project Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                }
              </div>

              {/* Spacer */}
              <div style={{ flex: 1, minHeight: '24px' }} />

              {/* Divider */}
              <div style={{ height: '2px', backgroundColor: '#042950', marginBottom: '10px', flexShrink: 0 }} />

              {/* Client info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold', margin: '0 0 3px 0' }}>Prepared For</p>
                  <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827', margin: '0 0 2px 0' }}>{proposal.client_name}</p>
                  {proposal.company_name && <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 2px 0' }}>{proposal.company_name}</p>}
                  <div style={{ marginTop: '6px' }}>
                    <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold', margin: '0 0 3px 0' }}>Proposal Number</p>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#042950', margin: 0 }}>#{proposal.project_number}</p>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold', margin: '0 0 3px 0' }}>Project Location</p>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: '#111827', margin: '0 0 6px 0' }}>{proposal.project_address}</p>
                  <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold', margin: '0 0 3px 0' }}>Date</p>
                  <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>
                    {new Date(proposal.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

            </div>
          </PaperSheet>
        </div>

        {/* ── SCOPE OF WORK ── */}
        <div className={activeTab === 'scope' ? '' : 'hidden print:block'} data-section-wrapper="scope">
          {proposal.scope_of_work ?
          <RichTextPages
            html={proposal.scope_of_work}
            sectionTitle="Scope of Work"
            proposal={proposal}
            sectionId="scope"
            prefixContent={proposal.executive_summary || null} /> :

          proposal.executive_summary ?
          <PaperSheet proposal={proposal} sectionId="scope">
              <SectionTitle title="Executive Summary" />
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{proposal.executive_summary}</p>
            </PaperSheet> :

          <div className="text-center text-gray-400 py-16 print:hidden">
              <p className="text-lg font-medium">No scope of work added yet.</p>
            </div>
          }
        </div>

        {/* ── ESTIMATE PAGES ── */}
        <div className={activeTab === 'estimate' ? '' : 'hidden print:block'} data-section-wrapper="estimate">
          {estimatePages.map((pageItems, pageIndex) =>
          <PaperSheet key={`est-${pageIndex}`} hideHeaderFooter proposal={proposal} sectionId="estimate">
              <div className="estimate-content" style={{ padding: '1in', height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                <h2 className="text-2xl font-black mb-4 pb-2 border-b-2" style={{ color: '#042950', borderColor: 'rgba(4,41,80,0.2)' }}>
                  Estimate {pageIndex > 0 ? '(Cont.)' : ''}
                </h2>
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    {pageItems.map((pi, i) => {
                    if (pi.type === 'category' || pi.type === 'category-continued') {
                      const cat = pi.data;
                      const catTotal = cat.line_items.reduce((sum, item) => sum + getDisplayCost(item), 0);
                      return (
                        <React.Fragment key={i}>
                            <tr>
                              <td colSpan={proposal.hide_markups ? 2 : 4} className="pt-5 pb-1">
                                <div className="p-3 border border-gray-200 flex justify-between font-bold text-base text-gray-900" style={{ backgroundColor: '#f9fafb' }}>
                                  <span>{cat.name} {pi.type === 'category-continued' ? '(Cont.)' : ''}</span>
                                  <span>${fmt(catTotal)}</span>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                              <th className="py-2 px-3 text-left font-semibold">Description</th>
                              <th className="py-2 px-3 text-right font-semibold w-24">Qty</th>
                              {!proposal.hide_markups &&
                            <>
                                  <th className="py-2 px-3 text-right font-semibold w-24">Unit Cost</th>
                                  <th className="py-2 px-3 text-right font-semibold w-32">Total</th>
                                </>
                            }
                            </tr>
                          </React.Fragment>);

                    }
                    if (pi.type === 'item') {
                      const item = pi.data;
                      return (
                        <tr key={i} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-gray-800 align-top">
                              <div>{item.description}</div>
                              {item.show_note && item.note && <div className="text-xs text-gray-500 mt-1 italic">{item.note}</div>}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-600 align-top">{item.quantity} {item.unit}</td>
                            {!proposal.hide_markups &&
                          <>
                                <td className="py-2 px-3 text-right text-gray-600 align-top">${fmt(getDisplayCost(item) / (item.quantity || 1))}</td>
                                <td className="py-2 px-3 text-right font-medium text-gray-900 align-top">${fmt(getDisplayCost(item))}</td>
                              </>
                          }
                          </tr>);

                    }
                    if (pi.type === 'totals') {
                      return (
                        <tr key={i}>
                            <td colSpan={proposal.hide_markups ? 2 : 4} className="pt-10">
                              <div className="flex justify-end">
                                <div className="w-full max-w-xs space-y-3">
                                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${fmt(totals.totalWithMarkup)}</span></div>
                                  <div className={`flex justify-between ${totals.discount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                    <span>Discount</span><span>-${fmt(totals.discount || 0)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-600"><span>Tax</span><span>${fmt(totals.tax || 0)}</span></div>
                                  {totals.contingency > 0 &&
                                <div className="flex justify-between text-gray-600">
                                      <span>Contingency ({proposal.contingency_percentage}%)</span><span>${fmt(totals.contingency)}</span>
                                    </div>
                                }
                                  {totals.changeOrdersTotal > 0 &&
                                <div className="flex justify-between text-orange-600 font-medium pt-2 border-t border-gray-100">
                                      <span>Approved Change Orders</span><span>${fmt(totals.changeOrdersTotal)}</span>
                                    </div>
                                }
                                  <div className="flex justify-between text-xl font-black pt-4 border-t-2 border-gray-900" style={{ color: '#042950' }}>
                                    <span>Grand Total</span><span>${fmt(totals.grandTotal)}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>);

                    }
                    return null;
                  })}
                  </tbody>
                </table>
              </div>
            </PaperSheet>
          )}
        </div>

        {/* ── SUPPORTING DOCS ── */}
        <div className={activeTab === 'supporting' ? '' : 'hidden print:block'} data-section-wrapper="supporting">
          {(proposal.schedule_start_date || proposal.schedule_end_date) &&
          <PaperSheet proposal={proposal} sectionId="supporting">
              <SectionTitle title="Schedule" />
              <div className="flex gap-12 mt-4">
                {proposal.schedule_start_date &&
              <div>
                    <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Target Start Date</p>
                    <p className="text-lg font-medium">{formatDateString(proposal.schedule_start_date)}</p>
                  </div>
              }
                {proposal.schedule_end_date &&
              <div>
                    <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Target End Date</p>
                    <p className="text-lg font-medium">{formatDateString(proposal.schedule_end_date)}</p>
                  </div>
              }
              </div>
            </PaperSheet>
          }

          {proposal.assumptions &&
          <RichTextPages html={proposal.assumptions} sectionTitle="Assumptions & Exclusions" proposal={proposal} sectionId="supporting" />
          }

          {proposal.attachments?.length > 0 &&
          <PaperSheet proposal={proposal} sectionId="supporting">
              <SectionTitle title="Attachments" />
              <div className="space-y-4">
                {proposal.attachments.map((att, idx) =>
              <div key={idx}>
                    <p className="font-bold text-lg" style={{ color: '#042950' }}>{att.name}</p>
                    <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{att.description}</p>
                  </div>
              )}
              </div>
            </PaperSheet>
          }

          {!proposal.schedule_start_date && !proposal.schedule_end_date && !proposal.assumptions && !proposal.attachments?.length &&
          <div className="text-center text-gray-400 py-16 print:hidden">
              <p className="text-lg font-medium">No supporting documents added yet.</p>
              <p className="text-sm mt-1">Add a schedule, assumptions, or attachments in the proposal editor.</p>
            </div>
          }
        </div>

        {/* ── SIGNATURES PAGE ── */}
        <div className={activeTab === 'signatures' ? '' : 'hidden print:block'} data-section-wrapper="signatures">
          <PaperSheet proposal={proposal} sectionId="signatures">
            <div className="mt-auto pt-6">
              <SectionTitle title="Acceptance & Signatures" />
              <div className="grid grid-cols-2 gap-16 mt-8">
                <div>
                  <div className="border-b border-gray-400 h-10 mb-2" />
                  <p className="text-[10px] text-gray-400 italic mb-1">(Contractor Signature)</p>
                  <p className="text-sm font-bold text-gray-900">George Gregg</p>
                  <p className="text-xs text-gray-500">Great White Construction</p>
                  <div className="flex gap-2 mt-4 text-sm text-gray-500">
                    <span className="w-8">Date:</span>
                    <div className="border-b border-gray-400 flex-1" />
                  </div>
                </div>
                <div>
                  <div className="border-b border-gray-400 h-10 mb-2" />
                  <p className="text-[10px] text-gray-400 italic mb-1">(Client Signature)</p>
                  <p className="text-sm font-bold text-gray-900">{proposal.client_name}</p>
                  <p className="text-xs text-gray-500">Client</p>
                  <div className="flex gap-2 mt-4 text-sm text-gray-500">
                    <span className="w-8">Date:</span>
                    <div className="border-b border-gray-400 flex-1" />
                  </div>
                </div>
              </div>

              {user.role === 'client' && proposal.status === 'sent' &&
              <div className="mt-12 text-center print:hidden">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold px-12" onClick={() => handleStatusChange('accepted')}>
                    Click Here to Digitally Accept
                  </Button>
                </div>
              }

              <p className="mt-6 text-sm text-gray-500">
                Upon signature, the client agrees to this proposal along with the terms, conditions for the proposal and to supply the first payment for the project.
              </p>
            </div>
          </PaperSheet>
        </div>

      </div>
    </div>);

}