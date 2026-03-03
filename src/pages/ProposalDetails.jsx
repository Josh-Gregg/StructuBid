import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, Mail, Edit, ArrowLeft, Download, PlusCircle, Trash2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { computeTotals } from '../components/proposalUtils';
import Logo from '../components/Logo';
import 'react-quill/dist/quill.snow.css';

function PaperSheet({ children, headerTitle, footerText, pageNum, totalPages, hideHeaderFooter, proposal }) {
  if (hideHeaderFooter) {
    return (
      <div className="w-[8.5in] min-h-[11in] bg-white relative flex flex-col shadow-xl mb-12 print:shadow-none print:mb-0 shrink-0 mx-auto box-border print-page" 
           style={{ pageBreakAfter: 'always' }}>
        {children}
      </div>
    );
  }

  return (
    <div className="w-[8.5in] min-h-[11in] bg-white relative shadow-xl mb-12 print:shadow-none print:mb-0 shrink-0 mx-auto box-border print-page flex flex-col" 
         style={{ pageBreakAfter: 'always' }}>
      <table className="w-full border-collapse m-0 p-0 flex flex-col print:table flex-1">
        <thead className="flex-shrink-0 block print:table-header-group">
          <tr className="block print:table-row">
            <td className="p-0 align-top block print:table-cell">
              <div className="h-[1in] bg-[#042950] text-white flex items-center justify-between px-20 shrink-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <h2 className="text-xl font-bold tracking-wider uppercase">{headerTitle}</h2>
                <div className="text-right">
                  <div className="font-bold text-sm">{proposal.client_name}</div>
                  <div className="text-white/80 text-xs text-right">#{proposal.project_number}</div>
                </div>
              </div>
            </td>
          </tr>
        </thead>
        <tbody className="flex-1 flex flex-col print:table-row-group">
          <tr className="flex-1 flex flex-col print:table-row">
            <td className="p-0 align-top flex-1 flex flex-col print:table-cell">
              <div className="px-20 py-12 pb-10 flex flex-col flex-1">
                {children}
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot className="flex-shrink-0 block print:table-footer-group">
          <tr className="block print:table-row">
            <td className="p-0 align-bottom block print:table-cell">
              <div className="h-[0.75in] border-t-4 border-[#042950] bg-gray-100 flex items-center justify-between px-20 shrink-0 mt-auto" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <div className="text-[#042950] font-black text-sm uppercase tracking-wider">{footerText || 'Great White Construction'}</div>
                <div className="text-[#042950] font-bold text-sm">
                  Page {pageNum} of {totalPages}
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
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

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in print:max-w-none print:w-full print:m-0 print:p-0 bg-white md:shadow-lg md:my-8 rounded-lg min-h-screen">
      {/* Action Bar (Hidden in Print) */}
      <div className="preview-controls flex items-center justify-between bg-white p-4 border-b border-gray-200 mb-8 sticky top-0 z-10 rounded-t-lg">
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
        <div className="preview-controls p-6 mb-8 mx-8 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Change Orders</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsAddingCO(!isAddingCO)} className="text-[#042950] font-bold">
              <PlusCircle className="w-4 h-4 mr-2" /> Add CO
            </Button>
          </div>
          
          {isAddingCO && (
            <div className="flex items-center gap-4 mb-4 bg-white p-4 rounded-lg border border-gray-200">
              <input className="flex-1 px-3 py-2 rounded-md border border-gray-300" placeholder="Description" value={newCO.description} onChange={e=>setNewCO({...newCO, description: e.target.value})} />
              <input type="number" className="w-32 px-3 py-2 rounded-md border border-gray-300 text-right" placeholder="Amount" value={newCO.amount} onChange={e=>setNewCO({...newCO, amount: parseFloat(e.target.value) || 0})} />
              <Button onClick={handleAddCO} className="bg-blue-600 text-white">Add</Button>
            </div>
          )}

          {proposal.change_orders?.length > 0 ? (
            <div className="space-y-2">
              {proposal.change_orders.map((co, i) => (
                <div key={i} className="flex justify-between p-3 bg-white rounded-lg text-sm border border-gray-200">
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
      <div className="print-content px-8 md:px-16 pb-16 pt-8 print:p-0 print:w-full print:box-border">
        
        {/* Cover Page */}
        <div className="section min-h-[900px] flex flex-col relative print:min-h-0 print:h-[9in] print:page-break-after-always print:overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#042950]/10 rounded-bl-full -z-10 no-print"></div>
          
          <header className="flex justify-between items-start mb-8 md:mb-16 pt-8 print:pt-0">
            <Logo imageClassName="h-32 md:h-48 print:h-32 object-contain" />
            <div className="text-right text-sm text-gray-600 space-y-1 mt-4">
              <p className="font-bold text-gray-900 text-base">Great White Construction</p>
              <p>2470 S Zephyr St</p>
              <p>Lakewood, CO 80227</p>
              <p>303-908-5421</p>
              <p>George@GreatWhiteGC.com</p>
            </div>
          </header>

          <div className="flex-1 flex flex-col justify-center">
            <div className="uppercase tracking-widest text-[#042950] font-bold text-sm mb-2 md:mb-4">{proposal.cover_title || 'Project Proposal'}</div>
            <h1 className="text-5xl md:text-6xl print:text-4xl print:leading-tight font-black text-[#042950] leading-tight mb-8 md:mb-12 print:mb-6">
              {proposal.cover_subtitle || proposal.project_type?.replace(/_/g, ' ')}
            </h1>

            {proposal.cover_photo_url && (
              <div className="mb-8 md:mb-12 print:mb-6 w-full h-72 print:h-56 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <img src={proposal.cover_photo_url} alt="Project Cover" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 md:gap-12 mt-auto mb-8 md:mb-16 print:mb-0 bg-gray-50 p-8 rounded-xl print:bg-transparent print:p-0 print:border-none border border-gray-100">
              <div>
                <p className="text-sm text-[#042950] uppercase tracking-wider font-bold mb-3">Prepared For</p>
                <p className="text-xl font-bold text-gray-900">{proposal.client_name}</p>
                {proposal.company_name && <p className="text-gray-700 mt-1">{proposal.company_name}</p>}
                <p className="text-gray-600 mt-1">{proposal.client_address}</p>
                <div className="mt-8">
                  <p className="text-sm text-[#042950] uppercase tracking-wider font-bold mb-2">Proposal Number</p>
                  <p className="font-medium text-gray-800">#{proposal.project_number}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-[#042950] uppercase tracking-wider font-bold mb-3">Project Location</p>
                <p className="text-lg font-medium text-gray-900">{proposal.project_address}</p>
                
                <div className="mt-8">
                  <p className="text-sm text-[#042950] uppercase tracking-wider font-bold mb-2">Date</p>
                  <p className="font-medium text-gray-800">{new Date(proposal.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="section mt-16 print:mt-0 print:page-break-before-always">
          <h2 className="text-3xl font-black text-[#042950] mb-8 pb-3 border-b-2 border-[#042950]/20">Project Details</h2>
          
          {proposal.executive_summary && (
            <div className="mb-12 bid-group">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Executive Summary</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{proposal.executive_summary}</p>
            </div>
          )}

          <div className="mb-12 bid-group">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Scope of Work</h3>
            <div className="ql-editor p-0 text-gray-700 whitespace-normal" dangerouslySetInnerHTML={{ __html: proposal.scope_of_work }}>
            </div>
          </div>

          {(proposal.schedule_start_date || proposal.schedule_end_date) && (
            <div className="mb-12 bid-group bg-gray-50 p-6 rounded-lg print:bg-transparent print:p-0">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Schedule</h3>
              <div className="flex gap-16">
                {proposal.schedule_start_date && (
                  <div>
                    <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">Target Start Date</p>
                    <p className="text-xl font-medium text-[#042950]">{formatDateString(proposal.schedule_start_date)}</p>
                  </div>
                )}
                {proposal.schedule_end_date && (
                  <div>
                    <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">Target End Date</p>
                    <p className="text-xl font-medium text-[#042950]">{formatDateString(proposal.schedule_end_date)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Estimate Tables */}
        <div className="mt-16 print:mt-12 print:page-break-before-always">
          <h2 className="text-3xl font-black text-[#042950] mb-8 pb-3 border-b-2 border-[#042950]/20">Project Estimate</h2>
          
          <table className="bid-table w-full text-sm border-collapse mb-8 print:text-xs">
            <thead className="bg-[#042950] text-white">
              <tr>
                <th className="py-3 px-4 print:px-2 text-left font-bold border-b-2 border-[#042950]">Description</th>
                <th className="py-3 px-4 print:px-2 text-right font-bold w-20 md:w-24 border-b-2 border-[#042950]">Qty</th>
                {!proposal.hide_markups && (
                  <>
                    <th className="py-3 px-4 print:px-2 text-right font-bold w-24 md:w-32 border-b-2 border-[#042950]">Unit Cost</th>
                    <th className="py-3 px-4 print:px-2 text-right font-bold w-24 md:w-32 border-b-2 border-[#042950]">Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {proposal.categories?.map((cat, i) => {
                if (!cat.line_items?.length) return null;
                const catTotal = cat.line_items.reduce((sum, item) => sum + getDisplayCost(item), 0);
                
                return (
                  <React.Fragment key={i}>
                    <tr className="bg-gray-100 font-bold border-b border-gray-300 bid-group">
                      <td colSpan={proposal.hide_markups ? 2 : 4} className="py-3 px-4 print:px-2 text-base md:text-lg text-gray-900" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <div className="flex justify-between items-center">
                          <span>{cat.name}</span>
                          <span className="text-[#042950]">${catTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </div>
                      </td>
                    </tr>
                    {cat.line_items.map((item, j) => (
                      <tr key={j} className="border-b border-gray-200">
                        <td className="py-3 px-4 print:px-2 text-gray-800 align-top">
                          <div className="font-medium">{item.description}</div>
                          {item.show_note && item.note && (
                            <div className="text-xs text-gray-500 mt-1 italic leading-relaxed">{item.note}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 print:px-2 text-right text-gray-600 align-top">{item.quantity} <span className="text-[10px] md:text-xs">{item.unit}</span></td>
                        {!proposal.hide_markups && (
                          <>
                            <td className="py-3 px-4 print:px-2 text-right text-gray-600 align-top">${(getDisplayCost(item) / (item.quantity || 1)).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                            <td className="py-3 px-4 print:px-2 text-right font-bold text-gray-900 align-top">${getDisplayCost(item).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Totals Block */}
          <div className="totals-block flex justify-end mt-8">
            <div className="w-full max-w-md bg-gray-50 p-6 rounded-xl border border-gray-200 print:bg-transparent print:border-none print:p-0">
              <div className="space-y-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${totals.totalWithMarkup.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>

                {totals.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span>-${(totals.discount || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                  </div>
                )}

                {totals.tax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>${(totals.tax || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                  </div>
                )}

                {totals.contingency > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Contingency ({proposal.contingency_percentage}%)</span>
                    <span>${totals.contingency.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                  </div>
                )}

                {totals.changeOrdersTotal > 0 && (
                  <div className="flex justify-between text-orange-600 font-medium pt-3 border-t border-gray-200">
                    <span>Approved Change Orders</span>
                    <span>${totals.changeOrdersTotal.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                  </div>
                )}

                <div className="flex justify-between text-2xl font-black text-[#042950] pt-4 border-t-2 border-[#042950]">
                  <span>Grand Total</span>
                  <span>${totals.grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assumptions & Signatures */}
        <div className="section mt-16 print:mt-12 print:page-break-before-always">
          <h2 className="text-3xl font-black text-[#042950] mb-8 pb-3 border-b-2 border-[#042950]/20">Assumptions & Signatures</h2>
          
          {proposal.assumptions && (
            <div className="mb-12 bid-group">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Assumptions & Exclusions</h3>
              <div className="ql-editor p-0 text-gray-700 whitespace-normal" dangerouslySetInnerHTML={{ __html: proposal.assumptions }}>
              </div>
            </div>
          )}

          {proposal.attachments && proposal.attachments.length > 0 && (
            <div className="mb-12 bid-group">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Attachments</h3>
              <div className="space-y-6">
                {proposal.attachments.map((att, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0">
                    <p className="font-bold text-[#042950] text-lg">{att.name}</p>
                    <p className="text-gray-700 text-sm mt-2 whitespace-pre-wrap leading-relaxed">{att.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-16 bid-group bg-white border border-gray-200 p-8 rounded-xl print:border-none print:p-0 print:mt-12">
            <h3 className="text-xl font-bold text-[#042950] mb-12">Acceptance & Signatures</h3>
            
            <div className="grid grid-cols-2 gap-16">
              <div>
                <div className="border-b-2 border-gray-400 h-10 mb-3"></div>
                <p className="text-xs text-gray-500 italic mb-2">(Contractor Signature)</p>
                <p className="text-base font-bold text-gray-900">George Gregg</p>
                <p className="text-sm text-gray-600">Great White Construction</p>
                <div className="flex items-end gap-3 mt-6 text-gray-700">
                  <span className="font-medium">Date:</span>
                  <div className="border-b border-gray-400 flex-1 h-6"></div>
                </div>
              </div>
              <div>
                <div className="border-b-2 border-gray-400 h-10 mb-3"></div>
                <p className="text-xs text-gray-500 italic mb-2">(Client Signature)</p>
                <p className="text-base font-bold text-gray-900">{proposal.client_name}</p>
                <p className="text-sm text-gray-600">Client</p>
                <div className="flex items-end gap-3 mt-6 text-gray-700">
                  <span className="font-medium">Date:</span>
                  <div className="border-b border-gray-400 flex-1 h-6"></div>
                </div>
              </div>
            </div>
            
            {user.role === 'client' && proposal.status === 'sent' && (
              <div className="mt-16 text-center preview-controls">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold px-12 py-6 text-lg rounded-xl shadow-lg" onClick={() => handleStatusChange('accepted')}>
                  Click Here to Digitally Accept
                </Button>
              </div>
            )}
            
            <p className="mt-12 text-sm text-gray-500 text-center max-w-3xl mx-auto italic">
              Upon signature, the client agrees to this proposal along with the terms, conditions for the proposal and to supply the first payment for the project.
            </p>
          </div>
        </div>

      </div>

      <footer className="page-footer mt-16 py-8 border-t border-gray-200 text-center text-sm text-gray-500">
        Great White Construction • 2470 S Zephyr St, Lakewood, CO 80227 • 303-908-5421
      </footer>
    </div>
  );
}