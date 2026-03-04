import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, Mail, Edit, ArrowLeft, PlusCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { computeTotals } from '../components/proposalUtils';
import Logo from '../components/Logo';
import 'react-quill/dist/quill.snow.css';

// ─────────────────────────────────────────────
// PaperSheet: one 8.5×11in page
// ─────────────────────────────────────────────
function PaperSheet({ children, hideHeaderFooter, proposal }) {
  const exactPage = {
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
    colorAdjust: 'exact',
    width: '8.5in',
    height: '11in',
    overflow: 'hidden',
    boxSizing: 'border-box',
  };

  if (hideHeaderFooter) {
    return (
      <div
        className="print-page bg-white shadow-xl mb-12 shrink-0 mx-auto"
        style={exactPage}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className="print-page bg-white shadow-xl mb-12 shrink-0 mx-auto flex flex-col"
      style={exactPage}
    >
      {/* Header — always at the very top */}
      <div
        className="shrink-0 flex items-center justify-between px-16"
        style={{ backgroundColor: '#042950', color: 'white', height: '1in', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <h2 className="text-xl font-bold tracking-wider uppercase" style={{ color: 'white' }}>
          Great White Construction
        </h2>
        <div className="text-right">
          <div className="font-bold text-sm" style={{ color: 'white' }}>{proposal.client_name}</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>#{proposal.project_number}</div>
        </div>
      </div>

      {/* Body */}
      <div className="px-16 pt-8 pb-8">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SectionTitle: simple bold heading with underline
// ─────────────────────────────────────────────
function SectionTitle({ title }) {
  return (
    <h2
      className="text-2xl font-black mb-4 pb-2 border-b-2"
      style={{ color: '#042950', borderColor: 'rgba(4,41,80,0.2)' }}
    >
      {title}
    </h2>
  );
}

// ─────────────────────────────────────────────
// RichTextPages: splits rich HTML content across
// multiple PaperSheet pages with "Cont." headings.
// Uses a hidden measuring div to compute splits.
// ─────────────────────────────────────────────
function RichTextPages({ html, sectionTitle, proposal, pageCounterRef }) {
  const [pages, setPages] = React.useState(null);
  const measureRef = React.useRef(null);

  // 96 DPI: 8.5in wide, 11in tall page
  // Header = 96px, body padding top+bottom = 64px each = 128px
  const PAGE_BODY_HEIGHT = Math.floor(11 * 96) - 96 - 128; // ~932px usable
  // First page also has the SectionTitle (~60px)
  const FIRST_PAGE_BODY = PAGE_BODY_HEIGHT - 60;

  React.useEffect(() => {
    if (!measureRef.current || !html) return;

    const container = measureRef.current;
    // Get all child nodes
    const children = Array.from(container.childNodes);
    if (children.length === 0) {
      setPages([html]);
      return;
    }

    const result = [];
    let currentPageNodes = [];
    let currentHeight = 0;
    let availableHeight = FIRST_PAGE_BODY;

    children.forEach((node) => {
      const h = node.getBoundingClientRect?.()?.height || 24;
      if (currentHeight + h > availableHeight && currentPageNodes.length > 0) {
        // Save current page
        const div = document.createElement('div');
        currentPageNodes.forEach(n => div.appendChild(n.cloneNode(true)));
        result.push(div.innerHTML);
        currentPageNodes = [];
        currentHeight = 0;
        availableHeight = PAGE_BODY_HEIGHT; // subsequent pages have no title offset
      }
      currentPageNodes.push(node);
      currentHeight += h;
    });

    if (currentPageNodes.length > 0) {
      const div = document.createElement('div');
      currentPageNodes.forEach(n => div.appendChild(n.cloneNode(true)));
      result.push(div.innerHTML);
    }

    setPages(result.length > 0 ? result : [html]);
  }, [html]);

  return (
    <>
      {/* Hidden measuring container */}
      <div
        ref={measureRef}
        className="ql-editor"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          width: `calc(8.5in - 8rem)`, // matches px-16 padding
          top: 0,
          left: 0,
          zIndex: -9999,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Render pages once measured, fall back to single page */}
      {(pages || [html]).map((pageHtml, idx) => (
        <PaperSheet
          key={idx}
          proposal={proposal}
        >
          <SectionTitle title={idx === 0 ? sectionTitle : `${sectionTitle} (Cont.)`} />
          <div
            className="ql-editor p-0 text-gray-700 whitespace-normal"
            dangerouslySetInnerHTML={{ __html: pageHtml }}
          />
        </PaperSheet>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
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

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    if (id) fetchProposal();
  }, [id]);

  const fetchProposal = () => {
    base44.entities.Proposal.get(id).then(setProposal);
  };

  const handlePrint = () => {
    window.print();
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
        from_name: 'Great White Construction',
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
  const totalLineItems =
    proposal.categories?.reduce((acc, cat) => acc + (cat.line_items?.length || 0), 0) || 0;

  const getDisplayCost = (item) => {
    const itemSub =
      (item.quantity || 0) * (item.cost_per_unit || 0) * (1 + (item.markup_percentage || 0) / 100);
    if (item.exclude_from_markup) return itemSub;
    const itemDistMarkup =
      totals.totalLineItemsForMarkup > 0 ? totals.distMarkup / totals.totalLineItemsForMarkup : 0;
    return itemSub + itemDistMarkup;
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.toLowerCase() === 'tbd') return 'TBD';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
  };

  const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Pagination logic for Estimate pages ──────────────────
  const estimatePages = [];
  let currentPageItems = [];
  let currentLines = 0;
  const MAX_LINES_PER_PAGE = 22;

  if (proposal.categories) {
    proposal.categories.forEach((cat) => {
      if (!cat.line_items?.length) return;

      if (currentLines + 3 > MAX_LINES_PER_PAGE) {
        estimatePages.push(currentPageItems);
        currentPageItems = [];
        currentLines = 0;
      }

      currentPageItems.push({ type: 'category', data: cat });
      currentLines += 2;

      cat.line_items.forEach((item) => {
        const itemLines = item.show_note && item.note ? 2 : 1;
        if (currentLines + itemLines > MAX_LINES_PER_PAGE) {
          estimatePages.push(currentPageItems);
          currentPageItems = [];
          currentLines = 0;
          currentPageItems.push({ type: 'category-continued', data: cat });
          currentLines += 2;
        }
        currentPageItems.push({ type: 'item', data: item, category: cat });
        currentLines += itemLines;
      });
    });
  }

  // Put totals on a new page if not enough room
  if (currentLines + 8 > MAX_LINES_PER_PAGE) {
    estimatePages.push(currentPageItems);
    currentPageItems = [];
  }
  currentPageItems.push({ type: 'totals' });
  estimatePages.push(currentPageItems);

  const totalPages = 1 + 1 + estimatePages.length + 1; // Cover + Details + Estimates + Signatures

  return (
    <div className="w-full mx-auto animate-in fade-in">

      {/* ── Action Bar (screen only) ───────────────────────── */}
      <div className="max-w-5xl mx-auto print:hidden">
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 sticky top-4 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-gray-900">{proposal.project_number}</h1>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                  proposal.status === 'accepted'
                    ? 'bg-green-100 text-green-800'
                    : proposal.status === 'sent'
                    ? 'bg-blue-100 text-blue-800'
                    : proposal.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {proposal.status || 'draft'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user.role !== 'client' && (
              <>
                <Button variant="outline" onClick={() => navigate(createPageUrl(`ProposalForm?id=${id}`))}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" onClick={handleSendEmail} disabled={isSending}>
                  <Mail className="w-4 h-4 mr-2" /> {isSending ? 'Sending...' : 'Send to Client'}
                </Button>
              </>
            )}
            {user.role === 'client' && proposal.status === 'sent' && (
              <>
                <Button variant="destructive" onClick={() => handleStatusChange('rejected')}>
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleStatusChange('accepted')}
                >
                  Accept Proposal
                </Button>
              </>
            )}
            <Button onClick={handlePrint} className="bg-blue-700 hover:bg-blue-800 text-white shadow-md">
              <Printer className="w-4 h-4 mr-2" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Change Orders panel (screen only) */}
        {user.role !== 'client' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Change Orders</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingCO(!isAddingCO)}
                className="text-[#042950] font-bold"
              >
                <PlusCircle className="w-4 h-4 mr-2" /> Add CO
              </Button>
            </div>

            {isAddingCO && (
              <div className="flex items-center gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                <input
                  className="flex-1 px-3 py-2 rounded-md border border-gray-300"
                  placeholder="Description"
                  value={newCO.description}
                  onChange={(e) => setNewCO({ ...newCO, description: e.target.value })}
                />
                <input
                  type="number"
                  className="w-32 px-3 py-2 rounded-md border border-gray-300 text-right"
                  placeholder="Amount"
                  value={newCO.amount}
                  onChange={(e) => setNewCO({ ...newCO, amount: parseFloat(e.target.value) || 0 })}
                />
                <Button onClick={handleAddCO} className="bg-blue-600 text-white">
                  Add
                </Button>
              </div>
            )}

            {proposal.change_orders?.length > 0 ? (
              <div className="space-y-2">
                {proposal.change_orders.map((co, i) => (
                  <div
                    key={i}
                    className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm border border-gray-100"
                  >
                    <span className="font-medium text-gray-700">{co.description}</span>
                    <span className="font-bold">${co.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No change orders yet.</p>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
          PRINTABLE PROPOSAL — each PaperSheet = one PDF page
          ════════════════════════════════════════════════════ */}
      <div
        id="printable-proposal"
        className="w-full flex flex-col items-center bg-gray-200/50 rounded-2xl py-12 text-gray-900"
      >

        {/* ── PAGE 1: Cover ─────────────────────────────────── */}
        <PaperSheet hideHeaderFooter proposal={proposal}>
          <div className="flex flex-col p-12" style={{ height: '11in', overflow: 'hidden', boxSizing: 'border-box' }}>

            {/* Logo + contact */}
            <header className="flex justify-between items-start mb-8">
              <Logo imageClassName="h-28 object-contain" />
              <div className="text-right text-sm text-gray-600 space-y-1">
                <p className="font-bold text-gray-900">Great White Construction</p>
                <p>2470 S Zephyr St</p>
                <p>Lakewood, CO 80227</p>
                <p>303-908-5421</p>
                <p>George@GreatWhiteGC.com</p>
              </div>
            </header>

            {/* Title */}
            <div className="mb-6">
              <div className="uppercase tracking-widest font-bold text-sm mb-2" style={{ color: '#042950' }}>
                {proposal.cover_title || 'Project Proposal'}
              </div>
              <h1 className="text-5xl font-black leading-tight" style={{ color: '#042950' }}>
                {proposal.cover_subtitle || proposal.project_type?.replace(/_/g, ' ')}
              </h1>
            </div>

            {/* Cover photo */}
            {proposal.cover_photo_url && (
              <div className="mb-8 w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200" style={{ height: '3.5in' }}>
                <img src={proposal.cover_photo_url} alt="Project Cover" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Client info grid */}
            <div className="grid grid-cols-2 gap-8 mt-auto">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Prepared For</p>
                <p className="text-xl font-bold">{proposal.client_name}</p>
                {proposal.company_name && <p className="text-gray-700">{proposal.company_name}</p>}
                <p className="text-gray-600">{proposal.client_address}</p>
                <div className="mt-4">
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Proposal Number</p>
                  <p className="font-medium" style={{ color: '#042950' }}>#{proposal.project_number}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Project Location</p>
                <p className="text-lg font-medium">{proposal.project_address}</p>
                <div className="mt-4">
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Date</p>
                  <p className="font-medium">
                    {new Date(proposal.created_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </PaperSheet>

        {/* ── PAGE 2: Executive Summary ── */}
        {proposal.executive_summary && (
          <PaperSheet proposal={proposal}>
            <SectionTitle title="Executive Summary" />
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {proposal.executive_summary}
            </p>
          </PaperSheet>
        )}

        {/* ── Scope of Work — auto-split across pages with Cont. heading ── */}
        <RichTextPages
          html={proposal.scope_of_work}
          sectionTitle="Scope of Work"
          proposal={proposal}
        />

        {/* ── ESTIMATE PAGES ────────────────────────────────── */}
        {estimatePages.map((pageItems, pageIndex) => (
          <PaperSheet
            key={`est-${pageIndex}`}
            proposal={proposal}
          >
            <div className="flex-1">
              <h2
                className="text-2xl font-black mb-4 pb-2 border-b-2"
                style={{ color: '#042950', borderColor: 'rgba(4,41,80,0.2)' }}
              >
                Estimate {pageIndex > 0 ? '(Cont.)' : ''}
              </h2>

              <table className="w-full text-sm border-collapse">
                <tbody>
                  {pageItems.map((pi, i) => {
                    if (pi.type === 'category' || pi.type === 'category-continued') {
                      const cat = pi.data;
                      const catTotal = cat.line_items.reduce(
                        (sum, item) => sum + getDisplayCost(item),
                        0
                      );
                      return (
                        <React.Fragment key={i}>
                          <tr>
                            <td colSpan={proposal.hide_markups ? 2 : 4} className="pt-5 pb-1">
                              <div
                                className="p-3 border border-gray-200 flex justify-between font-bold text-base text-gray-900"
                                style={{ backgroundColor: '#f9fafb' }}
                              >
                                <span>
                                  {cat.name} {pi.type === 'category-continued' ? '(Cont.)' : ''}
                                </span>
                                <span>${fmt(catTotal)}</span>
                              </div>
                            </td>
                          </tr>
                          <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                            <th className="py-2 px-3 text-left font-semibold">Description</th>
                            <th className="py-2 px-3 text-right font-semibold w-24">Qty</th>
                            {!proposal.hide_markups && (
                              <>
                                <th className="py-2 px-3 text-right font-semibold w-24">Unit Cost</th>
                                <th className="py-2 px-3 text-right font-semibold w-32">Total</th>
                              </>
                            )}
                          </tr>
                        </React.Fragment>
                      );
                    }

                    if (pi.type === 'item') {
                      const item = pi.data;
                      return (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-800 align-top">
                            <div>{item.description}</div>
                            {item.show_note && item.note && (
                              <div className="text-xs text-gray-500 mt-1 italic">{item.note}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-600 align-top">
                            {item.quantity} {item.unit}
                          </td>
                          {!proposal.hide_markups && (
                            <>
                              <td className="py-2 px-3 text-right text-gray-600 align-top">
                                ${fmt(getDisplayCost(item) / (item.quantity || 1))}
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-gray-900 align-top">
                                ${fmt(getDisplayCost(item))}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    }

                    if (pi.type === 'totals') {
                      return (
                        <tr key={i}>
                          <td colSpan={proposal.hide_markups ? 2 : 4} className="pt-10">
                            <div className="flex justify-end">
                              <div className="w-full max-w-xs space-y-3">
                                <div className="flex justify-between text-gray-600">
                                  <span>Subtotal</span>
                                  <span>${fmt(totals.totalWithMarkup)}</span>
                                </div>

                                <div
                                  className={`flex justify-between ${
                                    totals.discount > 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}
                                >
                                  <span>Discount</span>
                                  <span>-${fmt(totals.discount || 0)}</span>
                                </div>

                                <div className="flex justify-between text-gray-600">
                                  <span>Tax</span>
                                  <span>${fmt(totals.tax || 0)}</span>
                                </div>

                                {totals.contingency > 0 && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>Contingency ({proposal.contingency_percentage}%)</span>
                                    <span>${fmt(totals.contingency)}</span>
                                  </div>
                                )}

                                {totals.changeOrdersTotal > 0 && (
                                  <div className="flex justify-between text-orange-600 font-medium pt-2 border-t border-gray-100">
                                    <span>Approved Change Orders</span>
                                    <span>${fmt(totals.changeOrdersTotal)}</span>
                                  </div>
                                )}

                                <div
                                  className="flex justify-between text-xl font-black pt-4 border-t-2 border-gray-900"
                                  style={{ color: '#042950' }}
                                >
                                  <span>Grand Total</span>
                                  <span>${fmt(totals.grandTotal)}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return null;
                  })}
                </tbody>
              </table>
            </div>
          </PaperSheet>
        ))}

        {/* ── Schedule (after estimate) ─────────────────────── */}
        {(proposal.schedule_start_date || proposal.schedule_end_date) && (
          <PaperSheet
            proposal={proposal}
          >
            <SectionTitle title="Schedule" />
            <div className="flex gap-12 mt-4">
              {proposal.schedule_start_date && (
                <div>
                  <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Target Start Date</p>
                  <p className="text-lg font-medium">{formatDateString(proposal.schedule_start_date)}</p>
                </div>
              )}
              {proposal.schedule_end_date && (
                <div>
                  <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Target End Date</p>
                  <p className="text-lg font-medium">{formatDateString(proposal.schedule_end_date)}</p>
                </div>
              )}
            </div>
          </PaperSheet>
        )}

        {/* ── Assumptions & Exclusions — auto-split with Cont. ── */}
        {proposal.assumptions && (
          <RichTextPages
            html={proposal.assumptions}
            sectionTitle="Assumptions & Exclusions"
            proposal={proposal}
          />
        )}

        {/* ── PAGE: Attachments & Signatures ────────────────── */}
        <PaperSheet
          proposal={proposal}
        >
          <div className="mb-10">
            <SectionTitle title="Attachments" />
            {proposal.attachments && proposal.attachments.length > 0 ? (
              <div className="space-y-4">
                {proposal.attachments.map((att, idx) => (
                  <div key={idx}>
                    <p className="font-bold text-lg" style={{ color: '#042950' }}>{att.name}</p>
                    <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{att.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-700 text-sm">No attachments provided.</p>
            )}
          </div>

          {/* Signatures */}
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

            {user.role === 'client' && proposal.status === 'sent' && (
              <div className="mt-12 text-center print-hidden">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-12"
                  onClick={() => handleStatusChange('accepted')}
                >
                  Click Here to Digitally Accept
                </Button>
              </div>
            )}

            <p className="mt-6 text-sm text-gray-500">
              Upon signature, the client agrees to this proposal along with the terms, conditions for
              the proposal and to supply the first payment for the project.
            </p>
          </div>
        </PaperSheet>

      </div>
    </div>
  );
}