import React, { useState, useEffect } from 'react';
import { Download, Search, FileText, Trash2 } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  interestedJobs: string | null;
  cvFileName: string | null;
  originalCvFileName?: string | null;
  status?: string | null;
  createdAt: string;
}

export function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/candidates`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCV = (filename: string, candidateName: string, originalName?: string | null) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (!filename) {
      alert("No CV file available for this candidate.");
      return;
    }
    const downloadUrl = `${apiUrl}/api/candidates/download/${filename}`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    // Set a nice filename for the downloaded file
    const ext = filename.split('.').pop() || 'pdf';
    link.download = originalName || `${candidateName.replace(/\s+/g, '_')}_CV.${ext}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteCandidate = async (id: string, candidateName: string) => {
    if (!window.confirm(`Are you sure you want to delete candidate "${candidateName}"?`)) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/candidates/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCandidates(prev => prev.filter(c => c.id !== id));
      } else {
        alert("Failed to delete candidate.");
      }
    } catch (error) {
      alert("Error deleting candidate.");
    }
  };

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.interestedJobs?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full min-h-0 flex-col p-8">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Candidates</h1>
          <p className="text-white/40 text-sm">Review submitted CVs and candidate profiles</p>
        </div>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-[16px] flex flex-col min-h-0 flex-1">
        <div className="p-4 border-b border-white/8 flex items-center justify-between bg-white/1 shrink-0 rounded-t-[16px]">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#04a891] focus:border-transparent transition-all"
            />
          </div>
          <div className="text-sm text-white/40 font-medium px-4">
            {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/8 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Candidate</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Contact</th>
                <th className="px-6 py-4 font-semibold tracking-wider">CV File</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Interested Roles</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Date Submitted</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                    Loading candidates...
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                    No candidates found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{c.name || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">{c.email}</div>
                      {c.phone && <div className="text-white/50 text-xs mt-1">{c.phone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      {c.cvFileName ? (
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-[#04a891] shrink-0" />
                          <span className="text-xs text-white/90 font-mono truncate max-w-[180px]" title={c.originalCvFileName || c.cvFileName}>
                            {c.originalCvFileName || c.cvFileName}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Pending CV
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {c.interestedJobs ? (
                        <div className="flex flex-wrap gap-1">
                          {c.interestedJobs.split(',').map((job, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#04a891]/20 text-[#04a891]">
                              {job.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-white/50">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.cvFileName ? (
                          <button
                            onClick={() => handleDownloadCV(c.cvFileName!, c.name || 'Candidate', c.originalCvFileName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#04a891]/20 hover:bg-[#04a891]/30 text-[#04a891] border border-[#04a891]/30 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          >
                            <Download size={14} />
                            Download CV
                          </button>
                        ) : (
                          <span className="text-xs text-white/30 italic px-2 py-1">No CV File</span>
                        )}
                        <button
                          onClick={() => handleDeleteCandidate(c.id, c.name || c.email)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors cursor-pointer ml-1"
                          title="Delete Candidate"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
