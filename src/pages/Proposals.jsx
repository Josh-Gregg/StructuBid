import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, Filter, PlusCircle, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { computeTotals } from '../components/proposalUtils';

export default function Proposals() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date', 500)
  });

  if (isLoading || !user) return <div className="p-8">Loading...</div>;

  let filtered = user.role === 'client' 
    ? proposals.filter(p => p.client_email === user.email)
    : proposals;

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(p => 
      (p.client_name || '').toLowerCase().includes(term) ||
      (p.project_number || '').toLowerCase().includes(term) ||
      (p.project_address || '').toLowerCase().includes(term)
    );
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter(p => (p.status || 'draft') === statusFilter);
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Proposals</h1>
          <p className="text-gray-500 mt-1">Manage all your estimates and proposals</p>
        </div>
        
        {['admin', 'team_member'].includes(user?.role) && (
          <Link
            to={createPageUrl('ProposalForm')}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-md"
          >
            <PlusCircle className="w-5 h-5" />
            Create Proposal
          </Link>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder="Search by client, project number, or address..." 
            className="pl-10 h-12 bg-gray-50 border-transparent focus:bg-white transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative min-w-[200px]">
          <select 
            className="w-full h-12 pl-4 pr-10 rounded-md border border-gray-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-gray-500 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Grand Total</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      {p.project_number || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">{p.project_type?.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">{p.project_address}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{p.client_name}</div>
                    <div className="text-xs text-gray-500">{p.company_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.client_email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{new Date(p.created_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${statusColors[p.status || 'draft']}`}>
                      {p.status || 'draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-gray-900">
                    ${computeTotals(p).grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link to={createPageUrl(`ProposalDetails?id=${p.id}`)} className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-700 transition-colors shadow-sm">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-lg text-gray-600">No proposals found</p>
                    <p className="text-sm">Try adjusting your filters or create a new one.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}