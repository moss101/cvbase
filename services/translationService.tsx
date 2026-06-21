import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'en' | 'es' | 'fr' | 'de';

export interface LanguageOption {
    code: LanguageCode;
    name: string;
    flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

export const translations: Record<LanguageCode, Record<string, string>> = {
    en: {
        // Navigation Section Titles
        'nav.contact': 'Contact Info',
        'nav.summary': 'Summary',
        'nav.experience': 'Experience',
        'nav.projects': 'Projects',
        'nav.education': 'Education',
        'nav.skills': 'Skills',
        'nav.certifications': 'Certifications',
        'nav.languages': 'Languages',
        'nav.awards': 'Awards',
        'nav.trainings': 'Trainings & Courses',
        'nav.publications': 'Publications',
        'nav.volunteer': 'Volunteering',
        'nav.custom': 'Custom Section',
        'nav.customize': 'Customize Sections',
        'nav.finalize': 'Finalize & Download',

        // General/Header Buttons & Labels
        'btn.aiEnhance': 'AI Enhance',
        'btn.loadExample': 'Load Example',
        'btn.saveDraft': 'Save Draft',
        'btn.save': 'Save',
        'btn.saving': 'Saving...',
        'btn.saved': '✓ Saved!',
        'btn.downloadPDF': 'Download PDF',
        'btn.addMore': 'Add More',
        'btn.delete': 'Delete',
        'btn.clearSection': 'Clear Section',
        'btn.nextSection': 'Next Section',
        'label.livePreview': 'Live Preview',
        'label.ready': 'Ready',
        'label.selectLanguage': 'Language',
        'label.backToDashboard': 'Back to Dashboard',

        // Contact Form
        'contact.title': 'Contact Information',
        'contact.desc': 'Enter your contact details so employers know how to reach you.',
        'contact.firstName': 'First Name',
        'contact.lastName': 'Last Name',
        'contact.jobTitle': 'Target Job Title',
        'contact.phone': 'Phone Number',
        'contact.email': 'Email Address',
        'contact.address': 'Address Line',
        'contact.country': 'Country',
        'contact.city': 'City / Town',
        'contact.linkedin': 'LinkedIn Profile URL',
        'contact.website': 'Personal Website URL',
        'contact.photo': 'Upload Photo',
        'contact.photoDesc': 'PNG or JPG. Recommanded size square (e.g. 400x400px).',

        // Summary Form
        'summary.title': 'Professional Summary',
        'summary.desc': 'Write a brief 3-4 sentence overview of your background, key strengths, and career highlights.',
        'summary.placeholder': 'Describe your professional achievements and career goals here...',

        // Experience Form
        'experience.title': 'Work Experience',
        'experience.desc': 'List your recent relevant work history, starting with your current or most recent job.',
        'experience.jobTitle': 'Job Title',
        'experience.company': 'Company / Employer',
        'experience.location': 'Location (e.g. London, UK)',
        'experience.startDate': 'Start Date',
        'experience.endDate': 'End Date',
        'experience.description': 'Description & Achievements',
        'experience.addBtn': '+ Add Work Experience',

        // Projects Form
        'projects.title': 'Projects',
        'projects.desc': 'Highlight significant case studies, open source contributions, or key freelance projects.',
        'projects.name': 'Project Name',
        'projects.technologies': 'Technologies Used',
        'projects.link': 'Project Link (optional)',
        'projects.startDate': 'StartDate',
        'projects.endDate': 'EndDate',
        'projects.description': 'Project Details & Your Role',
        'projects.addBtn': '+ Add Project',

        // Education Form
        'education.title': 'Education',
        'education.desc': 'Add your academic background, degrees, or certifications.',
        'education.school': 'School / University',
        'education.degree': 'Degree / Field of Study',
        'education.location': 'Location',
        'education.startDate': 'StartDate',
        'education.endDate': 'EndDate',
        'education.description': 'Additional details (GPA, notable coursework, honors)',
        'education.addBtn': '+ Add Education',

        // Skills Form
        'skills.title': 'Skills',
        'skills.desc': 'Enter soft skills, hard skills, core technical tools, and processes.',
        'skills.placeholder': 'Type a skill and press Enter (e.g. React, Project Management)...',
        'skills.popular': 'Popular Skills for your Target Title',
        'skills.empty': 'No target job title declared inside Contact tab yet to formulate smart skill suggestions.',

        // Certifications Form
        'certifications.title': 'Certifications',
        'certifications.desc': 'Add professional licenses, regulatory accreditations, or certificates.',
        'certifications.name': 'Certification Name',
        'certifications.number': 'License/Certification Number',
        'certifications.expiryDate': 'Expiration Date',
        'certifications.description': 'Additional Description / Details',
        'certifications.addBtn': '+ Add Certification',

        // Languages Form
        'languages.title': 'Languages',
        'languages.desc': 'Add any foreign languages you speak and specify your proficiency level.',
        'languages.lang': 'Language',
        'languages.proficiency': 'Proficiency Level',
        'languages.addBtn': '+ Add Language',
        'languages.p_native': 'Native or Bilingual',
        'languages.p_fluent': 'Full Professional / Fluent',
        'languages.p_proficient': 'Professional Working',
        'languages.p_intermediate': 'Limited Working / Intermediate',
        'languages.p_basic': 'Elementary / Basic',

        // Awards Form
        'awards.title': 'Awards',
        'awards.desc': 'List honors, recognition awards, and competitive scholarships.',
        'awards.name': 'Award Title',
        'awards.issuer': 'Issuer / Organization',
        'awards.date': 'Date Awarded',
        'awards.description': 'What was this award given for?',
        'awards.addBtn': '+ Add Award',

        // Trainings Form
        'trainings.title': 'Trainings & Courses',
        'trainings.desc': 'Include executive seminars, intensive bootcamps, and professional trainings.',
        'trainings.course': 'Course / Seminar Title',
        'trainings.institution': 'Institution / Training Provider',
        'trainings.date': 'Completion Date',
        'trainings.description': 'Topics covered / achievements',
        'trainings.addBtn': '+ Add Training/Course',

        // Publications Form
        'publications.title': 'Publications',
        'publications.desc': 'Academic research, scientific papers, trade journal contributions, or online essays.',
        'publications.name': 'Title Of Publication',
        'publications.publisher': 'Publisher / Journal Name',
        'publications.date': 'Publication Date',
        'publications.link': 'URL Link',
        'publications.description': 'A short description or abstract of the publication',
        'publications.addBtn': '+ Add Publication',

        // Volunteer Form
        'volunteer.title': 'Volunteering',
        'volunteer.desc': 'Show off your community work, charitable initiatives, or non-profit roles.',
        'volunteer.role': 'Your Role / Title',
        'volunteer.organization': 'Organization name',
        'volunteer.location': 'Location',
        'volunteer.startDate': 'StartDate',
        'volunteer.endDate': 'EndDate',
        'volunteer.description': 'Describe your duties and social contributions',
        'volunteer.addBtn': '+ Add Volunteer Role',

        // Custom Section Form
        'custom.title': 'Custom Section',
        'custom.desc': 'Add anything else that doesn\'t fit anywhere else (e.g. Patents, Hobbies, References).',
        'custom.name': 'Activity Name / Title',
        'custom.subtitle': 'Subtitle / Organization Name',
        'custom.date': 'Date',
        'custom.description': 'Additional details & custom bullets',
        'custom.addBtn': '+ Add Custom Entry',

        // Customize Form
        'customize.title': 'Customize Resume Sections',
        'customize.desc': 'Customize your layout structure. Toggle optional resume components on or off.',
        'customize.certifications_desc': 'Professional credentials, regulatory accreditations, and licenses.',
        'customize.projects_desc': 'Specific side-projects, commercial deployments, or open-source repositories.',
        'customize.languages_desc': 'Languages spoken and corresponding spoken or written capacities.',
        'customize.awards_desc': 'Awards, performance trophies, academic scholarships, or certifications of honors.',
        'customize.trainings_desc': 'Advanced training, bootcamps, or extra university seminars.',
        'customize.publications_desc': 'Scientific papers, journal publications, or professional essays.',
        'customize.volunteer_desc': 'Charity participations, community service, or non-profit work.',
        'customize.custom_desc': 'Completely custom items (such as References, Hobbies, Patents, etc.)',

        // Finalize Form
        'finalize.title': 'Finalize & Download',
        'finalize.desc': 'Review your resume with customizable templates, fine-tune colors and layout size, then export to print.',
        'finalize.chooseTemplate': 'Choose a Designer Template',
        'finalize.searchPlaceholder': 'Search templates by name or tag...',
        'finalize.viewAll': 'All Templates',
        'finalize.atsHint': '💡 Pro Tip: Select a simple, single-column design (Classic, Compact, Clean) for highest ATS parse accuracy.'
    },
    es: {
        // Navigation Section Titles
        'nav.contact': 'Ficha de Contacto',
        'nav.summary': 'Perfil Profesional',
        'nav.experience': 'Experiencia',
        'nav.projects': 'Proyectos',
        'nav.education': 'Educación',
        'nav.skills': 'Habilidades',
        'nav.certifications': 'Certificaciones',
        'nav.languages': 'Idiomas',
        'nav.awards': 'Premios',
        'nav.trainings': 'Cursos y Talleres',
        'nav.publications': 'Publicaciones',
        'nav.volunteer': 'Voluntariado',
        'nav.custom': 'Sección Extra',
        'nav.customize': 'Editar Secciones',
        'nav.finalize': 'Finalizar y Exportar',

        // General/Header Buttons & Labels
        'btn.aiEnhance': 'Optimizar con IA',
        'btn.loadExample': 'Cargar Ejemplo',
        'btn.saveDraft': 'Guardar Borrador',
        'btn.save': 'Guardar',
        'btn.saving': 'Guardando...',
        'btn.saved': '✓ ¡Guardado!',
        'btn.downloadPDF': 'Descargar PDF',
        'btn.addMore': 'Añadir Otro',
        'btn.delete': 'Eliminar',
        'btn.clearSection': 'Limpiar Sección',
        'btn.nextSection': 'Siguiente Sección',
        'label.livePreview': 'Vista Previa',
        'label.ready': 'Listo',
        'label.selectLanguage': 'Idioma',
        'label.backToDashboard': 'Volver al Inicio',

        // Contact Form
        'contact.title': 'Información de Contacto',
        'contact.desc': 'Introduce tus datos para que los reclutadores puedan contactarse contigo.',
        'contact.firstName': 'Nombre',
        'contact.lastName': 'Apellidos',
        'contact.jobTitle': 'Puesto Objetivo',
        'contact.phone': 'Teléfono de Contacto',
        'contact.email': 'Correo Electrónico',
        'contact.address': 'Dirección',
        'contact.country': 'País',
        'contact.city': 'Ciudad o Localidad',
        'contact.linkedin': 'URL de LinkedIn',
        'contact.website': 'Sitio Web Personal',
        'contact.photo': 'Subir Fotografía',
        'contact.photoDesc': 'PNG o JPG. Formato recomendado cuadrado (ej: 400x400px).',

        // Summary Form
        'summary.title': 'Perfil Profesional',
        'summary.desc': 'Escribe un resumen breve de 3 o 4 líneas destacando tu experiencia técnica y aspiraciones.',
        'summary.placeholder': 'Describe tus objetivos profesionales y tus mayores logros aquí...',

        // Experience Form
        'experience.title': 'Experiencia Laboral',
        'experience.desc': 'Enumera tus puestos de trabajo recientes, empezando por tu empleo más reciente.',
        'experience.jobTitle': 'Puesto / Cargo',
        'experience.company': 'Empresa / Empleador',
        'experience.location': 'Ubicación (ej: Madrid, España)',
        'experience.startDate': 'Fecha de Inicio',
        'experience.endDate': 'Fecha de Fin',
        'experience.description': 'Descripción del Puesto e Hitos',
        'experience.addBtn': '+ Añadir Experiencia',

        // Projects Form
        'projects.title': 'Proyectos',
        'projects.desc': 'Muestra tus desarrollos independientes, contribuciones a código abierto o trabajos destacados.',
        'projects.name': 'Nombre del Proyecto',
        'projects.technologies': 'Tecnologías Clave',
        'projects.link': 'Enlace al Proyecto (opcional)',
        'projects.startDate': 'Fecha de Inicio',
        'projects.endDate': 'Fecha de Fin',
        'projects.description': 'Detalles del Proyecto y tu Rol',
        'projects.addBtn': '+ Añadir Proyecto',

        // Education Form
        'education.title': 'Formación Académica',
        'education.desc': 'Añade tus estudios, títulos y centros educativos.',
        'education.school': 'Centro Educativo / Universidad',
        'education.degree': 'Título o Carrera cursada',
        'education.location': 'Ubicación',
        'education.startDate': 'Fecha de Inicio',
        'education.endDate': 'Fecha de Fin',
        'education.description': 'Detalles adicionales (Media, asignaturas destacadas, menciones)',
        'education.addBtn': '+ Añadir Educación',

        // Skills Form
        'skills.title': 'Habilidades',
        'skills.desc': 'Suma competencias técnicas, lenguajes, metodologías o herramientas.',
        'skills.placeholder': 'Escribe una habilidad y pulsa Enter (ej: React, Liderazgo)...',
        'skills.popular': 'Sugerencias para tu Puesto Objetivo',
        'skills.empty': 'Define un Puesto Objetivo en tus datos de contacto para ver sugerencias inteligentes.',

        // Certifications Form
        'certifications.title': 'Certificaciones',
        'certifications.desc': 'Añade títulos profesionales, licencias o acreditaciones extra.',
        'certifications.name': 'Nombre de la Certificación',
        'certifications.number': 'Número de Licencia / Certificado',
        'certifications.expiryDate': 'Fecha de Expiración',
        'certifications.description': 'Detalles / Descripción adicional',
        'certifications.addBtn': '+ Añadir Certificación',

        // Languages Form
        'languages.title': 'Idiomas',
        'languages.desc': 'Añade los idiomas que dominas y especifica tu nivel de competencia.',
        'languages.lang': 'Idioma',
        'languages.proficiency': 'Nivel de Dominio',
        'languages.addBtn': '+ Añadir Idioma',
        'languages.p_native': 'Nativo o Bilingüe',
        'languages.p_fluent': 'Completo Profesional / Fluido',
        'languages.p_proficient': 'Profesional de Trabajo',
        'languages.p_intermediate': 'Intermedio / Limitado',
        'languages.p_basic': 'Elemental / Básico',

        // Awards Form
        'awards.title': 'Premios y Honores',
        'awards.desc': 'Destaca reconocimientos del sector, becas y premios destacados.',
        'awards.name': 'Nombre del Reconocimiento',
        'awards.issuer': 'Organización que lo otorga',
        'awards.date': 'Fecha de Otorgamiento',
        'awards.description': '¿En qué consistió este reconocimiento?',
        'awards.addBtn': '+ Añadir Premio',

        // Trainings Form
        'trainings.title': 'Cursos de Especialización',
        'trainings.desc': 'Seminarios adicionales, talleres técnicos de corta duración y bootcamps.',
        'trainings.course': 'Nombre del Curso / Taller',
        'trainings.institution': 'Institución o Academia',
        'trainings.date': 'Fecha de Finalización',
        'trainings.description': 'Temarios vistos / Competencias',
        'trainings.addBtn': '+ Añadir Curso o Taller',

        // Publications Form
        'publications.title': 'Publicaciones',
        'publications.desc': 'Investigaciones, artículos de blog especializados, libros o ensayos.',
        'publications.name': 'Título de la Publicación',
        'publications.publisher': 'Editorial o Revista Técnica',
        'publications.date': 'Fecha de Publicación',
        'publications.link': 'Enlace URL',
        'publications.description': 'Abstract o breve descripción de tu autoría',
        'publications.addBtn': '+ Añadir Publicación',

        // Volunteer Form
        'volunteer.title': 'Voluntariado',
        'volunteer.desc': 'Detalla tu trayectoria de ayuda comunitaria, asociacionismo o roles ecológicos.',
        'volunteer.role': 'Rol desempeñado',
        'volunteer.organization': 'Organización o Asociación',
        'volunteer.location': 'Ubicación',
        'volunteer.startDate': 'Fecha de Inicio',
        'volunteer.endDate': 'Fecha de Fin',
        'volunteer.description': 'Breve resumen de tus labores sociales',
        'volunteer.addBtn': '+ Añadir Voluntariado',

        // Custom Section Form
        'custom.title': 'Sección Personalizada',
        'custom.desc': 'Añade cualquier otro apartado relevante (ej: Referencias, Patentes, Hobbies).',
        'custom.name': 'Título del Apartado',
        'custom.subtitle': 'Subtítulo o Entidad relacionada',
        'custom.date': 'Fecha',
        'custom.description': 'Detalles explicativos / Viñetas',
        'custom.addBtn': '+ Añadir Apartado Extra',

        // Customize Form
        'customize.title': 'Adaptar Secciones',
        'customize.desc': 'Oculta o habilita bloques de información según consideres oportuno.',
        'customize.certifications_desc': 'Licencias profesionales o certificaciones técnicas externas.',
        'customize.projects_desc': 'Planes independientes del trabajo, desarrollos MVP o repositorios.',
        'customize.languages_desc': 'Competencias lingüísticas y niveles correspondientes.',
        'customize.awards_desc': 'Premios, becas de estudio distinguidas o reconocimientos.',
        'customize.trainings_desc': 'Talleres avanzados, bootcamps o entrenamientos corporativos.',
        'customize.publications_desc': 'Trabajos científicos o publicaciones en portales de divulgación.',
        'customize.volunteer_desc': 'Colaboraciones desinteresadas o de impacto medioambiental.',
        'customize.custom_desc': 'Buzón versátil para otros méritos (Referencias, Aficiones, Patentes).',

        // Finalize Form
        'finalize.title': 'Finalizar y Exportar',
        'finalize.desc': 'Revisa el resultado con los temas creados, calibra fuentes y colores, e imprime con un clic.',
        'finalize.chooseTemplate': 'Elige una Plantilla de Diseño',
        'finalize.searchPlaceholder': 'Buscar plantilla por nombre o tag...',
        'finalize.viewAll': 'Todos los Diseños',
        'finalize.atsHint': '💡 Recomendación: Elige diseños sencillos de columna única (Classic, Compact, Clean) para asegurar filtros ATS.'
    },
    fr: {
        // Navigation Section Titles
        'nav.contact': 'Coordonnées',
        'nav.summary': 'Profil',
        'nav.experience': 'Expérience',
        'nav.projects': 'Projets',
        'nav.education': 'Formation',
        'nav.skills': 'Compétences',
        'nav.certifications': 'Certifications',
        'nav.languages': 'Langues',
        'nav.awards': 'Distinctions',
        'nav.trainings': 'Formations',
        'nav.publications': 'Publications',
        'nav.volunteer': 'Bénévolat',
        'nav.custom': 'Section Personnalisée',
        'nav.customize': 'Gérer les Sections',
        'nav.finalize': 'Finition & Téléchargement',

        // General/Header Buttons & Labels
        'btn.aiEnhance': 'Améliorer par IA',
        'btn.loadExample': 'Charger Exemple',
        'btn.saveDraft': 'Enregistrer Brouillon',
        'btn.save': 'Enregistrer',
        'btn.saving': 'Enregistrement...',
        'btn.saved': '✓ Enregistré !',
        'btn.downloadPDF': 'Télécharger le PDF',
        'btn.addMore': 'Ajouter un Élément',
        'btn.delete': 'Supprimer',
        'btn.clearSection': 'Vider la Section',
        'btn.nextSection': 'Section Suivante',
        'label.livePreview': 'Aperçu Direct',
        'label.ready': 'Prêt',
        'label.selectLanguage': 'Langue',
        'label.backToDashboard': 'Retour à l\'accueil',

        // Contact Form
        'contact.title': 'Informations de Contact',
        'contact.desc': 'Renseignez vos coordonnées pour que les recruteurs puissent vous joindre facilement.',
        'contact.firstName': 'Prénom',
        'contact.lastName': 'Nom de Famille',
        'contact.jobTitle': 'Intitulé de Poste Cible',
        'contact.phone': 'Numéro de Téléphone',
        'contact.email': 'Adresse E-mail',
        'contact.address': 'Adresse Postale',
        'contact.country': 'Pays',
        'contact.city': 'Ville',
        'contact.linkedin': 'Lien Profil LinkedIn',
        'contact.website': 'Site Web ou Portfolio',
        'contact.photo': 'Ajouter une Photo',
        'contact.photoDesc': 'Format PNG ou JPG conseillé. Forme carrée recommandée (ex: 400x400px).',

        // Summary Form
        'summary.title': 'Profil Professionnel',
        'summary.desc': 'Rédigez un court paragraphe de 3-4 phrases résumant votre parcours technique et vos motivations.',
        'summary.placeholder': 'Décrivez vos plus belles réalisations et objectifs ici...',

        // Experience Form
        'experience.title': 'Expériences Professionnelles',
        'experience.desc': 'Détaillez vos expériences passées, de la plus récente à la plus ancienne.',
        'experience.jobTitle': 'Intitulé du Poste',
        'experience.company': 'Entreprise / Employeur',
        'experience.location': 'Lieu (ex: Paris, France)',
        'experience.startDate': 'Date de Début',
        'experience.endDate': 'Date de Fin',
        'experience.description': 'Description du Poste et Résultats',
        'experience.addBtn': '+ Ajouter un Poste',

        // Projects Form
        'projects.title': 'Projets de Référence',
        'projects.desc': 'Mettez en avant vos contributions open source, créations d\'applications ou projets freelances.',
        'projects.name': 'Nom du Projet',
        'projects.technologies': 'Technologies Utilisées',
        'projects.link': 'Lien URL du Projet (optionnel)',
        'projects.startDate': 'Date de Début',
        'projects.endDate': 'Date de Fin',
        'projects.description': 'Description du Projet et Rôle',
        'projects.addBtn': '+ Ajouter un Projet',

        // Education Form
        'education.title': 'Formations & Diplômes',
        'education.desc': 'Ajoutez vos diplômes universitaires, certificats scolaires et parcours académique.',
        'education.school': 'École ou Université',
        'education.degree': 'Diplôme / Spécialisation',
        'education.location': 'Lieu',
        'education.startDate': 'Date de Début',
        'education.endDate': 'Date de Fin',
        'education.description': 'Détails complémentaires (Mention, cours clés)',
        'education.addBtn': '+ Ajouter un Diplôme',

        // Skills Form
        'skills.title': 'Compétences',
        'skills.desc': 'Renseignez vos aptitudes techniques, outils spécialisés, méthodologies et soft skills.',
        'skills.placeholder': 'Saisissez une compétence et validez avec Entrée (ex: React, Gestion)...',
        'skills.popular': 'Compétences recommandées selon votre Titre Cible',
        'skills.empty': 'Veuillez saisir un Intitulé de Poste dans l\'onglet des Coordonnées pour débloquer les suggestions.',

        // Certifications Form
        'certifications.title': 'Certifications',
        'certifications.desc': 'Mentionnez des habilitations officielles, licences réglementaires ou certificats d\'écoles.',
        'certifications.name': 'Titre de la Certification',
        'certifications.number': 'Numéro officiel du Certificat',
        'certifications.expiryDate': 'Date d\'Expiration',
        'certifications.description': 'Description ou précisions',
        'certifications.addBtn': '+ Ajouter une Certification',

        // Languages Form
        'languages.title': 'Langues Étrangères',
        'languages.desc': 'Précisez les langues que vous parlez et votre niveau de maîtrise pour chacune.',
        'languages.lang': 'Langue',
        'languages.proficiency': 'Niveau de Maîtrise',
        'languages.addBtn': '+ Ajouter une Langue',
        'languages.p_native': 'Langue Maternelle / Bilingue',
        'languages.p_fluent': 'Usage Professionnel Courant / Courant',
        'languages.p_proficient': 'Usage Professionnel Autonome',
        'languages.p_intermediate': 'Niveau Intermédiaire',
        'languages.p_basic': 'Notions de base',

        // Awards Form
        'awards.title': 'Prix & Récompenses',
        'awards.desc': 'Listez vos bourses académiques, prix corporatifs ou distinctions majeures.',
        'awards.name': 'Nom de la Distinction',
        'awards.issuer': 'Organisme Délivrant l\'Honneur',
        'awards.date': 'Date d\'Obtention',
        'awards.description': 'Quelle a été la raison d\'attribution de ce prix ?',
        'awards.addBtn': '+ Ajouter un Prix',

        // Trainings Form
        'trainings.title': 'Formations Complémentaires',
        'trainings.desc': 'Séminaires de perfectionnement, cours en ligne accélérés ou bootcamps de transition.',
        'trainings.course': 'Titre de la Formation',
        'trainings.institution': 'Organisme de Formation',
        'trainings.date': 'Date de Validation',
        'trainings.description': 'Thèmes abordés / acquis clés',
        'trainings.addBtn': '+ Ajouter une Formation',

        // Publications Form
        'publications.title': 'Publications',
        'publications.desc': 'Ouvrages de référence, thèses de doctorat, articles scientifiques ou de blog professionnel.',
        'publications.name': 'Titre de l\'Article / Livre',
        'publications.publisher': 'Éditeur ou Journal Scientifique',
        'publications.date': 'Date de Publication',
        'publications.link': 'Lien URL direct',
        'publications.description': 'Résumé ou abstract de la publication',
        'publications.addBtn': '+ Ajouter une Publication',

        // Volunteer Form
        'volunteer.title': 'Bénévolat',
        'volunteer.desc': 'Faites valoir vos services communautaires, actions humanitaires et rôles d\'aide sociale',
        'volunteer.role': 'Fonction Occupée',
        'volunteer.organization': 'Organisme ou Association',
        'volunteer.location': 'Lieu',
        'volunteer.startDate': 'Date de Début',
        'volunteer.endDate': 'Date de Fin',
        'volunteer.description': 'Description des tâches dévouées',
        'volunteer.addBtn': '+ Ajouter une Action',

        // Custom Section Form
        'custom.title': 'Section Libre',
        'custom.desc': 'Toute information qui n\'a pas sa place ailleurs (ex: Références, Hobbies, Brevets).',
        'custom.name': 'Intitulé de l\'Activité',
        'custom.subtitle': 'Sous-titre / Organisation liée',
        'custom.date': 'Date',
        'custom.description': 'Description libre / Liste à puces',
        'custom.addBtn': '+ Ajouter une Ligne Libre',

        // Customize Form
        'customize.title': 'Personnaliser l\'Agencement',
        'customize.desc': 'Activez ou désactivez simplement des blocs d\'information selon vos convenances.',
        'customize.certifications_desc': 'Diplômes ou brevets techniques non académiques d\'apprentissage.',
        'customize.projects_desc': 'Projets d\'école marquants, applications web personnelles ou hackathons.',
        'customize.languages_desc': 'Connaissances et habiletés linguistiques diverses.',
        'customize.awards_desc': 'Récompenses, médailles de fin de cycle scolaire ou attestations de mérite.',
        'customize.trainings_desc': 'Micro-accréditations, cours de perfectionnement ou bootcamps intensifs.',
        'customize.publications_desc': 'Publications, synthèses d\'idées ou rapports partagés.',
        'customize.volunteer_desc': 'Tâches ou présidences exercées à titre gratuit ou caritatif.',
        'customize.custom_desc': 'Option joker pour accueillir des listes atypiques (Loisirs, Brevets, Références).',

        // Finalize Form
        'finalize.title': 'Vérifier & Exporter',
        'finalize.desc': 'Choisissez les polices d\'écriture, ajustez l\'élan des couleurs, puis téléchargez au format papier.',
        'finalize.chooseTemplate': 'Choisissez une Thématique Visuelle',
        'finalize.searchPlaceholder': 'Filtrer par nom ou étiquette...',
        'finalize.viewAll': 'Toutes les Créations',
        'finalize.atsHint': '💡 Astuce : Privilégiez des structures à une seule colonne (Classic, Compact, Clean) pour s\'assurer du décryptage par les filtres ATS.'
    },
    de: {
        // Navigation Section Titles
        'nav.contact': 'Kontaktdaten',
        'nav.summary': 'Kurzprofil',
        'nav.experience': 'Schwerpunkte',
        'nav.projects': 'Projekte',
        'nav.education': 'Bildungsweg',
        'nav.skills': 'Kompetenzen',
        'nav.certifications': 'Zertifikate',
        'nav.languages': 'Sprachen',
        'nav.awards': 'Auszeichnungen',
        'nav.trainings': 'Weiterbildung',
        'nav.publications': 'Publikationen',
        'nav.volunteer': 'Engagement',
        'nav.custom': 'Zusatzbereich',
        'nav.customize': 'Bereiche anpassen',
        'nav.finalize': 'Fertigstellung',

        // General/Header Buttons & Labels
        'btn.aiEnhance': 'KI-Verbesserung',
        'btn.loadExample': 'Muster laden',
        'btn.saveDraft': 'Entwurf speichern',
        'btn.save': 'Speichern',
        'btn.saving': 'Speichert...',
        'btn.saved': '✓ Gespeichert!',
        'btn.downloadPDF': 'PDF exportieren',
        'btn.addMore': 'Eintrag hinzufügen',
        'btn.delete': 'Löschen',
        'btn.clearSection': 'Inhalt leeren',
        'btn.nextSection': 'Nächster Schritt',
        'label.livePreview': 'Live-Vorschau',
        'label.ready': 'Bereit',
        'label.selectLanguage': 'Sprache',
        'label.backToDashboard': 'Zur Übersicht',

        // Contact Form
        'contact.title': 'Persönliche Kontaktdaten',
        'contact.desc': 'Geben Sie Ihre Kontaktdaten ein, damit Arbeitgeber Sie kontaktieren können.',
        'contact.firstName': 'Vorname',
        'contact.lastName': 'Nachname',
        'contact.jobTitle': 'Gewünschte Position',
        'contact.phone': 'Telefonnummer',
        'contact.email': 'E-Mail-Adresse',
        'contact.address': 'Straße & Hausnummer',
        'contact.country': 'Land',
        'contact.city': 'Stadt',
        'contact.linkedin': 'LinkedIn-Profil (URL)',
        'contact.website': 'Eigene Webseite (URL)',
        'contact.photo': 'Foto hochladen',
        'contact.photoDesc': 'PNG oder JPG. Optimal quadratische Auflösung (z.B. 400x400px).',

        // Summary Form
        'summary.title': 'Berufliches Profil',
        'summary.desc': 'Schreiben Sie eine prägnante Zusammenfassung (3-4 Sätze) Ihrer bisherigen Erfolge und Stärken.',
        'summary.placeholder': 'Beschreiben Sie hier Ihre Kernkompetenzen und Karriereziele...',

        // Experience Form
        'experience.title': 'Beruflicher Werdegang',
        'experience.desc': 'Listen Sie Ihren beruflichen Werdegang auf, beginnend mit der aktuellsten Position.',
        'experience.jobTitle': 'Berufsbezeichnung / Rolle',
        'experience.company': 'Unternehmen / Arbeitgeber',
        'experience.location': 'Standort (z.B. Berlin)',
        'experience.startDate': 'Startdatum',
        'experience.endDate': 'Enddatum',
        'experience.description': 'Aufgaben und Erfolge',
        'experience.addBtn': '+ Position hinzufügen',

        // Projects Form
        'projects.title': 'Projekte',
        'projects.desc': 'Heben Sie herausragende eigene Projekte, Portfolios oder Software-Beteiligungen hervor.',
        'projects.name': 'Projektname',
        'projects.technologies': 'Genutzte Technologien',
        'projects.link': 'Projekt-Link (optional)',
        'projects.startDate': 'Startdatum',
        'projects.endDate': 'Enddatum',
        'projects.description': 'Projektdetails und Ihre Rolle',
        'projects.addBtn': '+ Projekt hinzufügen',

        // Education Form
        'education.title': 'Ausbildung & Studium',
        'education.desc': 'Fügen Sie Ihren akademischen Werdegang oder Ihren Schulabschluss hinzu.',
        'education.school': 'Schule / Universität',
        'education.degree': 'Abschluss / Studienfach',
        'education.location': 'Standort',
        'education.startDate': 'Startdatum',
        'education.endDate': 'Enddatum',
        'education.description': 'Optionale Zusatzinfos (Notenschnitt, Schwerpunkt, Abschlussarbeit)',
        'education.addBtn': '+ Ausbildung hinzufügen',

        // Skills Form
        'skills.title': 'Kompetenzen',
        'skills.desc': 'Tragen Sie Fachkompetenzen, methodische Programmierkenntnisse und Soft Skills ein.',
        'skills.placeholder': 'Kompetenz eingeben und Enter drücken (z.B. React, Agilität)...',
        'skills.popular': 'Vorschläge für Ihre Zielposition',
        'skills.empty': 'Geben Sie im Reiter für die Kontaktdaten eine Zielposition ein, um passende Vorschläge zu erhalten.',

        // Certifications Form
        'certifications.title': 'Zertifikate',
        'certifications.desc': 'Fügen Sie professionelle Lizenzen, Branchenzertifikate oder bestandene Prüfungen hinzu.',
        'certifications.name': 'Zertifikatsbezeichnung',
        'certifications.number': 'Zertifikats- / Lizenznummer',
        'certifications.expiryDate': 'Gültig bis (Ablaufdatum)',
        'certifications.description': 'Zusatzbeschreibung / Details',
        'certifications.addBtn': '+ Zertifikat hinzufügen',

        // Languages Form
        'languages.title': 'Sprachkenntnisse',
        'languages.desc': 'Geben Sie an, welche Sprachen Sie sprechen und wie gut Ihre Kenntnisse sind.',
        'languages.lang': 'Sprache',
        'languages.proficiency': 'Sprachniveau',
        'languages.addBtn': '+ Sprache hinzufügen',
        'languages.p_native': 'Muttersprache / Verhandlungssicher',
        'languages.p_fluent': 'Sehr gut / Fließend',
        'languages.p_proficient': 'Fortgeschrittene Kenntnisse',
        'languages.p_intermediate': 'Grundkenntnisse / Konversationssicher',
        'languages.p_basic': 'Elementare Grundkenntnisse',

        // Awards Form
        'awards.title': 'Auszeichnungen',
        'awards.desc': 'Listen Sie Stipendien, Branchenerfolge oder akademische Ehrungen auf.',
        'awards.name': 'Name der Auszeichnung',
        'awards.issuer': 'Verleihende Organisation',
        'awards.date': 'Datum der Verleihung',
        'awards.description': 'Wofür wurde diese Auszeichnung verliehen?',
        'awards.addBtn': '+ Auszeichnung hinzufügen',

        // Trainings Form
        'trainings.title': 'Seminare & Weiterbildung',
        'trainings.desc': 'Ergänzen Sie Intensivkurse, professionelle Trainings, Webinare oder Management-Seminare.',
        'trainings.course': 'Name der Weiterbildung / des Kurses',
        'trainings.institution': 'Bildungsanbieter',
        'trainings.date': 'Abschlussdatum',
        'trainings.description': 'Inhalte / erlangtes Fachwissen',
        'trainings.addBtn': '+ Weiterbildung hinzufügen',

        // Publications Form
        'publications.title': 'Publikationen',
        'publications.desc': 'Fachbücher, wissenschaftliche Forschungsberichte, Aufsätze oder Artikel.',
        'publications.name': 'Titel der Publikation',
        'publications.publisher': 'Herausgeber / Fachzeitschrift',
        'publications.date': 'Veröffentlichungsdatum',
        'publications.link': 'URL-Adresse',
        'publications.description': 'Kurzfassung oder Beschreibung der Publikation',
        'publications.addBtn': '+ Publikation hinzufügen',

        // Volunteer Form
        'volunteer.title': 'Ehrenamtliches Engagement',
        'volunteer.desc': 'Zeigen Sie soziales und ehrenamtliches Engagement für Umwelt, Sport oder gemeinnützige Zwecke.',
        'volunteer.role': 'Ihre Rolle / Tätigkeit',
        'volunteer.organization': 'Organisation / Verein',
        'volunteer.location': 'Standort',
        'volunteer.startDate': 'Startdatum',
        'volunteer.endDate': 'Enddatum',
        'volunteer.description': 'Beschreibung Ihrer sozialen Beiträge',
        'volunteer.addBtn': '+ Ehrenamt hinzufügen',

        // Custom Section Form
        'custom.title': 'Benutzerdefinierter Bereich',
        'custom.desc': 'Fügen Sie beliebige andere Fähigkeiten hinzu (z. B. Hobbys, Militärdienst, Referenzen).',
        'custom.name': 'Titel der Aktivität / des Eintrags',
        'custom.subtitle': 'Untertitel / zugehörige Organisation',
        'custom.date': 'Datum',
        'custom.description': 'Zusätzliche Erläuterungen / Aufzählung',
        'custom.addBtn': '+ Eintrag hinzufügen',

        // Customize Form
        'customize.title': 'Lebenslauf strukturieren',
        'customize.desc': 'Bestimmen Sie flexibel die Struktur Ihres Lebenslaufs. Optionale Bereiche umschalten.',
        'customize.certifications_desc': 'Zusätzliche Berufsdiplome oder Lizenzen außerhalb des Hauptstudiums.',
        'customize.projects_desc': 'Besondere Studienprojekte, Software-Anwendungen oder Freelance-Aufträge.',
        'customize.languages_desc': 'Angaben zu Sprachkenntnissen und Sprechkompetenzen.',
        'customize.awards_desc': 'Stipendien, Firmentrophäen oder akademische Preiszertifikate.',
        'customize.trainings_desc': 'Intensivbootcamps, Trainingskurse oder anerkannte Seminare.',
        'customize.publications_desc': 'Fachartikel, Forschungsarbeiten oder geteilte Essays.',
        'customize.volunteer_desc': 'Soziale Engagements, Vereinsvorsitz oder ehrenamtliche Arbeit.',
        'customize.custom_desc': 'Vielseitiger Freiraum für persönliche Stärken (Hobbys, Referenzen, Patente).',

        // Finalize Form
        'finalize.title': 'Fertigstellung & Export',
        'finalize.desc': 'Wählen Sie Schriftarten, verändern Sie Ihre Themenfarbe und laden Sie die Print-Version herunter.',
        'finalize.chooseTemplate': 'Wählen Sie ein Design-Template',
        'finalize.searchPlaceholder': 'Vorlage nach Name oder Tag suchen...',
        'finalize.viewAll': 'Alle Designs',
        'finalize.atsHint': '💡 Empfehlung: Nutzen Sie ein einfaches, einspaltiges Design (Classic, Compact, Clean) für beste ATS-Durchlässigkeit.'
    }
};

interface TranslationContextProps {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    t: (key: string, defaultText?: string) => string;
}

const TranslationContext = createContext<TranslationContextProps | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<LanguageCode>(() => {
        try {
            const saved = localStorage.getItem('cvbase-language');
            if (saved === 'es' || saved === 'fr' || saved === 'de') return saved as LanguageCode;
        } catch (e) {}
        return 'en';
    });

    const setLanguage = (lang: LanguageCode) => {
        setLanguageState(lang);
        try {
            localStorage.setItem('cvbase-language', lang);
        } catch (e) {}
    };

    const t = (key: string, defaultText?: string): string => {
        const value = translations[language]?.[key];
        if (value !== undefined) return value;
        // Fallback to English translation
        const fallbackValue = translations['en']?.[key];
        if (fallbackValue !== undefined) return fallbackValue;
        return defaultText || key;
    };

    return (
        <TranslationContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error('useTranslation must be used within a TranslationProvider');
    }
    return context;
};
