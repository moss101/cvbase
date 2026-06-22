/**
 * Skill taxonomy used by the ATS engine for keyword normalization.
 * Aliases let "JS", "Javascript" and "ECMAScript" all resolve to one skill,
 * the way commercial ATS parsers (Taleo, Workday, Greenhouse) normalize terms.
 */

export type SkillCategory =
    | 'language' | 'framework' | 'cloud' | 'database' | 'devops' | 'data'
    | 'design' | 'tool' | 'methodology' | 'security' | 'marketing' | 'sales'
    | 'finance' | 'operations' | 'healthcare' | 'hr' | 'soft';

export interface SkillDef {
    name: string;
    aliases: string[];
    category: SkillCategory;
}

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
    language: 'Programming Languages',
    framework: 'Frameworks & Libraries',
    cloud: 'Cloud & Infrastructure',
    database: 'Databases',
    devops: 'DevOps & CI/CD',
    data: 'Data & Analytics',
    design: 'Design & UX',
    tool: 'Tools & Platforms',
    methodology: 'Methodologies',
    security: 'Security',
    marketing: 'Marketing',
    sales: 'Sales & CRM',
    finance: 'Finance & Accounting',
    operations: 'Operations & Supply Chain',
    healthcare: 'Healthcare',
    hr: 'HR & Recruiting',
    soft: 'Soft Skills',
};

export const HARD_CATEGORIES: SkillCategory[] = [
    'language', 'framework', 'cloud', 'database', 'devops', 'data', 'design',
    'tool', 'methodology', 'security', 'marketing', 'sales', 'finance',
    'operations', 'healthcare', 'hr',
];

