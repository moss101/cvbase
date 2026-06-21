import React, { useState, useEffect } from 'react';
import { useAuth } from './FirebaseProvider';

export const UserProfileForm: React.FC = () => {
  const { user, userProfile, updateUserProfile, loading, error } = useAuth();
  
  // State variables for form fields initialized from userProfile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [industry, setIndustry] = useState('Technology & Software Development');
  const [experienceYears, setExperienceYears] = useState('');
  const [bio, setBio] = useState('');
  const [availability, setAvailability] = useState('Full-Time (Remote)');
  const [licensedState, setLicensedState] = useState('');
  
  // Professional Links
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');

  // Active specialties / skills and certifications
  const [careSpecialties, setCareSpecialties] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);

  // Text inputs for adding custom skills/certifications
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [customCert, setCustomCert] = useState('');

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state with userProfile when fetched
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setPhone(userProfile.phone || '');
      setJobTitle(userProfile.jobTitle || '');
      if (userProfile.industry) setIndustry(userProfile.industry);
      setExperienceYears(userProfile.experienceYears || '');
      setBio(userProfile.bio || '');
      setAvailability(userProfile.availability || 'Full-Time (Remote)');
      setLicensedState(userProfile.licensedState || '');
      setLinkedin(userProfile.linkedin || '');
      setGithub(userProfile.github || '');
      setPortfolio(userProfile.portfolio || '');
      setCareSpecialties(userProfile.careSpecialties || []);
      setCertifications(userProfile.certifications || []);
    }
  }, [userProfile]);

  if (!user) {
    return (
      <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-3xl p-8 text-center" id="profile-logged-out-state">
        <div className="inline-flex w-16 h-16 bg-slate-150 rounded-full items-center justify-center text-slate-400 mb-4 animate-bounce">
          <span className="material-symbols-outlined text-3xl">account_circle</span>
        </div>
        <h3 className="text-xl font-bold text-slate-800">Authentication Required</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2 mb-6">
          Please sign up or sign in to build, edit, and securely persist your master Professional Profile.
        </p>
      </div>
    );
  }

  // Preset dictionary adapted dynamically based on selected industry
  const PRESET_DICTIONARY: Record<string, { specialties: string[]; certifications: string[] }> = {
    'Technology & Software Development': {
      specialties: [
        'React & React Native', 'Node.js & Express', 'TypeScript', 'Cloud Architecture (AWS/GCP)',
        'DevOps & CI/CD', 'UI/UX Design', 'Artificial Intelligence & ML', 'Python Systems',
        'Database Optimization', 'System Architecture', 'Cybersecurity & IAM', 'API Integrations'
      ],
      certifications: [
        'AWS Certified Cloud Practitioner', 'Google Professional Cloud Architect', 'Certified ScrumMaster (CSM)',
        'AWS Solutions Architect', 'CompTIA Security+', 'Google UX Design Certificate', 'PMP Certification'
      ]
    },
    'Healthcare & Caregiving': {
      specialties: [
        'Eldercare & Geriatrics', 'Pediatrics Care', 'Dementia & Alzheimer\'s Care',
        'Special Needs Care', 'Palliative & Hospice Care', 'Post-Operative Recovery',
        'Physical Rehabilitation', 'Mental Health Services', 'Infant & Neonatal Care'
      ],
      certifications: [
        'Registered Nurse (RN)', 'Licensed Practical Nurse (LPN)', 'Certified Nursing Assistant (CNA)',
        'Basic Life Support (BLS)', 'Cardiopulmonary Resuscitation (CPR)', 'First Aid Certification',
        'Home Health Aide (HHA)', 'Certified Nurse Midwife (CNM)'
      ]
    },
    'Business, Finance & Marketing': {
      specialties: [
        'Financial Analysis', 'Growth & Performance Marketing', 'SEO Strategy', 'Brand Management',
        'Sales & Business Dev', 'Accounting & Bookkeeping', 'Strategic Planning', 'HR & Org Culture',
        'Agile Leadership', 'Product Management'
      ],
      certifications: [
        'Certified Public Accountant (CPA)', 'Chartered Financial Analyst (CFA)', 'Project Management Pro (PMP)',
        'Google Analytics Certified', 'Certified Scrum Product Owner (CSPO)', 'HubSpot Inbound Marketing'
      ]
    },
    'Education, Coaching & Childcare': {
      specialties: [
        'Early Childhood Dev', 'Special Education Support', 'Tutoring & Academic Mentorship',
        'Curriculum Design', 'STEM & Robotics Teaching', 'Language Instruction (ESL)',
        'College Admissions Prep', 'Behavioral Coaching'
      ],
      certifications: [
        'State Teaching License', 'TEFL/TESOL Certification', 'Child Development Associate (CDA)',
        'First Aid / CPR Certified', 'Special Education Board License', 'Professional Certified Coach (PCC)'
      ]
    },
    'Creative, Design & Media': {
      specialties: [
        'Graphic Design & Branding', 'Motion Graphics & VFX', 'Video Production & Editing',
        'Copywriting & UX Writing', 'Creative Direction', 'Web Design (Figma & Webflow)',
        '3D Modeling & Illustration', 'Social Media Management'
      ],
      certifications: [
        'Adobe Certified Professional', 'Figma Master Certificate', 'Google Digital Garage Pro',
        'Certified Professional Photographer', 'Unity Certified User', 'Creative Design Expert'
      ]
    }
  };

  // Safe fallback if user has selected a custom or rare industry
  const currentPresets = PRESET_DICTIONARY[industry] || PRESET_DICTIONARY['Technology & Software Development'];

  const handleSpecialtyToggle = (specialty: string) => {
    if (careSpecialties.includes(specialty)) {
      setCareSpecialties(careSpecialties.filter(item => item !== specialty));
    } else {
      if (careSpecialties.length < 50) {
        setCareSpecialties([...careSpecialties, specialty]);
      }
    }
  };

  const handleCertificationToggle = (cert: string) => {
    if (certifications.includes(cert)) {
      setCertifications(certifications.filter(item => item !== cert));
    } else {
      if (certifications.length < 50) {
        setCertifications([...certifications, cert]);
      }
    }
  };

  const handleAddCustomSpecialty = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSpecialty.trim();
    if (trimmed && !careSpecialties.includes(trimmed)) {
      if (careSpecialties.length < 50) {
        setCareSpecialties([...careSpecialties, trimmed]);
        setCustomSpecialty('');
      }
    }
  };

  const handleAddCustomCert = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCert.trim();
    if (trimmed && !certifications.includes(trimmed)) {
      if (certifications.length < 50) {
        setCertifications([...certifications, trimmed]);
        setCustomCert('');
      }
    }
  };

  const handleRemoveSpecialty = (spec: string) => {
    setCareSpecialties(careSpecialties.filter(item => item !== spec));
  };

  const handleRemoveCert = (cert: string) => {
    setCertifications(certifications.filter(item => item !== cert));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    try {
      await updateUserProfile({
        firstName,
        lastName,
        phone,
        jobTitle,
        industry,
        experienceYears,
        bio,
        careSpecialties,
        certifications,
        availability,
        licensedState,
        linkedin,
        github,
        portfolio,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in" id="profile-form-container">
      {/* Form Header */}
      <div className="p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white relative">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-2xl">badge</span>
            <span className="text-xs font-semibold bg-primary/20 text-primary-light px-3 py-1 rounded-full uppercase tracking-widest">Master Profile</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mb-2">Create & Build Professional Profile</h2>
          <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
            Configure your master personal statement, core links, skills, and certifications. These details automatically hydrate sections while building your resume designs.
          </p>
        </div>
        <div className="absolute right-6 bottom-0 translate-y-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[150px] text-white">badge</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8" id="profile-edit-form">
        {/* Success / Error banners */}
        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-2xl text-emerald-800 text-xs font-semibold flex items-center gap-3 animate-fade-in" id="profile-save-success-banner">
            <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
            <div>
              <p className="font-bold text-emerald-950">Master Profile Saved Successfully!</p>
              <p className="font-normal text-slate-500 mt-0.5">Your data has been compiled and synchronized securely with Cloud Firestore.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-2xl text-rose-800 text-xs font-semibold flex items-center gap-3" id="profile-save-error-banner">
            <span className="material-symbols-outlined text-rose-600 text-lg">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Contact Details */}
        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="material-symbols-outlined text-slate-400 text-base">person</span>
            <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">1. Personal & Contact Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Registered Email (Read-Only)</label>
            <input
              type="text"
              value={user.email || ''}
              disabled
              title="Registered email cannot be modified directly"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-100 text-slate-400 font-medium cursor-not-allowed"
            />
          </div>
        </div>

        {/* Section 2: Online Presence & Links */}
        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="material-symbols-outlined text-slate-400 text-base">link</span>
            <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">2. Online Presence & Social Links</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[#0a66c2] text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">share</span> LinkedIn Profile
              </label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-800 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">code</span> GitHub Profile
              </label>
              <input
                type="url"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/username"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">language</span> Personal Portfolio
              </label>
              <input
                type="url"
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                placeholder="https://myportfolio.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Professional specifications */}
        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="material-symbols-outlined text-slate-400 text-base">work_history</span>
            <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">3. Career & Domain Specifications</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Target Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Lead Software Developer"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Primary Sector</label>
              <select
                value={industry}
                onChange={(e) => {
                  setIndustry(e.target.value);
                  // Clear existing specialties and certs that aren't manually custom-added by preserving only overlaps? 
                  // It's cooler to let them decide tags manually, but change current presets dynamically!
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              >
                <option value="Technology & Software Development">Technology & Software Development</option>
                <option value="Healthcare & Caregiving">Healthcare & Caregiving</option>
                <option value="Business, Finance & Marketing">Business, Finance & Marketing</option>
                <option value="Education, Coaching & Childcare">Education, Coaching & Childcare</option>
                <option value="Creative, Design & Media">Creative, Design & Media</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Years / Level of Experience</label>
              <input
                type="text"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="5+ years / Senior"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Executive Summary / Professional bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={2000}
              placeholder="Ambitious and outcome-driven expert with a proven track record in technology and architectural design. Committed to building robust pipelines, high fidelity user interfaces, and delivering scalable enterprise systems..."
              className="w-full h-32 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800 leading-relaxed resize-none"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Write a catchy hook for recruiting managers.</span>
              <span>{bio.length}/2000 characters</span>
            </div>
          </div>
        </div>

        {/* Section 4: Preferences */}
        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="material-symbols-outlined text-slate-400 text-base">explore</span>
            <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">4. Style & Work Preferences</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Work Authorization & Base Location</label>
              <input
                type="text"
                value={licensedState}
                onChange={(e) => setLicensedState(e.target.value)}
                placeholder="London, United Kingdom (Hybrid OK)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Specify cities, states, or regions of physical availability.</p>
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Availability / Collaboration Style</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              >
                <option value="Full-Time (Remote)">Full-Time (Remote)</option>
                <option value="Full-Time (On-Site / Hybrid)">Full-Time (On-Site / Hybrid)</option>
                <option value="Part-Time / Contract">Part-Time / Contract</option>
                <option value="Freelance & Consulting">Freelance & Consulting</option>
                <option value="Co-founder & Advising">Co-founder & Advising</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Set preferred hiring schema details.</p>
            </div>
          </div>
        </div>

        {/* Section 5: Core Specialties & Skills with custom inputs */}
        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="material-symbols-outlined text-slate-400 text-base">psychology</span>
            <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">5. Core Specialties & Technical Skills ({careSpecialties.length}/50)</h3>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Toggle industry specific preset suggestions below, or type in your own custom skills using the input fields. These will generate your resume skills list seamlessly.
            </p>

            {/* Selected Specialties Display */}
            {careSpecialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white rounded-xl border border-slate-200/60 shadow-inner">
                {careSpecialties.map(spec => (
                  <span 
                    key={spec} 
                    className="inline-flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-rose-100 hover:text-rose-700 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer group"
                    onClick={() => handleRemoveSpecialty(spec)}
                    title="Click to remove skill"
                  >
                    {spec}
                    <span className="material-symbols-outlined text-[10px] font-bold group-hover:text-rose-600">close</span>
                  </span>
                ))}
              </div>
            )}

            {/* Specialty tag picker */}
            <div className="space-y-3">
              <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-widest">Select relevant suggestions:</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
                {currentPresets.specialties.map(specialty => {
                  const isSelected = careSpecialties.includes(specialty);
                  return (
                    <button
                      key={specialty}
                      type="button"
                      onClick={() => handleSpecialtyToggle(specialty)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isSelected 
                          ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {specialty}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom specialty tag search/input */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Still missing some skills? Enter custom skill (e.g., Kubernetes)"
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSpecialty(e);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              />
              <button
                type="button"
                onClick={handleAddCustomSpecialty}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Add Skill
              </button>
            </div>
          </div>
        </div>

        {/* Section 6: Certifications & Credentials with custom inputs */}
        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="material-symbols-outlined text-slate-400 text-base">workspace_premium</span>
            <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">6. Certifications & Credentials ({certifications.length}/50)</h3>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Persist active credentials, board registrations, professional licenses, or course certificates.
            </p>

            {/* Selected Certifications Display */}
            {certifications.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white rounded-xl border border-slate-200/60 shadow-inner">
                {certifications.map(cert => (
                  <span 
                    key={cert} 
                    className="inline-flex items-center gap-1.5 bg-secondary/10 text-secondary hover:bg-rose-100 hover:text-rose-700 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer group"
                    onClick={() => handleRemoveCert(cert)}
                    title="Click to remove certification"
                  >
                    {cert}
                    <span className="material-symbols-outlined text-[10px] font-bold group-hover:text-rose-600">close</span>
                  </span>
                ))}
              </div>
            )}

            {/* Certifications suggestions */}
            <div className="space-y-3">
              <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-widest">Select relevant suggestions:</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
                {currentPresets.certifications.map(cert => {
                  const isSelected = certifications.includes(cert);
                  return (
                    <button
                      key={cert}
                      type="button"
                      onClick={() => handleCertificationToggle(cert)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isSelected 
                          ? 'bg-secondary text-white border-secondary shadow-sm shadow-secondary/10' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cert}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom certification picker */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Enter custom certification (e.g., Certified Kubernetes Administrator)"
                value={customCert}
                onChange={(e) => setCustomCert(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomCert(e);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white font-medium text-slate-800"
              />
              <button
                type="button"
                onClick={handleAddCustomCert}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Add Cert
              </button>
            </div>
          </div>
        </div>

        {/* Submit Actions Button */}
        <div className="flex gap-4 pt-4 border-t border-slate-100 justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            id="save-profile-btn"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">cloud_sync</span>
                Save Sync Master Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
export default UserProfileForm;
