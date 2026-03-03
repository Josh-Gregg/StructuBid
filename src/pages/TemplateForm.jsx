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
import { Plus, Trash2, Save, ArrowLeft, GripVertical } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function TemplateForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initialLoadRef = useRef(true);

  const defaultState = {
    name: 'New Template',
    project_type: 'residential_remodel',
    scope_of_work: '',
    executive_summary: '',
    categories: [],
    round_up_type: 'none'
  };

  const [form, setForm] = useState(defaultState);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      base44.entities.ProposalTemplate.get(id).then(data => {
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
      });
    }
  }, [id]);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
    setForm(prev => {
      const newCategories = [...(prev.categories || [])];
      newCategories[catIndex] = { ...newCategories[catIndex] };
      newCategories[catIndex].line_items = [...(newCategories[catIndex].line_items || [])];
      newCategories[catIndex].line_items.push({
        _id: Math.random().toString(36).substr(2, 9),
        description: '', quantity: 1, unit: 'EA', cost_per_unit: 0, markup_percentage: 0, note: '', show_note: false
      });
      return { ...prev, categories: newCategories };
    });
  };

  const updateLineItem = (catIndex, itemIndex, field, value) => {
    setForm(prev => {
      const newCategories = [...(prev.categories || [])];
      newCategories[catIndex] = { ...newCategories[catIndex] };
      newCategories[catIndex].line_items = [...(newCategories[catIndex].line_items || [])];
      newCategories[catIndex].line_items[itemIndex] = { ...newCategories[catIndex].line_items[itemIndex], [field]: value };
      return { ...prev, categories: newCategories };
    });
  };

  const removeLineItem = (catIndex, itemIndex) => {
    setForm(prev => {
      const newCategories = [...(prev.categories || [])];
      newCategories[catIndex] = { ...newCategories[catIndex] };
      newCategories[catIndex].line_items = newCategories[catIndex].line_items.filter((_, i) => i !== itemIndex);
      return { ...prev, categories: newCategories };
    });
  };

  const handleDragEnd = (result, catIndex) => {
    if (!result.destination) return;
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

  const handleSave = async () => {
    if (!form.name) {
      alert("Please provide a template name");
      return;
    }
    setIsSaving(true);
    try {
      if (id) {
        await base44.entities.ProposalTemplate.update(id, form);
        toast.success("Template updated successfully");
      } else {
        const newTpl = await base44.entities.ProposalTemplate.create(form);
        toast.success("Template created successfully");
        navigate(createPageUrl(`TemplateForm?id=${newTpl.id}`), { replace: true });
      }
    } catch (e) {
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-8 pb-32 animate-in fade-in">
      <div className="flex items-center justify-between sticky top-0 bg-[#F3F4F6] pt-4 pb-4 z-10 border-b border-gray-200 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-white shadow-sm border border-gray-200">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-black text-gray-900">{id ? 'Edit Template' : 'New Template'}</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-md font-bold px-6">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Template'}
        </Button>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-4 mb-6 uppercase tracking-wider">Template Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="font-bold text-gray-700">Template Name *</Label>
            <Input value={form.name} onChange={e => updateForm('name', e.target.value)} className="bg-gray-50 border-gray-200" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-gray-700">Project Type</Label>
            <Select value={form.project_type} onValueChange={v => updateForm('project_type', v)}>
              <SelectTrigger className="bg-gray-50 border-gray-200">
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
          <div className="space-y-2">
            <Label className="font-bold text-gray-700">Round Up Method</Label>
            <Select value={form.round_up_type || 'none'} onValueChange={v => updateForm('round_up_type', v)}>
              <SelectTrigger className="bg-gray-50 border-gray-200">
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
          <div className="space-y-2 md:col-span-2">
            <Label className="font-bold text-gray-700">Scope of Work</Label>
            <ReactQuill theme="snow" value={form.scope_of_work} onChange={val => updateForm('scope_of_work', val)} className="bg-white" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="font-bold text-gray-700">Executive Summary</Label>
            <Textarea value={form.executive_summary} onChange={e => updateForm('executive_summary', e.target.value)} rows={3} className="bg-gray-50 border-gray-200 resize-y" />
          </div>
        </div>
      </div>

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

        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">Line-Item Costs</h2>
          <Button onClick={addCategory} variant="outline" size="sm" className="font-bold border-gray-300">
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </Button>
        </div>

        {(!form.categories || form.categories.length === 0) && (
          <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-medium">
            No categories added yet. Add a category to build this template.
          </div>
        )}

        <div className="space-y-8">
          {form.categories?.map((cat, catIndex) => (
            <div key={catIndex} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4 gap-4">
                <Input 
                  value={cat.name} 
                  onChange={e => {
                    setForm(prev => {
                      const newCategories = [...(prev.categories || [])];
                      newCategories[catIndex] = { ...newCategories[catIndex], name: e.target.value };
                      return { ...prev, categories: newCategories };
                    });
                  }}
                  className="text-lg font-bold text-blue-900 bg-transparent border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white h-auto py-1 px-2 -ml-2"
                />
                <Button variant="ghost" size="sm" onClick={() => removeCategory(catIndex)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <DragDropContext onDragEnd={(result) => handleDragEnd(result, catIndex)}>
                  <Droppable droppableId={`template-cat-${catIndex}`}>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {cat.line_items?.map((item, itemIndex) => {
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
          ))}
        </div>
      </div>
    </div>
  );
}