export const SKILLS: SkillDef[] = [
    // ----- Programming languages -----
    { name: 'JavaScript', aliases: ['js', 'javascript', 'ecmascript', 'es6', 'es2015'], category: 'language' },
    { name: 'TypeScript', aliases: ['ts', 'typescript'], category: 'language' },
    { name: 'Python', aliases: ['python', 'python3'], category: 'language' },
    { name: 'Java', aliases: ['java'], category: 'language' },
    { name: 'C#', aliases: ['c#', 'csharp', 'c sharp'], category: 'language' },
    { name: 'C++', aliases: ['c++', 'cpp', 'cplusplus'], category: 'language' },
    { name: 'C', aliases: ['c language', 'c programming'], category: 'language' },
    { name: 'Go', aliases: ['golang', 'go lang'], category: 'language' },
    { name: 'Rust', aliases: ['rust'], category: 'language' },
    { name: 'Ruby', aliases: ['ruby'], category: 'language' },
    { name: 'PHP', aliases: ['php'], category: 'language' },
    { name: 'Swift', aliases: ['swift'], category: 'language' },
    { name: 'Kotlin', aliases: ['kotlin'], category: 'language' },
    { name: 'Scala', aliases: ['scala'], category: 'language' },
    { name: 'R', aliases: ['r language', 'r programming'], category: 'language' },
    { name: 'SQL', aliases: ['sql', 'structured query language'], category: 'language' },
    { name: 'HTML', aliases: ['html', 'html5'], category: 'language' },
    { name: 'CSS', aliases: ['css', 'css3'], category: 'language' },
    { name: 'Sass', aliases: ['sass', 'scss'], category: 'language' },
    { name: 'Bash', aliases: ['bash', 'shell scripting', 'shell'], category: 'language' },
    { name: 'PowerShell', aliases: ['powershell'], category: 'language' },
    { name: 'MATLAB', aliases: ['matlab'], category: 'language' },
    { name: 'Perl', aliases: ['perl'], category: 'language' },
    { name: 'Objective-C', aliases: ['objective-c', 'objective c', 'objc'], category: 'language' },
    { name: 'Dart', aliases: ['dart'], category: 'language' },
    { name: 'Solidity', aliases: ['solidity'], category: 'language' },
    { name: 'GraphQL', aliases: ['graphql'], category: 'language' },

    // ----- Frameworks & libraries -----
    { name: 'React', aliases: ['react', 'reactjs', 'react.js', 'react js'], category: 'framework' },
    { name: 'React Native', aliases: ['react native', 'react-native'], category: 'framework' },
    { name: 'Next.js', aliases: ['next.js', 'nextjs', 'next js'], category: 'framework' },
    { name: 'Vue.js', aliases: ['vue', 'vuejs', 'vue.js'], category: 'framework' },
    { name: 'Nuxt', aliases: ['nuxt', 'nuxt.js', 'nuxtjs'], category: 'framework' },
    { name: 'Angular', aliases: ['angular', 'angularjs', 'angular.js'], category: 'framework' },
    { name: 'Svelte', aliases: ['svelte', 'sveltekit'], category: 'framework' },
    { name: 'Node.js', aliases: ['node', 'nodejs', 'node.js', 'node js'], category: 'framework' },
    { name: 'Express', aliases: ['express', 'expressjs', 'express.js'], category: 'framework' },
    { name: 'NestJS', aliases: ['nestjs', 'nest.js'], category: 'framework' },
    { name: 'Django', aliases: ['django'], category: 'framework' },
    { name: 'Flask', aliases: ['flask'], category: 'framework' },
    { name: 'FastAPI', aliases: ['fastapi', 'fast api'], category: 'framework' },
    { name: 'Ruby on Rails', aliases: ['rails', 'ruby on rails', 'ror'], category: 'framework' },
    { name: 'Spring Boot', aliases: ['spring', 'spring boot', 'springboot'], category: 'framework' },
    { name: '.NET', aliases: ['.net', 'dotnet', 'asp.net', 'aspnet', '.net core'], category: 'framework' },
    { name: 'Laravel', aliases: ['laravel'], category: 'framework' },
    { name: 'jQuery', aliases: ['jquery'], category: 'framework' },
    { name: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss', 'tailwind css'], category: 'framework' },
    { name: 'Bootstrap', aliases: ['bootstrap'], category: 'framework' },
    { name: 'Redux', aliases: ['redux'], category: 'framework' },
    { name: 'Flutter', aliases: ['flutter'], category: 'framework' },
    { name: 'Electron', aliases: ['electron'], category: 'framework' },
    { name: 'TensorFlow', aliases: ['tensorflow', 'tf'], category: 'framework' },
    { name: 'PyTorch', aliases: ['pytorch', 'torch'], category: 'framework' },
    { name: 'Keras', aliases: ['keras'], category: 'framework' },
    { name: 'scikit-learn', aliases: ['scikit-learn', 'scikit learn', 'sklearn'], category: 'framework' },
    { name: 'pandas', aliases: ['pandas'], category: 'framework' },
    { name: 'NumPy', aliases: ['numpy'], category: 'framework' },
    { name: 'LangChain', aliases: ['langchain'], category: 'framework' },
    { name: 'Spark', aliases: ['spark', 'apache spark', 'pyspark'], category: 'framework' },
    { name: 'Hadoop', aliases: ['hadoop'], category: 'framework' },
    { name: 'Kafka', aliases: ['kafka', 'apache kafka'], category: 'framework' },

    // ----- Cloud & infrastructure -----
    { name: 'AWS', aliases: ['aws', 'amazon web services'], category: 'cloud' },
    { name: 'Azure', aliases: ['azure', 'microsoft azure'], category: 'cloud' },
    { name: 'Google Cloud', aliases: ['gcp', 'google cloud', 'google cloud platform'], category: 'cloud' },
    { name: 'Firebase', aliases: ['firebase'], category: 'cloud' },
    { name: 'Heroku', aliases: ['heroku'], category: 'cloud' },
    { name: 'Vercel', aliases: ['vercel'], category: 'cloud' },
    { name: 'Cloudflare', aliases: ['cloudflare'], category: 'cloud' },
    { name: 'Lambda', aliases: ['aws lambda', 'lambda functions'], category: 'cloud' },
    { name: 'S3', aliases: ['s3', 'amazon s3'], category: 'cloud' },
    { name: 'EC2', aliases: ['ec2'], category: 'cloud' },
    { name: 'Serverless', aliases: ['serverless'], category: 'cloud' },
    { name: 'Microservices', aliases: ['microservices', 'micro-services', 'microservice'], category: 'cloud' },

    // ----- Databases -----
    { name: 'PostgreSQL', aliases: ['postgres', 'postgresql', 'psql'], category: 'database' },
    { name: 'MySQL', aliases: ['mysql'], category: 'database' },
    { name: 'MongoDB', aliases: ['mongo', 'mongodb'], category: 'database' },
    { name: 'Redis', aliases: ['redis'], category: 'database' },
    { name: 'Elasticsearch', aliases: ['elasticsearch', 'elastic search', 'elk'], category: 'database' },
    { name: 'DynamoDB', aliases: ['dynamodb', 'dynamo db'], category: 'database' },
    { name: 'SQLite', aliases: ['sqlite'], category: 'database' },
    { name: 'Oracle', aliases: ['oracle', 'oracle db', 'pl/sql'], category: 'database' },
    { name: 'SQL Server', aliases: ['sql server', 'mssql', 't-sql'], category: 'database' },
    { name: 'Cassandra', aliases: ['cassandra'], category: 'database' },
    { name: 'Snowflake', aliases: ['snowflake'], category: 'database' },
    { name: 'BigQuery', aliases: ['bigquery', 'big query'], category: 'database' },
    { name: 'Redshift', aliases: ['redshift'], category: 'database' },
    { name: 'Supabase', aliases: ['supabase'], category: 'database' },

    // ----- DevOps -----
    { name: 'Docker', aliases: ['docker', 'containerization', 'containers'], category: 'devops' },
    { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'], category: 'devops' },
    { name: 'CI/CD', aliases: ['ci/cd', 'cicd', 'continuous integration', 'continuous delivery', 'continuous deployment'], category: 'devops' },
    { name: 'Jenkins', aliases: ['jenkins'], category: 'devops' },
    { name: 'GitHub Actions', aliases: ['github actions'], category: 'devops' },
    { name: 'GitLab CI', aliases: ['gitlab ci', 'gitlab'], category: 'devops' },
    { name: 'Terraform', aliases: ['terraform', 'iac', 'infrastructure as code'], category: 'devops' },
    { name: 'Ansible', aliases: ['ansible'], category: 'devops' },
    { name: 'Git', aliases: ['git', 'version control'], category: 'devops' },
    { name: 'Linux', aliases: ['linux', 'unix', 'ubuntu', 'centos'], category: 'devops' },
    { name: 'Nginx', aliases: ['nginx'], category: 'devops' },
    { name: 'Monitoring', aliases: ['monitoring', 'observability', 'grafana', 'prometheus', 'datadog', 'new relic'], category: 'devops' },

    // ----- Data & analytics -----
    { name: 'Machine Learning', aliases: ['machine learning', 'ml'], category: 'data' },
    { name: 'Deep Learning', aliases: ['deep learning', 'neural networks'], category: 'data' },
    { name: 'NLP', aliases: ['nlp', 'natural language processing'], category: 'data' },
    { name: 'Computer Vision', aliases: ['computer vision', 'cv models', 'image recognition'], category: 'data' },
    { name: 'Generative AI', aliases: ['generative ai', 'genai', 'gen ai', 'llm', 'llms', 'large language models', 'prompt engineering'], category: 'data' },
    { name: 'Data Analysis', aliases: ['data analysis', 'data analytics', 'data analyst'], category: 'data' },
    { name: 'Data Science', aliases: ['data science'], category: 'data' },
    { name: 'Data Engineering', aliases: ['data engineering', 'etl', 'elt', 'data pipelines', 'data pipeline'], category: 'data' },
    { name: 'Data Visualization', aliases: ['data visualization', 'data viz', 'dashboards', 'dashboarding'], category: 'data' },
    { name: 'Tableau', aliases: ['tableau'], category: 'data' },
    { name: 'Power BI', aliases: ['power bi', 'powerbi'], category: 'data' },
    { name: 'Looker', aliases: ['looker'], category: 'data' },
    { name: 'Excel', aliases: ['excel', 'microsoft excel', 'spreadsheets', 'pivot tables', 'vlookup'], category: 'data' },
    { name: 'A/B Testing', aliases: ['a/b testing', 'ab testing', 'split testing', 'experimentation'], category: 'data' },
    { name: 'Statistics', aliases: ['statistics', 'statistical analysis', 'statistical modeling', 'regression'], category: 'data' },
    { name: 'dbt', aliases: ['dbt'], category: 'data' },
    { name: 'Airflow', aliases: ['airflow', 'apache airflow'], category: 'data' },

    // ----- Design -----
    { name: 'Figma', aliases: ['figma'], category: 'design' },
    { name: 'Sketch', aliases: ['sketch app'], category: 'design' },
    { name: 'Adobe Photoshop', aliases: ['photoshop'], category: 'design' },
    { name: 'Adobe Illustrator', aliases: ['illustrator'], category: 'design' },
    { name: 'Adobe XD', aliases: ['adobe xd'], category: 'design' },
    { name: 'After Effects', aliases: ['after effects'], category: 'design' },
    { name: 'UI Design', aliases: ['ui design', 'user interface design', 'ui/ux', 'ui'], category: 'design' },
    { name: 'UX Design', aliases: ['ux design', 'user experience', 'ux'], category: 'design' },
    { name: 'UX Research', aliases: ['ux research', 'user research', 'usability testing'], category: 'design' },
    { name: 'Wireframing', aliases: ['wireframing', 'wireframes', 'prototyping', 'prototypes'], category: 'design' },
    { name: 'Design Systems', aliases: ['design system', 'design systems'], category: 'design' },
    { name: 'Accessibility', aliases: ['accessibility', 'wcag', 'a11y'], category: 'design' },

    // ----- Tools & platforms -----
    { name: 'Jira', aliases: ['jira'], category: 'tool' },
    { name: 'Confluence', aliases: ['confluence'], category: 'tool' },
    { name: 'Slack', aliases: ['slack'], category: 'tool' },
    { name: 'Notion', aliases: ['notion'], category: 'tool' },
    { name: 'Asana', aliases: ['asana'], category: 'tool' },
    { name: 'Trello', aliases: ['trello'], category: 'tool' },
    { name: 'Microsoft Office', aliases: ['microsoft office', 'ms office', 'office suite', 'word', 'powerpoint'], category: 'tool' },
    { name: 'Google Workspace', aliases: ['google workspace', 'g suite', 'google docs', 'google sheets'], category: 'tool' },
    { name: 'SharePoint', aliases: ['sharepoint'], category: 'tool' },
    { name: 'WordPress', aliases: ['wordpress'], category: 'tool' },
    { name: 'Shopify', aliases: ['shopify'], category: 'tool' },
    { name: 'Webflow', aliases: ['webflow'], category: 'tool' },
    { name: 'Zapier', aliases: ['zapier', 'automation tools'], category: 'tool' },
    { name: 'REST APIs', aliases: ['rest', 'rest api', 'rest apis', 'restful', 'api integration', 'apis'], category: 'tool' },
    { name: 'Postman', aliases: ['postman'], category: 'tool' },
    { name: 'Stripe', aliases: ['stripe'], category: 'tool' },

    // ----- Methodologies -----
    { name: 'Agile', aliases: ['agile', 'agile methodologies', 'agile development'], category: 'methodology' },
    { name: 'Scrum', aliases: ['scrum'], category: 'methodology' },
    { name: 'Kanban', aliases: ['kanban'], category: 'methodology' },
    { name: 'Lean', aliases: ['lean', 'lean six sigma', 'six sigma'], category: 'methodology' },
    { name: 'TDD', aliases: ['tdd', 'test driven development', 'test-driven development'], category: 'methodology' },
    { name: 'Unit Testing', aliases: ['unit testing', 'unit tests', 'jest', 'pytest', 'junit', 'cypress', 'playwright', 'selenium'], category: 'methodology' },
    { name: 'Code Review', aliases: ['code review', 'code reviews', 'peer review'], category: 'methodology' },
    { name: 'OOP', aliases: ['oop', 'object oriented', 'object-oriented programming'], category: 'methodology' },
    { name: 'System Design', aliases: ['system design', 'software architecture', 'distributed systems'], category: 'methodology' },
    { name: 'Project Management', aliases: ['project management', 'pmp', 'program management'], category: 'methodology' },
    { name: 'Product Management', aliases: ['product management', 'product strategy', 'roadmap', 'roadmapping', 'product discovery'], category: 'methodology' },
    { name: 'SDLC', aliases: ['sdlc', 'software development lifecycle', 'software development life cycle'], category: 'methodology' },
    { name: 'Waterfall', aliases: ['waterfall'], category: 'methodology' },
    { name: 'OKRs', aliases: ['okr', 'okrs', 'kpis', 'kpi'], category: 'methodology' },

    // ----- Security -----
    { name: 'Cybersecurity', aliases: ['cybersecurity', 'cyber security', 'information security', 'infosec'], category: 'security' },
    { name: 'Penetration Testing', aliases: ['penetration testing', 'pen testing', 'pentest'], category: 'security' },
    { name: 'SIEM', aliases: ['siem', 'splunk'], category: 'security' },
    { name: 'Identity & Access Management', aliases: ['iam', 'identity and access management', 'sso', 'oauth', 'oauth2'], category: 'security' },
    { name: 'Compliance', aliases: ['compliance', 'gdpr', 'hipaa', 'soc 2', 'soc2', 'pci', 'iso 27001'], category: 'security' },
    { name: 'Network Security', aliases: ['network security', 'firewalls', 'vpn'], category: 'security' },
    { name: 'Vulnerability Management', aliases: ['vulnerability management', 'vulnerability assessment', 'threat modeling'], category: 'security' },

    // ----- Marketing -----
    { name: 'SEO', aliases: ['seo', 'search engine optimization'], category: 'marketing' },
    { name: 'SEM', aliases: ['sem', 'ppc', 'paid search', 'google ads', 'adwords'], category: 'marketing' },
    { name: 'Content Marketing', aliases: ['content marketing', 'content strategy', 'content creation', 'copywriting'], category: 'marketing' },
    { name: 'Social Media Marketing', aliases: ['social media', 'social media marketing', 'instagram', 'tiktok', 'community management'], category: 'marketing' },
    { name: 'Email Marketing', aliases: ['email marketing', 'mailchimp', 'klaviyo', 'email campaigns'], category: 'marketing' },
    { name: 'Google Analytics', aliases: ['google analytics', 'ga4'], category: 'marketing' },
    { name: 'Marketing Automation', aliases: ['marketing automation', 'marketo', 'pardot'], category: 'marketing' },
    { name: 'Brand Management', aliases: ['brand management', 'branding', 'brand strategy'], category: 'marketing' },
    { name: 'Growth Marketing', aliases: ['growth marketing', 'growth hacking', 'demand generation', 'lead generation'], category: 'marketing' },
    { name: 'CRO', aliases: ['cro', 'conversion rate optimization', 'conversion optimization'], category: 'marketing' },

    // ----- Sales & CRM -----
    { name: 'Salesforce', aliases: ['salesforce', 'sfdc'], category: 'sales' },
    { name: 'HubSpot', aliases: ['hubspot'], category: 'sales' },
    { name: 'CRM', aliases: ['crm', 'customer relationship management'], category: 'sales' },
    { name: 'B2B Sales', aliases: ['b2b sales', 'b2b', 'enterprise sales'], category: 'sales' },
    { name: 'Account Management', aliases: ['account management', 'key accounts', 'client relationships', 'client management'], category: 'sales' },
    { name: 'Business Development', aliases: ['business development', 'bd', 'partnerships'], category: 'sales' },
    { name: 'Negotiation', aliases: ['negotiation', 'contract negotiation', 'negotiating'], category: 'sales' },
    { name: 'Pipeline Management', aliases: ['pipeline management', 'sales pipeline', 'forecasting', 'sales forecasting'], category: 'sales' },
    { name: 'Cold Outreach', aliases: ['cold calling', 'cold outreach', 'prospecting', 'outbound sales'], category: 'sales' },
    { name: 'Customer Success', aliases: ['customer success', 'customer retention', 'churn reduction', 'onboarding'], category: 'sales' },

    // ----- Finance -----
    { name: 'Financial Analysis', aliases: ['financial analysis', 'financial analyst'], category: 'finance' },
    { name: 'Financial Modeling', aliases: ['financial modeling', 'financial models', 'dcf', 'valuation'], category: 'finance' },
    { name: 'Budgeting', aliases: ['budgeting', 'budget management', 'forecasting budgets'], category: 'finance' },
    { name: 'Accounting', aliases: ['accounting', 'gaap', 'ifrs', 'bookkeeping'], category: 'finance' },
    { name: 'QuickBooks', aliases: ['quickbooks'], category: 'finance' },
    { name: 'SAP', aliases: ['sap', 'sap erp'], category: 'finance' },
    { name: 'Auditing', aliases: ['auditing', 'audit', 'internal controls'], category: 'finance' },
    { name: 'Risk Management', aliases: ['risk management', 'risk assessment', 'credit risk'], category: 'finance' },
    { name: 'Accounts Payable/Receivable', aliases: ['accounts payable', 'accounts receivable', 'ap/ar'], category: 'finance' },
    { name: 'CPA', aliases: ['cpa', 'certified public accountant'], category: 'finance' },
    { name: 'FP&A', aliases: ['fp&a', 'financial planning and analysis', 'financial planning'], category: 'finance' },

    // ----- Operations -----
    { name: 'Supply Chain', aliases: ['supply chain', 'supply chain management', 'scm'], category: 'operations' },
    { name: 'Logistics', aliases: ['logistics', 'shipping', 'distribution', 'freight'], category: 'operations' },
    { name: 'Inventory Management', aliases: ['inventory management', 'inventory control', 'stock management'], category: 'operations' },
    { name: 'Procurement', aliases: ['procurement', 'purchasing', 'sourcing', 'vendor management', 'supplier management'], category: 'operations' },
    { name: 'Process Improvement', aliases: ['process improvement', 'process optimization', 'continuous improvement', 'kaizen'], category: 'operations' },
    { name: 'Quality Assurance', aliases: ['quality assurance', 'qa', 'quality control', 'qc'], category: 'operations' },
    { name: 'ERP', aliases: ['erp', 'enterprise resource planning', 'netsuite', 'oracle erp'], category: 'operations' },
    { name: 'Operations Management', aliases: ['operations management', 'business operations'], category: 'operations' },

    // ----- Healthcare -----
    { name: 'Patient Care', aliases: ['patient care', 'patient-centered care', 'bedside care'], category: 'healthcare' },
    { name: 'EMR/EHR', aliases: ['emr', 'ehr', 'epic', 'cerner', 'electronic health records', 'electronic medical records'], category: 'healthcare' },
    { name: 'HIPAA Compliance', aliases: ['hipaa compliance'], category: 'healthcare' },
    { name: 'Clinical Documentation', aliases: ['clinical documentation', 'charting', 'medical records'], category: 'healthcare' },
    { name: 'Medication Administration', aliases: ['medication administration', 'med administration', 'pharmacology'], category: 'healthcare' },
    { name: 'Care Planning', aliases: ['care planning', 'care plans', 'treatment planning'], category: 'healthcare' },
    { name: 'Phlebotomy', aliases: ['phlebotomy', 'blood draws'], category: 'healthcare' },
    { name: 'CPR/BLS', aliases: ['cpr', 'bls', 'acls', 'first aid'], category: 'healthcare' },
    { name: 'Telehealth', aliases: ['telehealth', 'telemedicine'], category: 'healthcare' },

    // ----- HR -----
    { name: 'Recruiting', aliases: ['recruiting', 'recruitment', 'talent acquisition', 'full-cycle recruiting', 'sourcing candidates'], category: 'hr' },
    { name: 'Onboarding Programs', aliases: ['employee onboarding', 'new hire onboarding'], category: 'hr' },
    { name: 'HRIS', aliases: ['hris', 'workday', 'bamboohr', 'adp'], category: 'hr' },
    { name: 'Employee Relations', aliases: ['employee relations', 'employee engagement'], category: 'hr' },
    { name: 'Performance Management', aliases: ['performance management', 'performance reviews'], category: 'hr' },
    { name: 'Compensation & Benefits', aliases: ['compensation', 'benefits administration', 'payroll', 'total rewards'], category: 'hr' },
    { name: 'Training & Development', aliases: ['training and development', 'learning and development', 'l&d', 'employee training'], category: 'hr' },
    { name: 'ATS Platforms', aliases: ['greenhouse', 'lever', 'icims', 'taleo', 'applicant tracking'], category: 'hr' },

    // ----- Soft skills -----
    { name: 'Communication', aliases: ['communication', 'communication skills', 'verbal communication', 'written communication', 'presentation skills', 'public speaking'], category: 'soft' },
    { name: 'Leadership', aliases: ['leadership', 'team leadership', 'people management', 'mentoring', 'mentorship', 'coaching'], category: 'soft' },
    { name: 'Collaboration', aliases: ['collaboration', 'teamwork', 'cross-functional', 'cross functional', 'team player'], category: 'soft' },
    { name: 'Problem Solving', aliases: ['problem solving', 'problem-solving', 'analytical skills', 'critical thinking', 'analytical thinking'], category: 'soft' },
    { name: 'Time Management', aliases: ['time management', 'prioritization', 'multitasking', 'deadline-driven'], category: 'soft' },
    { name: 'Adaptability', aliases: ['adaptability', 'flexibility', 'fast-paced environment', 'fast paced'], category: 'soft' },
    { name: 'Attention to Detail', aliases: ['attention to detail', 'detail-oriented', 'detail oriented', 'accuracy'], category: 'soft' },
    { name: 'Stakeholder Management', aliases: ['stakeholder management', 'stakeholder engagement', 'stakeholders', 'executive communication'], category: 'soft' },
    { name: 'Creativity', aliases: ['creativity', 'creative thinking', 'innovation', 'innovative'], category: 'soft' },
    { name: 'Customer Focus', aliases: ['customer service', 'customer focus', 'client-facing', 'customer-centric', 'customer experience'], category: 'soft' },
    { name: 'Decision Making', aliases: ['decision making', 'decision-making', 'judgment', 'strategic thinking'], category: 'soft' },
    { name: 'Conflict Resolution', aliases: ['conflict resolution', 'mediation', 'de-escalation'], category: 'soft' },
    { name: 'Emotional Intelligence', aliases: ['emotional intelligence', 'empathy', 'interpersonal skills'], category: 'soft' },
    { name: 'Organization', aliases: ['organizational skills', 'organized', 'planning skills'], category: 'soft' },
    { name: 'Initiative', aliases: ['initiative', 'self-starter', 'self starter', 'proactive', 'ownership mindset'], category: 'soft' },
];

/** Strong action verbs an ATS-friendly bullet should start with. */
export const STRONG_ACTION_VERBS = new Set([
    'achieved', 'accelerated', 'analyzed', 'architected', 'automated', 'boosted', 'built',
    'championed', 'collaborated', 'conceived', 'consolidated', 'coordinated', 'created', 'cut',
    'decreased', 'delivered', 'designed', 'developed', 'directed', 'doubled', 'drove', 'earned',
    'eliminated', 'enabled', 'engineered', 'enhanced', 'established', 'exceeded', 'executed',
    'expanded', 'expedited', 'forecasted', 'founded', 'generated', 'grew', 'guided',
    'identified', 'implemented', 'improved', 'increased', 'influenced', 'initiated',
    'instituted', 'integrated', 'introduced', 'launched', 'led', 'leveraged', 'managed',
    'mentored', 'migrated', 'modernized', 'negotiated', 'optimized', 'orchestrated',
    'overhauled', 'owned', 'partnered', 'pioneered', 'planned', 'produced', 'reduced',
    're-engineered', 'redesigned', 'resolved', 'restructured', 'revamped', 'saved', 'scaled',
    'secured', 'shipped', 'simplified', 'spearheaded', 'standardized', 'streamlined',
    'strengthened', 'supervised', 'surpassed', 'transformed', 'tripled', 'won',
]);

/** Weak openers that read passive or vague to recruiters. */
export const WEAK_OPENERS = new Set([
    'responsible', 'worked', 'helped', 'assisted', 'involved', 'participated', 'duties',
    'tasked', 'handled', 'did', 'was', 'were', 'made', 'used', 'utilized', 'familiar',
]);

/** Overused clichés that add no information for an ATS or recruiter. */
export const CLICHES = [
    'team player', 'hard worker', 'hard-working', 'go-getter', 'think outside the box',
    'results-driven', 'results driven', 'detail-oriented professional', 'self-motivated',
    'go above and beyond', 'proven track record', 'dynamic individual', 'synergy',
    'best of breed', 'goal-oriented', 'people person', 'works well under pressure',
];

/** First-person pronouns that should not appear in resume bullets. */
export const FIRST_PERSON = ['i ', ' me ', ' my ', ' mine ', 'myself'];

export interface NormalizedSkill {
    def: SkillDef;
    /** Which alias matched, for display context. */
    matched: string;
    /** How often it occurred in the source text. */
    count: number;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface CompiledAlias {
    def: SkillDef;
    alias: string;
    re: RegExp;
}

let compiled: CompiledAlias[] | null = null;

const compile = (): CompiledAlias[] => {
    if (compiled) return compiled;
    compiled = [];
    for (const def of SKILLS) {
        for (const alias of def.aliases) {
            // Word-boundary match; symbols like "c++"/"c#" need custom boundaries.
            const body = escapeRegex(alias.toLowerCase());
            const re = /^[a-z0-9]/.test(alias) && /[a-z0-9]$/.test(alias)
                ? new RegExp(`\\b${body}\\b`, 'g')
                : new RegExp(`(?<![\\w+#])${body}(?![\\w+#])`, 'g');
            compiled.push({ def, alias, re });
        }
    }
    // Longer aliases first so "react native" wins over "react".
    compiled.sort((a, b) => b.alias.length - a.alias.length);
    return compiled;
};

/**
 * Find every taxonomy skill present in a block of text, normalized and
 * de-duplicated (each canonical skill is reported once with total count).
 */
export const extractSkills = (text: string): NormalizedSkill[] => {
    const lower = ` ${text.toLowerCase()} `;
    const found = new Map<string, NormalizedSkill>();
    for (const { def, alias, re } of compile()) {
        re.lastIndex = 0;
        let count = 0;
        while (re.exec(lower) !== null) count++;
        if (count > 0) {
            const existing = found.get(def.name);
            if (existing) existing.count += count;
            else found.set(def.name, { def, matched: alias, count });
        }
    }
    return Array.from(found.values());
};

/** Resolve one free-form term (e.g. a skill chip on a resume) to a canonical skill. */
export const normalizeSkillTerm = (term: string): SkillDef | null => {
    const t = term.trim().toLowerCase();
    if (!t) return null;
    for (const def of SKILLS) {
        if (def.name.toLowerCase() === t) return def;
        if (def.aliases.some(a => a === t)) return def;
    }
    return null;
};
