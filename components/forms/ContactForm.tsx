
import React, { useState, useRef, useEffect } from 'react';
import type { Contact, ResumeData } from '../../types';
import ContentHeader from '../common/ContentHeader';
import TipsCard from '../common/TipsCard';
import FormActions from '../common/FormActions';
import { generateProfessionalHeadshot } from '../../services/geminiService';
import { WandIcon } from '../common/icons';
import { countries, cities } from '../../data/locationData';
import { useTranslation } from '../../services/translationService';
import AITipHelper from '../common/AITipHelper';


interface ContactFormProps {
    data: Contact;
    onFormDataChange: React.Dispatch<React.SetStateAction<ResumeData>>;
    onPhotoChange: (photoData: string) => void;
    onClear: () => void;
    onNext: () => void;
}

const FormField: React.FC<{ label: string; name: keyof Omit<Contact, 'photo'>; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean; placeholder?: string; type?: string; fullWidth?: boolean }> = ({ label, name, required, fullWidth, ...props }) => (
    <div className={fullWidth ? "col-span-2" : ""}>
        <label htmlFor={name} className="font-semibold mb-2.5 flex items-center text-sm text-gray-700">
            <span>{label}</span>
            {required && <span className="text-primary ml-0.5">*</span>}
            <AITipHelper section="contact" fieldName={label} currentValue={props.value} />
        </label>
        <input id={name} name={name} {...props} className="w-full p-4 border border-border rounded-lg text-base bg-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
    </div>
);


