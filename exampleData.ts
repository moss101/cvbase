import type { ResumeData } from './types';

export const exampleData: ResumeData = {
    contact: {
        firstName: 'Jane',
        lastName: 'Sterling, PhD',
        jobTitle: 'Principal Distributed Systems Architect',
        phone: '4155550189',
        phoneCountryCode: '+1',
        email: 'jane.sterling@ieee-member.org',
        address: 'Presidio Heights',
        country: 'US',
        city: 'San Francisco',
        customCity: '',
        linkedin: 'linkedin.com/in/jane-sterling-systems',
        website: 'sterling-architectures.dev',
        photo: ''
    },
    summary: {
        professionalSummary: 'Distinguished, performance-driven Systems Architect & Software Engineering Executive with over 10 years of experience designing and deploying high-frequency, fault-tolerant consensus engines and multi-region cloud infrastructures. Expert in container orchestration systems, real-time reactive streaming pipelines, and microservices topologies. Proven record of cutting core platform operations workloads by 35% and mentoring multi-disciplinary engineering groups to deliver mission-critical software globally.'
    },
    experience: [
        {
            id: 'exp1',
            jobTitle: 'Principal Distributed Systems Platform Lead',
            company: 'CloudScale Technologies Inc.',
            location: 'San Francisco, CA',
            startDate: 'Jan 2020',
            endDate: 'Present',
            description: '<p>• Engineered a state-of-the-art geo-replicated transactional ledger backing 4.2M high-frequency active traders, utilizing atomic multicast and Raft consensus protocols to deliver sub-millisecond end-to-end write latencies.</p><p>• Led the comprehensive cloud migration of 12 legacy data silos onto a custom federated Kubernetes cluster environment, elevating SLA uptime parameters from 99.9% to a high-availability 99.995% benchmark.</p><p>• Spearheaded a rigorous cross-team technical mentorship circle that successfully upskilled 18 senior developers in advanced Rust concurrency paradigms, reducing memory leak occurrences across microservices in sandbox environments by 45%.</p><p>• Championed the design of a telemetry and observability pipeline processing 15B+ daily metric telemetry events, yielding real-time latency anomalies discovery within 3 seconds of triggers.</p>'
        },
        {
            id: 'exp2',
            jobTitle: 'Senior Infrastructure Software Architect',
            company: 'Innovate Network Labs',
            location: 'Palo Alto, CA',
            startDate: 'Jun 2015',
            endDate: 'Dec 2019',
            description: '<p>• Architected and developed of a high-throughput Apache Kafka streaming connector network in Scala, facilitating reliable integration of IoT sensory streams and optimizing operational memory footprint requirements by 30%.</p><p>• Directed a cross-functional squad of 8 developers during the clean rewrite of the core SaaS checkout platform using React and Go, resulting in a demonstrable 40% reduction in cart abandonment rates and the elimination of single-point-of-failure vulnerabilities.</p><p>• Authored comprehensive, industry-grade API integration specifications and security protocols, earning technical peer commendations and streamlining onboarding cycles for external cloud enterprise partners by 60%.</p>'
        }
    ],
    projects: [
        {
            id: 'proj1',
            name: 'Project Helios Consensus Engine',
            technologies: 'Rust, WebAssembly, gRPC, Protobuf',
            link: 'github.com/sterling-architectures/helios-core',
            startDate: 'May 2021',
            endDate: 'Nov 2022',
            description: '<p>Designed and built a light-speed, browser-compatible consensus engine that provides fault-tolerant state-machine synchronization in edge-computing contexts, maintaining active node synchronization with negligible network overhead.</p>'
        },
        {
            id: 'proj2',
            name: 'Aether Dynamic Routing Pipeline',
            technologies: 'Go, eBPF, Kubernetes CNI, Prometheus',
            link: 'github.com/sterling-architectures/aether-cni',
            startDate: 'Feb 2019',
            endDate: 'Oct 2019',
            description: '<p>Developed a custom Kubernetes Container Network Interface plugin leveraging eBPF maps to track and optimize traffic routing across large cluster nodes, safely reducing system packet processing latency by 18%.</p>'
        }
    ],
    education: [
        {
            id: 'edu1',
            school: 'University of California, Berkeley',
            degree: 'Doctor of Philosophy in Computer Science & Distributed Systems',
            location: 'Berkeley, CA',
            startDate: 'Sep 2010',
            endDate: 'May 2015',
            description: 'PhD Dissertation specializing in highly resilient Paxos/Raft consensus anomalies. Recipient of the Chancellor Distinguished Research Fellowship. Co-authored 5 papers in peer-reviewed ACM journals.'
        }
    ],
    skills: [
        'Distributed Ledger Consensus Protocols (Raft, Paxos)',
        'Containerization & Orchestration (Docker, Kubernetes, Helm)',
        'Systems Programming (Rust, Go, C++, Scala)',
        'Telemetry & Service Mesh (Prometheus, eBPF, Istio, Grafana)',
        'Asynchronous Communication Protocols (gRPC, WebSocket, TCP/IP)',
        'Cloud Environments & Networking (AWS Core, Terraform, VPC Routing)'
    ],
    certifications: [
        {
            id: 'cert1',
            name: 'AWS Certified Solutions Architect - Professional',
            number: 'AWS-SAP-88214',
            expiryDate: 'Dec 2026',
            description: 'Validated mastery in designing and deploying cloud-native distributed systems.'
        },
        {
            id: 'cert2',
            name: 'Certified Kubernetes Administrator (CKA)',
            number: 'CKA-99213421',
            expiryDate: 'Jun 2027',
            description: 'Demonstrated proficiency in configuring and troubleshooting complex enterprise Kubernetes environments.'
        }
    ],
    languages: [
        {
            id: 'lang1',
            language: 'English',
            proficiency: 'Native'
        },
        {
            id: 'lang2',
            language: 'German',
            proficiency: 'Professional Working'
        }
    ],
    awards: [
        {
            id: 'award1',
            title: 'Distinguished Systems Contributor Award',
            issuer: 'The Distributed Computing Consortium (DCC)',
            date: '2024',
            description: 'Honored for outstanding code contributions and open-source system packages representing robust safety algorithms.'
        }
    ],
    trainings: [
        {
            id: 'train1',
            course: 'Advanced Consensus & Ledger Cryptography Masterclass',
            institution: 'MIT Professional Education',
            date: '2022',
            description: 'Intense technical study focusing on zero-knowledge execution layers and state-transition safety proofs.'
        }
    ],
    publications: [
        {
            id: 'pub1',
            title: 'Mitigating Livelocks in Decentralized Optimistic Concurrency Systems',
            publisher: 'ACM Transactions on Computer Systems (TOCS)',
            date: '2019',
            link: 'dl.acm.org/doi/10.1145/example',
            description: 'Introduced a novel dynamic backoff algorithm using packet queues to stabilize busy clusters during execution spikes.'
        }
    ],
    volunteer: [
        {
            id: 'vol1',
            organization: 'Girls Who Code',
            role: 'Lead Mentor & Technical Advisory Panel Member',
            startDate: '2018',
            endDate: 'Present',
            location: 'San Francisco, CA',
            description: 'Instructed high school seniors on modern back-end technology concepts, algorithms, and microservice infrastructure development.'
        }
    ],
    custom: []
};
