import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, Mail, Edit, ArrowLeft, Download, PlusCircle, Trash2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { computeTotals } from '../components/proposalUtils';
import Logo from '../components/Logo';
import 'react-quill/dist/quill.snow.css';

function PaperSheet({ children, headerTitle, footerText, pageNum, totalPages, hideHeaderFooter, proposal, strictHeight = false }) {
  return (
    <div className={`w-[8.5in] ${strictHeight ? 'h-[11in] overflow-hidden' : 'min-h-[11in]'} bg-white relative flex flex-col shadow-xl mb-12 print:shadow-none print:mb-0 shrink-0 mx-auto box-border print-page`} 
         style={{ pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
      
      {!hideHeaderFooter && (
        <div className="h-[1in] bg-[#042950] text-white flex items-center justify-between px-12 shrink-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <h2 className="text-xl font-bold tracking-wider uppercase">{headerTitle}</h2>
          <div className="text-right">
            <div className="font-bold text-sm">{proposal.client_name}</div>
            <div className="text-white/80 text-xs text-right">#{proposal.project_number}</div>
          </div>
        </div>
      )}

      <div className={`flex-1 flex flex-col ${hideHeaderFooter ? '' : 'px-12 py-10 pb-8'}`}>
        {children}
      </div>

      {!hideHeaderFooter && (
        <div className="h-[0.75in] border-t-4 border-[#042950] bg-gray-100 flex items-center justify-between px-12 shrink-0 mt-auto" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div className="text-[#042950] font-black text-sm uppercase tracking-wider">{footerText || 'Great White Construction'}</div>
          <div className="text-[#042950] font-bold text-sm">
            Page {pageNum} of {totalPages}
          </div>
        </div>
      )}
    </div>
  );
}

function PrintSection({ title, children, className="" }) {
  return (
    <div className={`relative ${className}`}>
      <div className="print:absolute print:top-0 print:left-0 print:right-0 print:z-10 bg-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <h2 className="text-2xl font-black text-[#042950] mb-4 pb-2 border-b-2 border-[#042950]/20">{title}</h2>
      </div>
      <table className="w-full border-collapse block print:table">
        <thead className="hidden print:table-header-group">
          <tr>
            <th className="text-left font-normal p-0 align-top">
              <h2 className="text-2xl font-black text-[#042950] mb-4 pb-2 border-b-2 border-[#042950]/20 bg-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{title} (Cont.)</h2>
            </th>
          </tr>
        </thead>
        <tbody className="block print:table-row-group">
          <tr className="block print:table-row">
            <td className="p-0 align-top block print:table-cell w-full">
              {children}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

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
        body: body,
        from_name: "Great White Construction"
      });
      
      await base44.entities.Proposal.update(id, { status: 'sent' });
      alert("Proposal sent successfully!");
      fetchProposal();
    } catch (e) {
      alert("Failed to send email");
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
  const totalLineItems = proposal.categories?.reduce((acc, cat) => acc + (cat.line_items?.length || 0), 0) || 0;
  
  // Calculate item display price with evenly distributed markup
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

  // Chunking Estimate Items for Print Pagination
  const estimatePages = [];
  let currentPageItems = [];
  let currentLines = 0;
  const MAX_LINES_PER_PAGE = 22; // Approx lines that fit on a page

  if (proposal.categories) {
    proposal.categories.forEach(cat => {
      if (!cat.line_items?.length) return;
      
      if (currentLines + 3 > MAX_LINES_PER_PAGE) {
        estimatePages.push(currentPageItems);
        currentPageItems = [];
        currentLines = 0;
      }
      
      currentPageItems.push({ type: 'category', data: cat });
      currentLines += 2;
      
      cat.line_items.forEach(item => {
        const itemLines = (item.show_note && item.note) ? 2 : 1;
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
  
  if (currentLines + 8 > MAX_LINES_PER_PAGE) {
    estimatePages.push(currentPageItems);
    currentPageItems = [];
  }
  currentPageItems.push({ type: 'totals' });
  estimatePages.push(currentPageItems);

  const totalPages = 1 + 1 + estimatePages.length + 1; // Cover + Details + Estimates + Signatures
  let pageCounter = 2; // Start after cover

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in print:max-w-none print:m-0 print:p-0">
      {/* Action Bar (Hidden in Print) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 print:hidden sticky top-4 z-10">
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
              'bg-gray-100 text-gray-800'
            }`}>
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
              <Button variant="destructive" onClick={() => handleStatusChange('rejected')}>Reject</Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange('accepted')}>Accept Proposal</Button>
            </>
          )}
          <Button onClick={handlePrint} className="bg-blue-700 hover:bg-blue-800 text-white shadow-md">
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
        </div>
      </div>

      {user.role !== 'client' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 print:hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Change Orders</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsAddingCO(!isAddingCO)} className="text-[#042950] font-bold">
              <PlusCircle className="w-4 h-4 mr-2" /> Add CO
            </Button>
          </div>
          
          {isAddingCO && (
            <div className="flex items-center gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
              <input className="flex-1 px-3 py-2 rounded-md border border-gray-300" placeholder="Description" value={newCO.description} onChange={e=>setNewCO({...newCO, description: e.target.value})} />
              <input type="number" className="w-32 px-3 py-2 rounded-md border border-gray-300 text-right" placeholder="Amount" value={newCO.amount} onChange={e=>setNewCO({...newCO, amount: parseFloat(e.target.value) || 0})} />
              <Button onClick={handleAddCO} className="bg-blue-600 text-white">Add</Button>
            </div>
          )}

          {proposal.change_orders?.length > 0 ? (
            <div className="space-y-2">
              {proposal.change_orders.map((co, i) => (
                <div key={i} className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
                  <span className="font-medium text-gray-700">{co.description}</span>
                  <span className="font-bold">${co.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No change orders yet.</p>
          )}
        </div>
      )}

      {/* Printable Proposal Area */}
      <div id="printable-proposal" className="w-full flex flex-col items-center bg-gray-200/50 rounded-2xl print:bg-white py-12 print:py-0 text-gray-900 print:rounded-none">
        
        {/* Cover Page */}
        <PaperSheet hideHeaderFooter={true} pageNum={1} totalPages={totalPages} proposal={proposal} strictHeight={true}>
          <div className="p-12 md:p-16 flex-1 flex flex-col relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#042950]/10 rounded-bl-full -z-10 print:hidden"></div>
          
          <header className="flex justify-between items-start mb-12">
            <Logo imageClassName="h-48 md:h-56 object-contain" />
            <div className="text-right text-sm text-gray-600 space-y-1">
              <p className="font-bold text-gray-900">Great White Construction</p>
              <p>2470 S Zephyr St</p>
              <p>Lakewood, CO 80227</p>
              <p>303-908-5421</p>
              <p>George@GreatWhiteGC.com</p>
            </div>
          </header>

          <div className="flex-1 flex flex-col justify-center">
            <div className="uppercase tracking-widest text-[#042950] font-bold text-sm mb-4">{proposal.cover_title || 'Project Proposal'}</div>
            <h1 className="text-5xl md:text-6xl font-black text-[#042950] leading-tight mb-8">
              {proposal.cover_subtitle || proposal.project_type?.replace(/_/g, ' ')}
            </h1>

            {proposal.cover_photo_url && (
              <div className="mb-8 w-full h-64 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <img src={proposal.cover_photo_url} alt="Project Cover" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-12 mb-8 mt-auto">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-2">Prepared For</p>
                <p className="text-xl font-bold">{proposal.client_name}</p>
                {proposal.company_name && <p className="text-gray-700">{proposal.company_name}</p>}
                <p className="text-gray-600">{proposal.client_address}</p>
                <div className="mt-6">
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Proposal Number</p>
                  <p className="font-medium text-[#042950]">#{proposal.project_number}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-2">Project Location</p>
                <p className="text-lg font-medium">{proposal.project_address}</p>
                
                <div className="mt-6">
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Date</p>
                  <p className="font-medium">{new Date(proposal.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </PaperSheet>

        {/* Content Pages */}
        <PaperSheet headerTitle="Project Details" footerText="Great White Construction" pageNum={2} totalPages={4} proposal={proposal}>
          {proposal.executive_summary && (
            <PrintSection title="Executive Summary" className="mb-16">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{proposal.executive_summary}</p>
            </PrintSection>
          )}

          <PrintSection title="Scope of Work" className="mb-16">
            <div className="ql-editor p-0 text-gray-700 whitespace-normal" dangerouslySetInnerHTML={{ __html: proposal.scope_of_work }}>
            </div>
          </PrintSection>

          {(proposal.schedule_start_date || proposal.schedule_end_date) && (
            <PrintSection title="Schedule" className="mb-16">
              <div className="flex gap-12">
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
            </PrintSection>
          )}
        </PaperSheet>

        {/* Estimate Section */}
        <PaperSheet headerTitle="Project Estimate" footerText="Great White Construction" pageNum={3} totalPages={4} proposal={proposal}>
          <PrintSection title="Estimate" className="flex-1">
          
          <div className="space-y-8 mt-4">
            {proposal.categories?.map((cat, i) => {
              if (!cat.line_items?.length) return null;
              
              const catTotal = cat.line_items.reduce((sum, item) => sum + getDisplayCost(item), 0);

              return (
                <div key={i} className="mb-6 break-inside-auto relative">
                  <div className="print:absolute print:top-0 print:left-0 print:right-0 print:z-10 bg-white rounded-t-lg print:rounded-none overflow-hidden" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <h3 className="text-lg font-bold text-gray-900 bg-gray-50 p-3 border border-gray-200 border-b-0 flex justify-between print:border-b" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', margin: 0 }}>
                      <span>{cat.name}</span>
                      <span>${catTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </h3>
                  </div>
                  <table className="w-full text-sm border border-gray-200">
                    <thead className="bg-white border-b border-gray-200 text-gray-500">
                      <tr className="hidden print:table-row bg-gray-50 border-b border-gray-200" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <th colSpan={proposal.hide_markups ? 2 : 4} className="p-3 text-left text-lg font-bold text-gray-900">
                           <div className="flex justify-between">
                             <span>{cat.name} (Cont.)</span>
                             <span>${catTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                           </div>
                        </th>
                      </tr>
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold">Description</th>
                        <th className="py-2 px-3 text-right font-semibold w-24">Qty</th>
                        {!proposal.hide_markups && (
                           <>
                            <th className="py-2 px-3 text-right font-semibold w-24">Unit Cost</th>
                            <th className="py-2 px-3 text-right font-semibold w-32">Total</th>
                           </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cat.line_items.map((item, j) => (
                        <tr key={j}>
                          <td className="py-3 px-3 text-gray-800 align-top">
                            <div>{item.description}</div>
                            {item.show_note && item.note && (
                              <div className="text-xs text-gray-500 mt-1 italic">{item.note}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-600 align-top">{item.quantity} {item.unit}</td>
                          {!proposal.hide_markups && (
                            <>
                              <td className="py-3 px-3 text-right text-gray-600 align-top">${(getDisplayCost(item) / (item.quantity || 1)).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                              <td className="py-3 px-3 text-right font-medium text-gray-900 align-top">${getDisplayCost(item).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex justify-end">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${totals.totalWithMarkup.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
              </div>

              <div className={`flex justify-between ${totals.discount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                <span>Discount</span>
                <span>-${(totals.discount || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${(totals.tax || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</span>
              </div>

              {totals.contingency > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Contingency ({proposal.contingency_percentage}%)</span>
                  <span>${totals.contingency.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>
              )}

              {totals.changeOrdersTotal > 0 && (
                <div className="flex justify-between text-orange-600 font-medium pt-2 border-t border-gray-100">
                  <span>Approved Change Orders</span>
                  <span>${totals.changeOrdersTotal.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>
              )}

              <div className="flex justify-between text-xl font-black text-[#042950] pt-4 border-t-2 border-gray-900">
                <span>Grand Total</span>
                <span>${totals.grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
            </div>
          </div>

          </PrintSection>
        </PaperSheet>

        {/* Assumptions & Signatures Page */}
        <PaperSheet headerTitle="Assumptions & Signatures" footerText="Great White Construction" pageNum={4} totalPages={4} proposal={proposal}>
          {proposal.assumptions && (
            <PrintSection title="Assumptions & Exclusions" className="mb-16">
              <div className="ql-editor p-0 text-gray-700 whitespace-normal" dangerouslySetInnerHTML={{ __html: proposal.assumptions }}>
              </div>
            </PrintSection>
          )}

          <PrintSection title="Attachments" className="mb-16">
            {proposal.attachments && proposal.attachments.length > 0 ? (
              <div className="space-y-6">
                {proposal.attachments.map((att, idx) => (
                  <div key={idx}>
                    <p className="font-bold text-[#042950] text-lg">{att.name}</p>
                    <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{att.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-700 text-sm">No attachments provided.</p>
            )}
          </PrintSection>

          <div className="mt-20 break-inside-avoid print:break-inside-avoid">
            <PrintSection title="Acceptance & Signatures">
              <div className="grid grid-cols-2 gap-16 mt-8">
                <div>
                  <div className="border-b border-gray-400 h-10 mb-2"></div>
                  <p className="text-[10px] text-gray-400 italic mb-1">(Contractor Signature)</p>
                  <p className="text-sm font-bold text-gray-900">George Gregg</p>
                  <p className="text-xs text-gray-500">Great White Construction</p>
                  <div className="flex gap-2 mt-4 text-sm text-gray-500">
                    <span className="w-8">Date:</span>
                    <div className="border-b border-gray-400 flex-1"></div>
                  </div>
                </div>
                <div>
                  <div className="border-b border-gray-400 h-10 mb-2"></div>
                  <p className="text-[10px] text-gray-400 italic mb-1">(Client Signature)</p>
                  <p className="text-sm font-bold text-gray-900">{proposal.client_name}</p>
                  <p className="text-xs text-gray-500">Client</p>
                  <div className="flex gap-2 mt-4 text-sm text-gray-500">
                    <span className="w-8">Date:</span>
                    <div className="border-b border-gray-400 flex-1"></div>
                  </div>
                </div>
              </div>
              
              {user.role === 'client' && proposal.status === 'sent' && (
                <div className="mt-12 text-center print:hidden">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold px-12" onClick={() => handleStatusChange('accepted')}>
                    Click Here to Digitally Accept
                  </Button>
                </div>
              )}
              
              <p className="mt-8 text-sm text-gray-500">
                Upon signature, the client agrees to this proposal along with the terms, conditions for the proposal and to supply the first payment for the project.
              </p>
            </PrintSection>
          </div>
        </PaperSheet>

      </div>
    </div>
  );
}