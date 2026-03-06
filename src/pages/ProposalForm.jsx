import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, ArrowLeft, Calculator, GripVertical, Printer, BookmarkPlus, Copy } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createPageUrl } from '@/utils';
import { computeTotals } from '../components/proposalUtils';
import { toast } from 'sonner';
import ImageCropper from '../components/ImageCropper';

export default function ProposalForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [user, setUser] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [templates, setTemplates] = useState([]);
  const initialLoadRef = useRef(true);
  const isOwnSaveRef = useRef(false);
  const lastEditTimeRef = useRef(0);

  const fetchTemplates = () => {
    base44.entities.ProposalTemplate.list().then(setTemplates).catch(() => {});
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const defaultState = {
    client_name: '', company_name: '', client_address: '', client_phone: '', client_email: '', referral_source: '', project_number: `PRJ-${Date.now().toString().slice(-6)}`,
    project_type: 'residential_remodel', project_address: '', property_owner: '', scope_of_work: '', executive_summary: '',
    cover_title: 'Project Proposal', cover_subtitle: '', cover_photo_url: '',
    schedule_start_date: '', schedule_end_date: '', milestones: [], categories: [], hide_markups: false,
    overall_markup_percentage: 0, overall_markup_type: 'percentage', tax_amount: 0, tax_type: 'percentage', discount_amount: 0, discount_type: 'percentage',
    contingency_percentage: 10, round_up_type: 'none', assumptions: '', terms_and_conditions_url: '', attachments: [], status: 'draft', change_orders: []
  };

  const [form, setForm] = useState(defaultState);

  useEffect(() => {
    if (!id || initialLoadRef.current) return;
    
    const timer = setTimeout(async () => {
      setAutoSaveStatus('Saving...');
      try {
        isOwnSaveRef.current = true;
        await base44.entities.Proposal.update(id, form);
        setAutoSaveStatus('Saved');
        setTimeout(() => setAutoSaveStatus(''), 2000);
        setTimeout(() => { isOwnSaveRef.current = false; }, 1000);
      } catch (err) {
        setAutoSaveStatus('Failed to save');
        isOwnSaveRef.current = false;
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [form, id]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    if (id) {
      setIsLoading(true);
      base44.entities.Proposal.get(id).then(data => {
        if (data.categories) {
          data.categories.forEach(c => {
            if (c.line_items) {
              c.line_items.forEach(li => {
                if (!li._id) li._id = Math.random().toString(36).substr(2, 9);
              });
            }
          });
        }
        setForm({ ...defaultState, ...data });
        setIsLoading(false);
        setTimeout(() => { initialLoadRef.current = false; }, 500);
      });

      const unsubscribe = base44.entities.Proposal.subscribe((event) => {
        if (event.type === 'update' && event.id === id && !isOwnSaveRef.current) {
          if (Date.now() - lastEditTimeRef.current > 10000) {
            setForm(prev => {
              toast('Proposal was updated by another collaborator', {
                description: 'The latest changes have been loaded.',
                icon: <Save className="w-4 h-4 text-blue-500" />
              });
              const newData = { ...event.data };
              if (newData.categories) {
                newData.categories.forEach(c => {
                  if (c.line_items) {
                    c.line_items.forEach(li => {
                      if (!li._id) li._id = Math.random().toString(36).substr(2, 9);
                    });
                  }
                });
              }
              return { ...prev, ...newData };
            });
          }
        }
      });
      return () => unsubscribe();
    } else {
      initialLoadRef.current = false;
    }
  }, [id]);

  const updateForm = (field, value) => {
    lastEditTimeRef.current = Date.now();
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addAttachment = () => {
    setForm(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), { name: '', description: '' }]
    }));
  };

  const updateAttachment = (index, field, value) => {
    lastEditTimeRef.current = Date.now();
    setForm(prev => {
      const newAtts = [...(prev.attachments || [])];
      newAtts[index] = { ...newAtts[index], [field]: value };
      return { ...prev, attachments: newAtts };
    });
  };

  const removeAttachment = (index) => {
    lastEditTimeRef.current = Date.now();
    setForm(prev => {
      const newAtts = [...(prev.attachments || [])];
      newAtts.splice(index, 1);
      return { ...prev, attachments: newAtts };
    });
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
    lastEditTimeRef.current = Date.now();
    setForm(prev => {
      const newCategories = [...(prev.categories || [])];
      newCategories[catIndex] = { ...newCategories[catIndex] };
      newCategories[catIndex].line_items = [...(newCategories[catIndex].line_items || [])];
      newCategories[catIndex].line_items.push({
        _id: Math.random().toString(36).substr(2, 9),
        description: '', quantity: 1, unit: 'ea', cost_per_unit: 0, markup_percentage: 0, note: '', show_note: false
      });
      return { ...prev, categories: newCategories };
    });
  };

  const handleDragEnd = (result, catIndex) => {
    if (!result.destination) return;
    
    lastEditTimeRef.current = Date.now();
    setForm(prev => {
      const newCategories = [...(prev.categories || [])];
      const category = { ...newCategories[catIndex] };
      const items = Array.from(category.line_items || []);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      category.line_items = items;
      newCategories[catIndex] = category;
      return { ...prev, categories: newCategories };
    });
  };

  const handleCategoryDragEnd = (result) => {
    if (!result.destination) return;
    lastEditTimeRef.current = Date.now();
    setForm(prev => {
      const newCategories = Array.from(prev.categories || []);
      const [moved] = newCategories.splice(result.source.index, 1);
      newCategories.splice(result.destination.index, 0, moved);
      return { ...prev, categories: newCategories };
    });
  };

  const updateLineItem = (catIndex, itemIndex, field, value) => {
    lastEditTimeRef.current = Date.now();
    setForm(prev => {
      const newCategories = [...(prev.categories || [])];
      newCategories[catIndex] = { ...newCategories[catIndex] };
      newCategories[catIndex].line_items = [...(newCategories[catIndex].line_items || [])];
      newCategories[catIndex].line_items[itemIndex] = { ...newCategories[catIndex].line_items[itemIndex], [field]: value };
      return { ...prev, categories: newCategories };
    });
  };

  const removeLineItem = (catIndex, itemIndex) => {
    lastEditTimeRef.current = Date.now();
    setForm(prev => {
      const newCategories = [...(prev.categories || [])];
      newCategories[catIndex] = { ...newCategories[catIndex] };
      newCategories[catIndex].line_items = newCategories[catIndex].line_items.filter((_, i) => i !== itemIndex);
      return { ...prev, categories: newCategories };
    });
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropImageSrc(reader.result?.toString() || '');
      setCropModalOpen(true);
    });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedFile) => {
    setIsSaving(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: croppedFile });
      updateForm('cover_photo_url', file_url);
    } catch (err) {
      alert("Failed to upload photo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSpellCheck = async () => {
    setIsChecking(true);
    toast("Running AI spell check on text fields...", { icon: '✨' });
    try {
      const fieldsToCheck = ['executive_summary', 'scope_of_work', 'assumptions'];
      let updates = {};
      
      for (const field of fieldsToCheck) {
        if (form[field] && form[field].trim().length > 0) {
          const res = await base44.integrations.Core.InvokeLLM({
            prompt: `You are an expert proofreader. Fix any spelling and grammar errors in the following text. Do NOT change the formatting or HTML tags if present. Only return the corrected text, without any conversational remarks.\n\nText:\n${form[field]}`
          });
          if (res && res !== form[field]) {
            updates[field] = res;
          }
        }
      }
      
      if (Object.keys(updates).length > 0) {
        lastEditTimeRef.current = Date.now();
        setForm(prev => ({ ...prev, ...updates }));
        toast.success("Spell check complete! Issues were fixed.");
      } else {
        toast.success("Spell check complete! No issues found.");
      }
    } catch (e) {
      toast.error("Spell check failed");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    const name = window.prompt("Enter a name for this template:");
    if (!name) return;
    setIsSaving(true);
    try {
      await base44.entities.ProposalTemplate.create({
        name,
        project_type: form.project_type,
        scope_of_work: form.scope_of_work,
        executive_summary: form.executive_summary,
        categories: form.categories,
        round_up_type: form.round_up_type
      });
      toast.success("Template saved successfully");
      fetchTemplates();
    } catch (e) {
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadTemplate = (templateId) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    if (!window.confirm(`Load template "${tpl.name}"? This will overwrite your current scope and line items.`)) return;
    
    lastEditTimeRef.current = Date.now();
    const newCategories = (tpl.categories || []).map(c => ({
      ...c,
      line_items: (c.line_items || []).map(li => ({ ...li, _id: Math.random().toString(36).substr(2, 9) }))
    }));

    setForm(prev => ({
      ...prev,
      project_type: tpl.project_type || prev.project_type,
      scope_of_work: tpl.scope_of_work || prev.scope_of_work,
      executive_summary: tpl.executive_summary || prev.executive_summary,
      categories: newCategories,
      round_up_type: tpl.round_up_type || prev.round_up_type
    }));
    toast.success("Template loaded");
  };

  const handleSave = async () => {
    if (!form.client_name || !form.client_email || !form.project_address) {
      alert("Please fill in required fields: Client Name, Email, Project Address");
      return;
    }
    setIsSaving(true);
    isOwnSaveRef.current = true;
    try {
      if (id) {
        await base44.entities.Proposal.update(id, form);
        toast.success("Proposal saved successfully");
      } else {
        const newProposal = await base44.entities.Proposal.create(form);
        toast.success("Proposal created successfully");
        navigate(createPageUrl(`ProposalForm?id=${newProposal.id}`), { replace: true });
      }
    } catch (e) {
      alert("Failed to save proposal");
    } finally {
      setIsSaving(false);
      setTimeout(() => { isOwnSaveRef.current = false; }, 1000);
    }
  };

  if (isLoading || !user) return <div className="p-8">Loading...</div>;
  if (user.role === 'client') return <div className="p-8">Unauthorized</div>;

  const totals = computeTotals(form);

  return (
    <div className="max-w-[120rem] mx-auto px-4 space-y-8 pb-40 animate-in fade-in">
      <div className="flex items-center justify-between sticky top-0 bg-[#F3F4F6] pt-4 pb-4 z-10 border-b border-gray-200 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-white shadow-sm border border-gray-200">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-black text-gray-900">{id ? 'Edit Proposal' : 'New Proposal'}</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {autoSaveStatus && (
            <span className="text-sm font-medium text-gray-500 animate-in fade-in hidden md:inline">
              {autoSaveStatus}
            </span>
          )}
          <Button onClick={() => navigate(createPageUrl(`ProposalDetails?id=${id}`))} disabled={!id || isSaving} variant="outline" className="border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-bold px-3">
            <Printer className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Print Preview</span>
          </Button>
          <Button onClick={handleSaveAsTemplate} disabled={isSaving} variant="outline" className="border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-bold px-3">
            <BookmarkPlus className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Save as Template</span>
          </Button>
          <Button onClick={handleSpellCheck} disabled={isChecking || isSaving} variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold px-3">
            ✨ <span className="hidden md:inline">{isChecking ? 'Checking...' : 'AI Spell Check'}</span>
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-md font-bold px-4">
            <Save className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">{isSaving ? 'Saving...' : 'Save Proposal'}</span>
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-8 pb-32">
          
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
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-gray-700">Cover Photo</Label>
                  {form.cover_photo_url && (
                    <Button variant="ghost" size="sm" onClick={() => updateForm('cover_photo_url', '')} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2">
                      <Trash2 className="w-4 h-4 mr-1" /> Remove Photo
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*" onChange={handlePhotoSelect} className="bg-gray-50 border-gray-200 focus:bg-white" />
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
            <datalist id="common-tasks">
              <option value="Demolition" />
              <option value="Wood Framing" />
              <option value="Metal Framing" />
              <option value="Hang & Finish Drywall" />
              <option value="Interior Painting" />
              <option value="Exterior Painting" />
              <option value="Hardwood Flooring" />
              <option value="Carpet Installation" />
              <option value="Trim & Millwork" />
              <option value="Cabinetry" />
              <option value="Countertops" />
              <option value="Plumbing Rough-in" />
              <option value="Plumbing Fixtures" />
              <option value="Electrical Rough-in" />
              <option value="Electrical Fixtures" />
              <option value="HVAC Ductwork" />
              <option value="HVAC Equipment" />
              <option value="Concrete Footings" />
              <option value="Slab on Grade" />
              <option value="Asphalt Shingle Roofing" />
              <option value="Drop Ceiling Grid & Tiles" />
              <option value="Final Cleaning" />
            </datalist>

            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-4 mb-6 gap-4">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">Line-Item Costs</h2>
              <div className="flex items-center gap-3">
                {templates.length > 0 && (
                  <Select onValueChange={handleLoadTemplate}>
                    <SelectTrigger className="w-[200px] border-gray-300">
                      <Copy className="w-4 h-4 mr-2 text-gray-500" />
                      <SelectValue placeholder="Load Template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={addCategory} variant="outline" size="sm" className="font-bold border-gray-300">
                  <Plus className="w-4 h-4 mr-2" /> Add Category
                </Button>
              </div>
            </div>

            {(!form.categories || form.categories.length === 0) && (
              <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-medium">
                No categories added yet. Add a category like "Materials" or "Labor" to start estimating.
              </div>
            )}

            <DragDropContext onDragEnd={handleCategoryDragEnd}>
              <Droppable droppableId="categories">
                {(catProvided) => (
            <div className="space-y-8" {...catProvided.droppableProps} ref={catProvided.innerRef}>
              {form.categories?.map((cat, catIndex) => (
                <Draggable key={`cat-${catIndex}`} draggableId={`cat-${catIndex}`} index={catIndex}>
                  {(catDraggable) => (
                <div ref={catDraggable.innerRef} {...catDraggable.draggableProps} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4 gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <div {...catDraggable.dragHandleProps} className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <Input 
                        value={cat.name} 
                        onChange={e => {
                          lastEditTimeRef.current = Date.now();
                          setForm(prev => {
                            const newCategories = [...(prev.categories || [])];
                            newCategories[catIndex] = { ...newCategories[catIndex], name: e.target.value };
                            return { ...prev, categories: newCategories };
                          });
                        }}
                        className="text-lg font-bold text-blue-900 bg-transparent border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white h-auto py-1 px-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => removeCategory(catIndex)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <DragDropContext onDragEnd={(result) => handleDragEnd(result, catIndex)}>
                      <Droppable droppableId={`category-${catIndex}`}>
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                            {cat.line_items?.map((item, itemIndex) => {
                              const itemSub = (item.quantity || 0) * (item.cost_per_unit || 0) * (1 + (item.markup_percentage || 0)/100);
                              const itemDistMarkup = (!item.exclude_from_markup && totals.totalLineItemsForMarkup > 0) ? (totals.distMarkup / totals.totalLineItemsForMarkup) : 0;
                              const itemTotalWithOverallMarkup = itemSub + itemDistMarkup;
                              const itemId = item._id || `item-fallback-${catIndex}-${itemIndex}`;

                              return (
                                <Draggable key={itemId} draggableId={itemId} index={itemIndex}>
                                  {(provided) => (
                                    <div 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="flex flex-col gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative pt-5"
                                    >
                                      <div className="absolute top-1 left-1" {...provided.dragHandleProps}>
                                        <div className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                                          <GripVertical className="w-4 h-4" />
                                        </div>
                                      </div>
                                      <div className="absolute top-1 right-1">
                                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(catIndex, itemIndex)} className="text-gray-400 hover:text-red-500 h-7 w-7">
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>

                                      <div className="flex flex-col md:flex-row gap-3 pr-6 pl-4 md:pl-6">
                                        <div className="flex-1 space-y-1">
                                          <Label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Description</Label>
                                          <Input 
                                            list="common-tasks"
                                            value={item.description} 
                                            onChange={e => updateLineItem(catIndex, itemIndex, 'description', e.target.value)} 
                                            placeholder="Item Description" 
                                            className="border-gray-200 h-8 text-sm" 
                                          />
                                        </div>

                                        <div className="flex flex-wrap md:flex-nowrap gap-2">
                                          <div className="space-y-1 w-16">
                                            <Label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center block">Qty</Label>
                                            <Input 
                                              type="number" 
                                              value={item.quantity} 
                                              onChange={e => updateLineItem(catIndex, itemIndex, 'quantity', parseFloat(e.target.value) || 0)} 
                                              className="border-gray-200 text-center px-1 h-8 text-sm" 
                                            />
                                          </div>
                                          <div className="space-y-1 w-16">
                                            <Label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center block">Unit</Label>
                                            <Input 
                                              value={item.unit} 
                                              onChange={e => updateLineItem(catIndex, itemIndex, 'unit', e.target.value.toUpperCase())} 
                                              className="border-gray-200 text-center px-1 h-8 text-sm uppercase" 
                                            />
                                          </div>
                                          <div className="space-y-1 w-20">
                                            <Label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-right block">Cost</Label>
                                            <Input 
                                              type="number" 
                                              step="0.01"
                                              value={item.cost_per_unit} 
                                              onChange={e => updateLineItem(catIndex, itemIndex, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                                              onBlur={e => updateLineItem(catIndex, itemIndex, 'cost_per_unit', Math.round((parseFloat(e.target.value) || 0) * 100) / 100)}
                                              className="border-gray-200 text-right px-2 h-8 text-sm" 
                                            />
                                          </div>
                              <div className="space-y-1 w-16">
                                <Label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-right block">Mkp %</Label>
                                <Input 
                                  type="number" 
                                  value={item.markup_percentage} 
                                  onChange={e => updateLineItem(catIndex, itemIndex, 'markup_percentage', parseFloat(e.target.value) || 0)} 
                                  className="border-gray-200 text-right px-1 h-8 text-sm" 
                                />
                              </div>
                              <div className="space-y-1 w-24 flex flex-col justify-end pb-0.5">
                                <div className="flex flex-col text-right">
                                  <span className="font-bold text-gray-900 text-base leading-none" title="Cost (Without Overall Markup)">${itemSub.toFixed(2)}</span>
                                  <span className="text-[9px] text-blue-600 font-semibold leading-tight mt-0.5" title="Cost (With Overall Markup)">w/ mkp: ${itemTotalWithOverallMarkup.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 mt-1 border-t border-gray-50 pt-2">
                            <div className="w-full space-y-1">
                              <Label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Item Note (Optional)</Label>
                              <Textarea 
                                value={item.note || ''} 
                                onChange={e => updateLineItem(catIndex, itemIndex, 'note', e.target.value)} 
                                placeholder="Add a detailed note..." 
                                className="w-full text-xs border-gray-200 bg-gray-50 min-h-[40px] h-10 resize-y py-1 px-2" 
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={item.show_note || false} 
                                  onChange={e => updateLineItem(catIndex, itemIndex, 'show_note', e.target.checked)} 
                                  className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                Show note on PDF
                              </Label>
                              <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={item.exclude_from_markup || false} 
                                  onChange={e => updateLineItem(catIndex, itemIndex, 'exclude_from_markup', e.target.checked)} 
                                  className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                Exclude from overall markup
                              </Label>
                            </div>
                          </div>
                        </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                    <Button onClick={() => addLineItem(catIndex)} variant="ghost" size="sm" className="w-full mt-2 border border-dashed border-gray-300 text-blue-600 hover:bg-blue-50 font-bold">
                      <Plus className="w-4 h-4 mr-2" /> Add Line Item
                    </Button>
                  </div>
                  </div>
                  )}
                  </Draggable>
                  ))}
                  {catProvided.placeholder}
            </div>
                )}
              </Droppable>
            </DragDropContext>
            
            {form.categories?.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                <Button onClick={addCategory} variant="outline" className="font-bold border-gray-300 w-full max-w-sm">
                  <Plus className="w-4 h-4 mr-2" /> Add Another Category
                </Button>
              </div>
            )}
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

      {/* Fixed Footer: Calculations */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-900 text-white border-t border-blue-800 z-50 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.3)]">
        <div className="max-w-[120rem] mx-auto px-4 py-4">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-4 xl:gap-8">
            <div className="flex items-center gap-2 mb-2 xl:mb-0 hidden md:flex">
              <Calculator className="w-5 h-5 text-blue-300" />
              <h2 className="text-lg font-black uppercase tracking-wider whitespace-nowrap">Calculations</h2>
            </div>
            
            <div className="flex-1 flex flex-wrap items-center justify-center xl:justify-end gap-x-6 gap-y-3">
              <div className="flex flex-col items-center">
                <span className="text-blue-200 text-[10px] font-bold uppercase tracking-wider">Items Subtotal</span>
                <span className="font-bold">${totals.subtotal.toFixed(2)}</span>
              </div>
              
              <div className="h-8 w-px bg-blue-800 hidden sm:block"></div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <Label className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Overall Markup</Label>
                  <div className="flex gap-1">
                    <Input 
                      type="number" 
                      value={form.overall_markup_percentage} 
                      onChange={e => updateForm('overall_markup_percentage', parseFloat(e.target.value) || 0)} 
                      className="bg-blue-800 border-blue-700 text-white h-8 w-20 text-sm" 
                    />
                    <Select value={form.overall_markup_type || 'percentage'} onValueChange={v => updateForm('overall_markup_type', v)}>
                      <SelectTrigger className="bg-blue-800 border-blue-700 text-white h-8 w-16 text-xs px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="flat">$ Flat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-blue-800 hidden sm:block"></div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <Label className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Discount</Label>
                  <div className="flex gap-1">
                    <Input 
                      type="number" 
                      value={form.discount_amount} 
                      onChange={e => updateForm('discount_amount', parseFloat(e.target.value) || 0)} 
                      className="bg-blue-800 border-blue-700 text-white h-8 w-20 text-sm" 
                    />
                    <Select value={form.discount_type} onValueChange={v => updateForm('discount_type', v)}>
                      <SelectTrigger className="bg-blue-800 border-blue-700 text-white h-8 w-16 text-xs px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="flat">$ Flat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-blue-800 hidden sm:block"></div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <Label className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Tax</Label>
                  <div className="flex gap-1">
                    <Input 
                      type="number" 
                      value={form.tax_amount} 
                      onChange={e => updateForm('tax_amount', parseFloat(e.target.value) || 0)} 
                      className="bg-blue-800 border-blue-700 text-white h-8 w-20 text-sm" 
                    />
                    <Select value={form.tax_type} onValueChange={v => updateForm('tax_type', v)}>
                      <SelectTrigger className="bg-blue-800 border-blue-700 text-white h-8 w-16 text-xs px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="flat">$ Flat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-blue-800 hidden sm:block"></div>

              <div className="flex flex-col">
                <Label className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Contingency (%)</Label>
                <Input 
                  type="number" 
                  value={form.contingency_percentage} 
                  onChange={e => updateForm('contingency_percentage', parseFloat(e.target.value) || 0)} 
                  className="bg-blue-800 border-blue-700 text-white h-8 w-20 text-sm" 
                />
              </div>

              <div className="h-8 w-px bg-blue-800 hidden sm:block"></div>

              <div className="flex flex-col">
                <Label className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Round Up</Label>
                <Select value={form.round_up_type || 'none'} onValueChange={v => updateForm('round_up_type', v)}>
                  <SelectTrigger className="bg-blue-800 border-blue-700 text-white h-8 w-24 text-xs px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="dollar">Nearest $1</SelectItem>
                    <SelectItem value="ten">Nearest $10</SelectItem>
                    <SelectItem value="hundred">Nearest $100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-8 w-px bg-blue-800 hidden sm:block"></div>

              <div className="flex flex-col items-end min-w-[120px]">
                <span className="text-blue-200 text-[10px] font-bold uppercase tracking-wider">Grand Total</span>
                <span className="text-2xl font-black text-white leading-none">${totals.grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-8 border-t border-gray-200 pt-8">
        <Button onClick={handleSpellCheck} disabled={isChecking || isSaving} variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl font-bold px-8 py-6 text-lg w-full md:w-auto">
          ✨ {isChecking ? 'Checking...' : 'AI Spell Check'}
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-md font-bold px-8 py-6 text-lg w-full md:w-auto">
          <Save className="w-5 h-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Proposal'}
        </Button>
      </div>

      <ImageCropper 
        open={cropModalOpen} 
        onOpenChange={setCropModalOpen} 
        imageSrc={cropImageSrc} 
        onCropComplete={handleCropComplete} 
      />
    </div>
  );
}