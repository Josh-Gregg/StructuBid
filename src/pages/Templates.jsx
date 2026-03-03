import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit, Copy, BookmarkPlus } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      const data = await base44.entities.ProposalTemplate.list();
      setTemplates(data);
    } catch (e) {
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await base44.entities.ProposalTemplate.delete(id);
      toast.success("Template deleted");
      fetchTemplates();
    } catch (e) {
      toast.error("Failed to delete template");
    }
  };

  const handleCopy = async (tpl) => {
    try {
      const { id, created_date, updated_date, created_by, ...rest } = tpl;
      await base44.entities.ProposalTemplate.create({
        ...rest,
        name: `${tpl.name} (Copy)`
      });
      toast.success("Template copied");
      fetchTemplates();
    } catch (e) {
      toast.error("Failed to copy template");
    }
  };

  const handleRename = async (id, currentName) => {
    const newName = window.prompt("Enter new template name:", currentName);
    if (!newName || newName === currentName) return;
    try {
      await base44.entities.ProposalTemplate.update(id, { name: newName });
      toast.success("Template renamed");
      fetchTemplates();
    } catch (e) {
      toast.error("Failed to rename template");
    }
  };

  if (isLoading) return <div className="p-8">Loading templates...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Proposal Templates</h1>
          <p className="text-gray-500 mt-2">Manage your reusable proposal templates</p>
        </div>
        <Button onClick={() => navigate(createPageUrl('TemplateForm'))} className="bg-blue-700 hover:bg-blue-800 text-white font-bold">
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map(tpl => (
          <div key={tpl.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900">{tpl.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{tpl.categories?.length || 0} categories, {tpl.categories?.reduce((acc, c) => acc + (c.line_items?.length || 0), 0) || 0} line items</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleRename(tpl.id, tpl.name)}>
                <Edit className="w-4 h-4 mr-2" /> Rename
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl(`TemplateForm?id=${tpl.id}`))}>
                <Edit className="w-4 h-4 mr-2" /> Edit Content
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleCopy(tpl)}>
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(tpl.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-500">
            No templates found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}