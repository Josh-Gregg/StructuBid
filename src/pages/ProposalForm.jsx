import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, ArrowLeft, Calculator } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { computeTotals } from '../components/proposalUtils';

export default function ProposalForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState(null);

  const defaultState = {
    client_name: '', company_name: '', client_address: '', client_phone: '', client_email: '', referral_source: '', project_number: `PRJ-${Date.now().toString().slice(-6)}`,
    project_type: 'residential_remodel', project_address: '', property_owner: '', scope_of_work: '', executive_summary: '',
    cover_title: 'Project Proposal', cover_subtitle: '', cover_photo_url: '',
    schedule_start_date: '', schedule_end_date: '', milestones: [], categories: [], hide_markups: false,
    overall_markup_percentage: 0, tax_amount: 0, tax_type: 'percentage', discount_amount: 0, discount_type: 'percentage',
    contingency_percentage: 10, assumptions: '', terms_and_conditions_url: '', attachments: [], status: 'draft', change_orders: []
  };

  const [form, setForm] = useState(defaultState);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    if (id) {
      setIsLoading(true);
      base44.entities.Proposal.get(id).then(data => {
        setForm({ ...defaultState, ...data });
        setIsLoading(false);
      });
    }
  }, [id]);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addAttachment = () => {
    setForm(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), { name: '', description: '' }]
    }));
  };

  const updateAttachment = (index, field, value) => {
    const newAtts = [...(form.attachments || [])];
    newAtts[index] = { ...newAtts[index], [field]: value };
    updateForm('attachments', newAtts);
  };

  const removeAttachment = (index) => {
    const newAtts = [...(form.attachments || [])];
    newAtts.splice(index, 1);
    updateForm('attachments', newAtts);
  };

  const addCategory = () => {
    const name = window.prompt("Enter category name (e.g. Materials, Labor):");
    if (name) {
      setForm(prev => ({
        ...prev,
        categories: [...(prev.categories || []), { name, line_items: [] }]
      }));
    }
  };

  const removeCategory = (catIndex) => {
    if(window.confirm("Remove this category and all its items?")) {
      setForm(prev => ({
        ...prev,
        categories: prev.categories.filter((_, i) => i !== catIndex)
      }));
    }
  };

  const addLineItem = (catIndex) => {
    const newCategories = [...form.categories];
    newCategories[catIndex].line_items.push({
      description: '', quantity: 1, unit: 'ea', cost_per_unit: 0, markup_percentage: 0, note: '', show_note: false
    });
    updateForm('categories', newCategories);
  };

  const updateLineItem = (catIndex, itemIndex, field, value) => {
    const newCategories = [...form.categories];
    newCategories[catIndex].line_items[itemIndex][field] = value;
    updateForm('categories', newCategories);
  };

  const removeLineItem = (catIndex, itemIndex) => {
    const newCategories = [...form.categories];
    newCategories[catIndex].line_items = newCategories[catIndex].line_items.filter((_, i) => i !== itemIndex);
    updateForm('categories', newCategories);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsSaving(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateForm('cover_photo_url', file_url);
    } catch (err) {
      alert("Failed to upload photo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.client_name || !form.client_email || !form.project_address) {
      alert("Please fill in required fields: Client Name, Email, Project Address");
      return;
    }
    setIsSaving(true);
    try {
      if (id) {
        await base44.entities.Proposal.update(id, form);
      } else {
        await base44.entities.Proposal.create(form);
      }
      navigate(createPageUrl('Proposals'));
    } catch (e) {
      alert("Failed to save proposal");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) return <div className="p-8">Loading...</div>;
  if (user.role === 'client') return <div className="p-8">Unauthorized</div>;

  const totals = computeTotals(form);

  return (
    <div className="max-w-[120rem] mx-auto px-4 space-y-8 pb-20 animate-in fade-in">
      <div className="flex items-center justify-between sticky top-0 bg-[#F3F4F6] pt-4 pb-4 z-10 border-b border-gray-200 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-white shadow-sm border border-gray-200">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-black text-gray-900">{id ? 'Edit Proposal' : 'New Proposal'}</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-md font-bold px-6">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Proposal'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Client Details */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-4 mb-6 uppercase tracking-wider">Client Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Full Name *</Label>
                <Input value={form.client_name} onChange={e => updateForm('client_name', e.target.value)} className="bg-gray-50 border-gray-200 focus:bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Company Name</Label>
                <Input value={form.company_name} onChange={e => updateForm('company_name', e.target.value)} className="bg-gray-50 border-gray-200 focus:bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Email *</Label>
                <Input type="email" value={form.client_email} onChange={e => updateForm('client_email', e.target.value)} className="bg-gray-50 border-gray-200 focus:bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Phone *</Label>
                <Input value={form.client_phone} onChange={e => updateForm('client_phone', e.target.value)} className="bg-gray-50 border-gray-200 focus:bg-white" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="font-bold text-gray-700">Address *</Label>
                <Input value={form.client_address} onChange={e => updateForm('client_address', e.target.value)} className="bg-gray-50 border-gray-200 focus:bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Referral Source</Label>
                <Input value={form.referral_source} onChange={e => updateForm('referral_source', e.target.value)} className="bg-gray-50 border-gray-200 focus:bg-white" />
              </div>
            </div>
          </div>

          {/* Section 2: Project Specs */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-4 mb-6 uppercase tracking-wider">Project Specs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Project Number</Label>
                <Input value={form.project_number} onChange={e => updateForm('project_number', e.target.value)} className="bg-gray-50 border-gray-200 focus:bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Project Type</Label>
                <Select value={form.project_type} onValueChange={v => updateForm('project_type', v)}>
                  <SelectTrigger className="bg-gray-50 border-gray-200 focus:bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential_remodel">Residential Remodel</SelectItem>
                    <SelectItem value="residential_addition">Residential Addition</SelectItem>
                    <SelectItem value="custom_home_build">Custom Home Build</SelectItem>
                    <SelectItem value="commercial_tenant_finish">Commercial Tenant Finish</SelectItem>
                    <SelectItem value="commercial_new_build">Commercial New Build</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="font-bold text-gray-700">Project Address *</Label>
                <Input value={form.project_address} onChange={e => updateForm('project_address', e.target.value)} className="bg-gray-50 border-gray-200 focus:bg-white" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="font-bold text-gray-700">Property Owner</Label>
                <Input value={form.property_owner} onChange={e => updateForm('property_owner', e.target.value)} className="bg-gray-50 border-gray-200 focus:bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Cover Sheet Title</Label>
                <Input value={form.cover_title} onChange={e => updateForm('cover_title', e.target.value)} placeholder="e.g. Project Proposal" className="bg-gray-50 border-gray-200 focus:bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Cover Sheet Subtitle</Label>
                <Input value={form.cover_subtitle} onChange={e => updateForm('cover_subtitle', e.target.value)} placeholder="e.g. Custom Home Build (Defaults to project type)" className="bg-gray-50 border-gray-200 focus:bg-white" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="font-bold text-gray-700">Cover Photo</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*" onChange={handlePhotoUpload} className="bg-gray-50 border-gray-200 focus:bg-white" />
                  {form.cover_photo_url && (
                    <img src={form.cover_photo_url} alt="Cover Preview" className="h-10 w-10 object-cover rounded shadow-sm" />
                  )}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="font-bold text-gray-700">Scope of Work *</Label>
                <ReactQuill theme="snow" value={form.scope_of_work} onChange={val => updateForm('scope_of_work', val)} className="bg-white" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="font-bold text-gray-700">Executive Summary</Label>
                <Textarea value={form.executive_summary} onChange={e => updateForm('executive_summary', e.target.value)} rows={3} className="bg-gray-50 border-gray-200 focus:bg-white resize-y" placeholder="Brief overview for cover page..." />
              </div>
            </div>
          </div>

          {/* Section 3: Line Items */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">Line-Item Costs</h2>
              <Button onClick={addCategory} variant="outline" size="sm" className="font-bold border-gray-300">
                <Plus className="w-4 h-4 mr-2" /> Add Category
              </Button>
            </div>

            {(!form.categories || form.categories.length === 0) && (
              <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-medium">
                No categories added yet. Add a category like "Materials" or "Labor" to start estimating.
              </div>
            )}

            <div className="space-y-8">
              {form.categories?.map((cat, catIndex) => (
                <div key={catIndex} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-blue-900">{cat.name}</h3>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => removeCategory(catIndex)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {cat.line_items?.map((item, itemIndex) => {
                      const itemSub = (item.quantity || 0) * (item.cost_per_unit || 0) * (1 + (item.markup_percentage || 0)/100);
                      const itemDistMarkup = (!item.exclude_from_markup && totals.totalLineItemsForMarkup > 0) ? (totals.distMarkup / totals.totalLineItemsForMarkup) : 0;
                      const itemTotalWithOverallMarkup = itemSub + itemDistMarkup;

                      return (
                        <div key={itemIndex} className="flex flex-col gap-4 bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                          {/* Top Row: Description */}
                          <div className="w-full space-y-1.5">
                            <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Item Description</Label>
                            <Input 
                              value={item.description} 
                              onChange={e => updateLineItem(catIndex, itemIndex, 'description', e.target.value)} 
                              placeholder="Description" 
                              className="border-gray-200" 
                            />
                          </div>

                          {/* Bottom Row: Numbers */}
                          <div className="flex flex-wrap sm:flex-nowrap items-end gap-4">
                            <div className="w-full sm:w-24 space-y-1.5">
                              <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Quantity</Label>
                              <Input 
                                type="number" 
                                value={item.quantity} 
                                onChange={e => updateLineItem(catIndex, itemIndex, 'quantity', parseFloat(e.target.value) || 0)} 
                                className="border-gray-200 text-right" 
                                placeholder="Qty" 
                              />
                            </div>
                            <div className="w-full sm:w-20 space-y-1.5">
                              <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Unit</Label>
                              <Input 
                                value={item.unit} 
                                onChange={e => updateLineItem(catIndex, itemIndex, 'unit', e.target.value)} 
                                className="border-gray-200" 
                                placeholder="Unit" 
                              />
                            </div>
                            <div className="w-full sm:w-32 space-y-1.5">
                              <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Cost / Unit</Label>
                              <Input 
                                type="number" 
                                value={item.cost_per_unit} 
                                onChange={e => updateLineItem(catIndex, itemIndex, 'cost_per_unit', parseFloat(e.target.value) || 0)} 
                                className="border-gray-200 text-right" 
                                placeholder="Cost" 
                              />
                            </div>
                            <div className="w-full sm:w-28 space-y-1.5">
                              <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Markup %</Label>
                              <div className="relative">
                                <Input 
                                  type="number" 
                                  value={item.markup_percentage} 
                                  onChange={e => updateLineItem(catIndex, itemIndex, 'markup_percentage', parseFloat(e.target.value) || 0)} 
                                  className="w-full border-gray-200 text-right pr-6" 
                                  placeholder="Markup" 
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                              </div>
                            </div>
                            <div className="flex-1 text-right flex flex-col justify-end pb-1 space-y-1 min-w-[120px]">
                              <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider text-right mb-1">Subtotal</Label>
                              <div className="flex flex-col justify-center">
                                <span className="font-bold text-gray-900 text-lg" title="Cost (Without Overall Markup)">${itemSub.toFixed(2)}</span>
                                <span className="text-[10px] text-blue-600 font-semibold leading-tight" title="Cost (With Overall Markup)">w/ mkp: ${itemTotalWithOverallMarkup.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="pb-1">
                              <Button variant="ghost" size="icon" onClick={() => removeLineItem(catIndex, itemIndex)} className="text-gray-400 hover:text-red-500 h-10 w-10">
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Input 
                              value={item.note || ''} 
                              onChange={e => updateLineItem(catIndex, itemIndex, 'note', e.target.value)} 
                              placeholder="Add a note (optional)..." 
                              className="flex-1 text-sm border-gray-200 bg-gray-50 h-8" 
                            />
                            <Label className="flex items-center gap-2 text-xs font-medium text-gray-600 min-w-[120px] cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={item.show_note || false} 
                                onChange={e => updateLineItem(catIndex, itemIndex, 'show_note', e.target.checked)} 
                                className="w-3 h-3 text-blue-600 rounded border-gray-300"
                              />
                              Show note on PDF
                            </Label>
                            <Label className="flex items-center gap-2 text-xs font-medium text-gray-600 min-w-[150px] cursor-pointer ml-4">
                              <input 
                                type="checkbox" 
                                checked={item.exclude_from_markup || false} 
                                onChange={e => updateLineItem(catIndex, itemIndex, 'exclude_from_markup', e.target.checked)} 
                                className="w-3 h-3 text-blue-600 rounded border-gray-300"
                              />
                              Exclude from overall markup
                            </Label>
                          </div>
                        </div>
                      );
                    })}
                    <Button onClick={() => addLineItem(catIndex)} variant="ghost" size="sm" className="w-full mt-2 border border-dashed border-gray-300 text-blue-600 hover:bg-blue-50 font-bold">
                      <Plus className="w-4 h-4 mr-2" /> Add Line Item
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">Attachments</h2>
              <Button onClick={addAttachment} variant="outline" size="sm" className="font-bold border-gray-300">
                <Plus className="w-4 h-4 mr-2" /> Add Attachment
              </Button>
            </div>
            
            <div className="space-y-4">
              {(form.attachments || []).map((att, i) => (
                <div key={i} className="flex gap-4 items-start bg-gray-50 p-4 rounded-lg">
                  <div className="flex-1 space-y-3">
                    <Input placeholder="Attachment Name" value={att.name || ''} onChange={e => updateAttachment(i, 'name', e.target.value)} />
                    <Textarea placeholder="Short Description" value={att.description || ''} onChange={e => updateAttachment(i, 'description', e.target.value)} rows={2} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeAttachment(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-1">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(!form.attachments || form.attachments.length === 0) && (
                <div className="text-center p-4 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-xl">No attachments added.</div>
              )}
            </div>
          </div>

          {/* Section 4: Schedule & Additional */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-4 mb-6 uppercase tracking-wider">Schedule & Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Start Date</Label>
                <Input type="text" placeholder="e.g. YYYY-MM-DD or TBD" value={form.schedule_start_date} onChange={e => updateForm('schedule_start_date', e.target.value)} className="bg-gray-50 border-gray-200" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">End Date</Label>
                <Input type="text" placeholder="e.g. YYYY-MM-DD or TBD" value={form.schedule_end_date} onChange={e => updateForm('schedule_end_date', e.target.value)} className="bg-gray-50 border-gray-200" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="font-bold text-gray-700">Assumptions, Exclusions & Clarifications</Label>
                <ReactQuill theme="snow" value={form.assumptions} onChange={val => updateForm('assumptions', val)} className="bg-white" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="font-bold text-gray-700 flex items-center gap-2">
                  <input type="checkbox" checked={form.hide_markups} onChange={e => updateForm('hide_markups', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  Hide markups on final PDF proposal
                </Label>
                <p className="text-xs text-gray-500 ml-6">If checked, individual line-item markups and overall markups will be distributed into the base cost so the client only sees final subtotals.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar: Calculations */}
        <div className="space-y-6">
          <div className="bg-blue-900 text-white p-6 rounded-2xl shadow-lg sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-blue-300" />
              <h2 className="text-lg font-black uppercase tracking-wider">Calculations</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-blue-100 text-sm">
                <span>Items Subtotal</span>
                <span className="font-bold">${totals.subtotal.toFixed(2)}</span>
              </div>
              
              <div className="space-y-1">
                <Label className="text-blue-200 text-xs font-bold uppercase tracking-wider">Overall Markup (%)</Label>
                <Input 
                  type="number" 
                  value={form.overall_markup_percentage} 
                  onChange={e => updateForm('overall_markup_percentage', parseFloat(e.target.value) || 0)} 
                  className="bg-blue-800 border-blue-700 text-white h-9" 
                />
              </div>

              <div className="flex justify-between items-center text-blue-100 text-sm pt-2 border-t border-blue-800">
                <span>Subtotal + Markup</span>
                <span className="font-bold">${totals.totalWithMarkup.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="space-y-1">
                  <Label className="text-blue-200 text-xs font-bold uppercase tracking-wider">Discount</Label>
                  <Input 
                    type="number" 
                    value={form.discount_amount} 
                    onChange={e => updateForm('discount_amount', parseFloat(e.target.value) || 0)} 
                    className="bg-blue-800 border-blue-700 text-white h-9" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-blue-200 text-xs font-bold uppercase tracking-wider">Type</Label>
                  <Select value={form.discount_type} onValueChange={v => updateForm('discount_type', v)}>
                    <SelectTrigger className="bg-blue-800 border-blue-700 text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="flat">$ Flat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-blue-200 text-xs font-bold uppercase tracking-wider">Tax</Label>
                  <Input 
                    type="number" 
                    value={form.tax_amount} 
                    onChange={e => updateForm('tax_amount', parseFloat(e.target.value) || 0)} 
                    className="bg-blue-800 border-blue-700 text-white h-9" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-blue-200 text-xs font-bold uppercase tracking-wider">Type</Label>
                  <Select value={form.tax_type} onValueChange={v => updateForm('tax_type', v)}>
                    <SelectTrigger className="bg-blue-800 border-blue-700 text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="flat">$ Flat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <Label className="text-blue-200 text-xs font-bold uppercase tracking-wider">Contingency (%)</Label>
                <Input 
                  type="number" 
                  value={form.contingency_percentage} 
                  onChange={e => updateForm('contingency_percentage', parseFloat(e.target.value) || 0)} 
                  className="bg-blue-800 border-blue-700 text-white h-9" 
                />
              </div>

              <div className="pt-6 mt-4 border-t border-blue-800">
                <div className="flex justify-between items-end">
                  <span className="text-blue-200 font-bold uppercase tracking-wider text-sm">Grand Total</span>
                  <span className="text-3xl font-black text-white">${totals.grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      <div className="flex justify-end mt-8 border-t border-gray-200 pt-8">
        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-md font-bold px-8 py-6 text-lg w-full md:w-auto">
          <Save className="w-5 h-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Proposal'}
        </Button>
      </div>
    </div>
  );
}