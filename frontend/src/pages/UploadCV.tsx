import React, { useState, useRef } from 'react';
import { SEO } from '../components/layout/SEO';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { UploadCloud, CheckCircle, File, X } from 'lucide-react';
import { motion } from 'framer-motion';

export function UploadCVPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interestedJobs, setInterestedJobs] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF or DOCX file.');
      return;
    }
    
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }
    
    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !file) {
      setError('Please fill in all required fields and upload your CV.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('interestedJobs', interestedJobs);
      formData.append('cv', file);
      
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/candidates/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload CV');
      }
      
      setSubmitted(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'An error occurred while uploading. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="Upload CV | Headhunters.lk" description="Submit your CV to Headhunters.lk and let us match you with top career opportunities." />
      <Header />
      <main className="pt-32 pb-20 min-h-[80vh] text-white">
        <div className="px-5 max-w-[800px] mx-auto mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-4 text-[#04a891]">Upload Your CV</h1>
          <p className="text-lg text-white/70">
            Let our consultants match your skills with exclusive roles. Drop your CV below and tell us what you're looking for.
          </p>
        </div>
        
        <div className="px-5 max-w-[700px] mx-auto">
          <motion.div
            className="rounded-[20px] border border-white/10 bg-gradient-to-br from-white/6 to-transparent backdrop-blur-xl p-6 md:p-10"
            initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {submitted ? (
              <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#02695e]/20 border border-[#04a891]/30 grid place-items-center">
                  <CheckCircle size={32} className="text-[#04a891]" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-2xl mb-2">CV Received Successfully!</h3>
                  <p className="text-white/60 text-base max-w-md mx-auto">
                    Thank you for submitting your details. Our consultants will review your profile and reach out if there is a suitable opportunity.
                  </p>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                  Submit another CV
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {error && (
                  <div className="p-4 rounded-[10px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
                      Full Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Jane Doe"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-4 rounded-[10px] border border-white/10 bg-white/6 text-white placeholder:text-white/25 text-sm focus:border-[#04a891]/60 focus:bg-white/8 outline-none transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
                      Email Address *
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="jane@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 px-4 rounded-[10px] border border-white/10 bg-white/6 text-white placeholder:text-white/25 text-sm focus:border-[#04a891]/60 focus:bg-white/8 outline-none transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+94 77 xxx xxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-11 px-4 rounded-[10px] border border-white/10 bg-white/6 text-white placeholder:text-white/25 text-sm focus:border-[#04a891]/60 focus:bg-white/8 outline-none transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="jobs" className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
                    Interested Jobs / Roles
                  </label>
                  <textarea
                    id="jobs"
                    placeholder="e.g. Senior Software Engineer, Product Manager, Tech Lead..."
                    rows={3}
                    value={interestedJobs}
                    onChange={(e) => setInterestedJobs(e.target.value)}
                    className="w-full px-4 py-3 rounded-[10px] border border-white/10 bg-white/6 text-white placeholder:text-white/25 text-sm focus:border-[#04a891]/60 focus:bg-white/8 outline-none transition-all duration-200 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                    Upload CV (PDF or Word) *
                  </label>
                  
                  {file ? (
                    <div className="flex items-center justify-between p-4 rounded-[10px] border border-[#04a891]/40 bg-[#02695e]/10">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <File className="text-[#04a891] shrink-0" size={24} />
                        <div className="truncate">
                          <p className="text-sm font-medium text-white truncate">{file.name}</p>
                          <p className="text-xs text-white/50">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setFile(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full h-36 rounded-[12px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors
                        ${isDragging ? 'border-[#04a891] bg-[#04a891]/5' : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'}`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                        className="hidden" 
                      />
                      <UploadCloud className={`mb-3 ${isDragging ? 'text-[#04a891]' : 'text-white/40'}`} size={32} />
                      <p className="text-sm text-white/80 font-medium mb-1">
                        Drag & drop your CV here
                      </p>
                      <p className="text-xs text-white/40">
                        or click to browse files (Max 5MB)
                      </p>
                    </div>
                  )}
                </div>

                <Button type="submit" variant="solid" size="lg" disabled={isSubmitting || !file} className="w-full justify-center mt-4">
                  {isSubmitting ? "Uploading..." : "Submit Application"}
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