const ContactForm: React.FC<ContactFormProps> = ({ data, onFormDataChange, onPhotoChange, onClear, onNext }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cityOptions, setCityOptions] = useState<string[]>([]);
    const { t } = useTranslation();

    useEffect(() => {
        if (data.country && cities[data.country]) {
            setCityOptions(cities[data.country]);
        } else {
            setCityOptions([]);
        }
    }, [data.country]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onFormDataChange(prev => ({ ...prev, contact: { ...prev.contact, [name]: value } }));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numericValue = value.replace(/\D/g, '');
        onFormDataChange(prev => ({ ...prev, contact: { ...prev.contact, [name]: numericValue } }));
    };
    
    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        onFormDataChange(prev => ({
            ...prev,
            contact: {
                ...prev.contact,
                [name]: value,
                city: '',
                customCity: '',
            }
        }));
    };
    
    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        onFormDataChange(prev => ({
            ...prev,
            contact: {
                ...prev.contact,
                [name]: value,
                customCity: value !== 'Other' ? '' : prev.contact.customCity,
            }
        }));
    };


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onPhotoChange(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEnhanceClick = async () => {
        if (!data.photo) return;
        setIsProcessing(true);
        setError(null);
        try {
            // The base64 string includes a prefix like `data:image/png;base64,`, which needs to be removed.
            const mimeType = data.photo.substring(data.photo.indexOf(':') + 1, data.photo.indexOf(';'));
            const base64Data = data.photo.split(',')[1];
            const enhancedBase64 = await generateProfessionalHeadshot(base64Data, mimeType);
            onPhotoChange(`data:image/png;base64,${enhancedBase64}`);
        } catch (err) {
            setError('Failed to enhance photo. Please try again.');
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <ContentHeader
                title={t('contact.title', 'Contact Details')}
                description={t('contact.desc', "This is how recruiters will contact you. Make sure it's correct!")}
            />
            <form>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    <div className="md:col-span-2 grid grid-cols-2 gap-6">
                        <FormField label={t('contact.firstName', 'First Name')} name="firstName" value={data.firstName} onChange={handleChange} required />
                        <FormField label={t('contact.lastName', 'Last Name')} name="lastName" value={data.lastName} onChange={handleChange} required />
                        <FormField label={t('contact.jobTitle', 'Job Title')} name="jobTitle" value={data.jobTitle} onChange={handleChange} placeholder="e.g., Senior Software Engineer" required fullWidth/>
                        <FormField label={t('contact.email', 'Email Address')} name="email" value={data.email} onChange={handleChange} type="email" required fullWidth />
                        
                        <div className="col-span-2">
                            <label htmlFor="phone" className="font-semibold mb-2.5 flex items-center text-sm text-gray-700">
                                <span>{t('contact.phone', 'Phone Number')}</span>
                                <AITipHelper section="contact" fieldName="Phone Number" currentValue={data.phone} />
                            </label>
                            <div className="flex">
                                <select 
                                    name="phoneCountryCode" 
                                    value={data.phoneCountryCode} 
                                    onChange={handleChange}
                                    className="p-4 border border-r-0 border-border rounded-l-lg text-base bg-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none"
                                >
                                    {countries.map(c => <option key={c.code} value={c.dial_code}>{c.code} ({c.dial_code})</option>)}
                                </select>
                                <input id="phone" name="phone" type="tel" value={data.phone} onChange={handlePhoneChange} className="w-full p-4 border border-border rounded-r-lg text-base bg-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="country" className="font-semibold mb-2.5 flex items-center text-sm text-gray-700">
                                <span>{t('contact.country', 'Country')}</span>
                                <AITipHelper section="contact" fieldName="Country" currentValue={data.country} />
                            </label>
                            <select id="country" name="country" value={data.country} onChange={handleCountryChange} className="w-full p-4 border border-border rounded-lg text-base bg-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none">
                                <option value="">Select Country</option>
                                {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="city" className="font-semibold mb-2.5 flex items-center text-sm text-gray-700">
                                <span>{t('contact.city', 'City')}</span>
                                <AITipHelper section="contact" fieldName="City" currentValue={data.city === 'Other' ? data.customCity : data.city} />
                            </label>
                            <select id="city" name="city" value={data.city} onChange={handleCityChange} disabled={!data.country} className="w-full p-4 border border-border rounded-lg text-base bg-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-200 appearance-none">
                                <option value="">Select City</option>
                                {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {data.city === 'Other' && (
                            <FormField label="Enter City" name="customCity" value={data.customCity} onChange={handleChange} fullWidth />
                        )}

                        <FormField label={t('contact.address', 'Street Address, State, ZIP')} name="address" value={data.address} onChange={handleChange} placeholder="e.g., 123 Main St, CA, 94107" fullWidth />

                        <FormField label={t('contact.linkedin', 'LinkedIn Profile')} name="linkedin" value={data.linkedin} onChange={handleChange} />
                        <FormField label={t('contact.website', 'Personal Website/Portfolio')} name="website" value={data.website} onChange={handleChange} />
                    </div>
                     <div className="md:col-span-1 space-y-4">
                        <label className="font-semibold mb-2.5 block text-sm text-gray-700 text-center">{t('contact.photo', 'Your Photo')}</label>
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-40 h-40 bg-light rounded-full flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                                {data.photo ? (
                                    <img src={data.photo} alt="User headshot" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-400 text-sm text-center p-4">Upload a photo</span>
                                )}
                            </div>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-center px-4 py-2 bg-white border-2 border-border rounded-lg font-semibold text-sm text-dark hover:border-primary hover:text-primary transition-colors">
                                {data.photo ? t('contact.photo', 'Change Photo') : t('contact.photo', 'Upload Photo')}
                            </button>
                             {data.photo && (
                                <>
                                <button
                                    type="button"
                                    onClick={handleEnhanceClick}
                                    disabled={isProcessing}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-primary bg-primary-light rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <WandIcon />
                                    {isProcessing ? 'Processing...' : 'AI Enhance Headshot'}
                                </button>
                                <button type="button" onClick={() => onPhotoChange('')} className="text-xs text-gray-500 hover:text-danger">
                                    Remove Photo
                                </button>
                                </>
                             )}
                            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                        </div>
                    </div>
                </div>

                <TipsCard activeSection="contact" />
                <FormActions onClear={onClear} onNext={onNext} />
            </form>
        </>
    );
};

export default ContactForm;
