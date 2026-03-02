import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileText, DollarSign, Percent, TrendingUp, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { computeTotals } from '../components/proposalUtils';
import { toast } from 'sonner';

export default function Home() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date', 100)
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Proposal.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update status');
    }
  });

  const deleteProposalMutation = useMutation({
    mutationFn: (id) => base44.entities.Proposal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete proposal');
    }
  });

  const copyProposalMutation = useMutation({
    mutationFn: async (proposal) => {
      const { id, created_date, updated_date, created_by, ...copyData } = proposal;
      copyData.project_number = `${copyData.project_number}-COPY`;
      copyData.status = 'draft';
      return await base44.entities.Proposal.create(copyData);
    },
    onSuccess: (newProposal) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal copied successfully');
      navigate(createPageUrl(`ProposalForm?id=${newProposal.id}`));
    },
    onError: () => {
      toast.error('Failed to copy proposal');
    }
  });

  const handleStatusChange = (id, newStatus) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this proposal? This action cannot be undone.')) {
      deleteProposalMutation.mutate(id);
    }
  };

  const handleCopy = (proposal) => {
    copyProposalMutation.mutate(proposal);
  };

  if (isLoading || !user) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-6 py-1"><div className="h-4 bg-gray-200 rounded w-1/4"></div><div className="space-y-3"><div className="grid grid-cols-3 gap-4"><div className="h-24 bg-gray-200 rounded col-span-1"></div><div className="h-24 bg-gray-200 rounded col-span-1"></div><div className="h-24 bg-gray-200 rounded col-span-1"></div></div></div></div></div>;

  const userProposals = user.role === 'client' 
    ? proposals.filter(p => p.client_email === user.email)
    : proposals;

  const totalValueCalc = userProposals.reduce((sum, p) => sum + computeTotals(p).grandTotal, 0);
  
  const sentAndAccepted = userProposals.filter(p => p.status === 'sent' || p.status === 'accepted' || p.status === 'rejected');
  const accepted = userProposals.filter(p => p.status === 'accepted');
  const winRate = sentAndAccepted.length ? (accepted.length / sentAndAccepted.length) * 100 : 0;

  const avgContingency = userProposals.length 
    ? userProposals.reduce((sum, p) => sum + (p.contingency_percentage || 0), 0) / userProposals.length
    : 0;

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user.full_name}</p>
        </div>
      </div>
      
      {user.role !== 'client' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <DollarSign className="w-16 h-16 text-blue-600" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-900">${totalValueCalc.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
              <p className="text-sm font-medium text-blue-600 mt-2">{userProposals.length} total proposals</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-16 h-16 text-blue-600" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-900">{winRate.toFixed(1)}%</div>
              <p className="text-sm font-medium text-green-600 mt-2">{accepted.length} accepted out of {sentAndAccepted.length} sent</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Percent className="w-16 h-16 text-blue-600" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Avg Contingency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-900">{avgContingency.toFixed(1)}%</div>
              <p className="text-sm font-medium text-gray-500 mt-2">Across all proposals</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <FileText className="w-16 h-16 text-blue-600" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-900">{userProposals.filter(p => new Date(p.created_date) > new Date(Date.now() - 30*24*60*60*1000)).length}</div>
              <p className="text-sm font-medium text-gray-500 mt-2">Proposals in last 30 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Proposals</h2>
          <Link to={createPageUrl('Proposals')} className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center">
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
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
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {userProposals.slice(0, 6).map(p => (
                  <tr key={p.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{p.project_number || 'N/A'}</div>
                      <div className="text-xs text-gray-500 mt-0.5 capitalize">{p.project_type?.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{p.client_name}</div>
                      <div className="text-xs text-gray-500">{p.company_name}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{new Date(p.created_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {user.role === 'client' ? (
                        <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${statusColors[p.status || 'draft']}`}>
                          {p.status || 'draft'}
                        </span>
                      ) : (
                        <select 
                          className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider cursor-pointer border-0 outline-none focus:ring-2 focus:ring-blue-500 appearance-none ${statusColors[p.status || 'draft']}`}
                          value={p.status || 'draft'}
                          onChange={(e) => handleStatusChange(p.id, e.target.value)}
                        >
                          <option value="draft">DRAFT</option>
                          <option value="sent">SENT</option>
                          <option value="accepted">ACCEPTED</option>
                          <option value="rejected">REJECTED</option>
                          <option value="completed">COMPLETED</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-gray-900">
                      ${computeTotals(p).grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link to={createPageUrl(`ProposalDetails?id=${p.id}`)} className="inline-flex items-center justify-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-700 transition-colors shadow-sm">
                          View
                        </Link>
                        
                        {user.role !== 'client' && (
                          <>
                            <button 
                              onClick={() => handleCopy(p)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Copy Proposal"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(p.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete Proposal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {userProposals.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 font-medium">No proposals found. Let's build something great!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}