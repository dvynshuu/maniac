/**
 * MANIAC Centralized Template Registry
 * Contains comprehensive block definitions, SEO metadata, usage guides, and FAQs
 * for high-intent organic search rankings.
 */

export const TEMPLATES = [
  {
    id: 'active-recall-srs',
    title: 'Active Recall & Spaced Repetition Study Hub',
    category: 'Learning & Exams',
    icon: '🧠',
    summary: 'Master complex subjects with spaced repetition flashcard blocks, recall prompts, and high-yield concept review queues.',
    metaDescription: 'Free Active Recall & Spaced Repetition workspace template for MANIAC. Built-in Leitner flashcard review, forgetting curve scheduling, and 0ms offline study.',
    tags: ['Active Recall', 'Spaced Repetition', 'Study Hub', 'Anki Alternative', 'Exams', 'Medical School'],
    difficulty: 'Intermediate',
    estimatedSetupMinutes: 3,
    blocks: [
      { type: 'heading1', content: 'Active Recall & Spaced Repetition Hub' },
      { type: 'callout', content: 'Tip: Test yourself using the toggles below before revealing answers. Rate your recall difficulty to optimize your retention interval.', properties: { icon: '⚡' } },
      { type: 'heading2', content: 'High-Yield Review Queue' },
      { type: 'toggle', content: 'Q: What is the primary difference between IndexedDB and LocalStorage in modern browsers?', properties: { details: 'IndexedDB is an asynchronous, transactional, indexed NoSQL database supporting large binary blobs and gigabytes of storage. LocalStorage is synchronous, blocking, and limited to ~5MB of string key-values.' } },
      { type: 'toggle', content: 'Q: How do Conflict-Free Replicated Data Types (CRDTs) guarantee convergence?', properties: { details: 'CRDTs mathematically ensure that concurrent edits can be merged in any arbitrary network order without requiring a central coordination server.' } },
      { type: 'toggle', content: 'Q: What cryptographic primitive provides both confidentiality and authentication?', properties: { details: 'Authenticated Encryption with Associated Data (AEAD), specifically AES-256-GCM, combines Galois counter mode with GMAC message authentication.' } },
      { type: 'heading2', content: 'Weekly Study Milestones' },
      { type: 'todo', content: 'Review Neuroscience & Memory Consolidation', properties: { checked: true } },
      { type: 'todo', content: 'Complete Chapter 4 Problem Set', properties: { checked: false } },
      { type: 'todo', content: 'Self-quiz on Cryptography primitives (AES-256-GCM)', properties: { checked: false } },
      { type: 'quote', content: 'Testing yourself is not just a measurement of what you know; it actively alters and strengthens your memory.' }
    ],
    features: [
      'Built-in Leitner Box spaced repetition practice algorithm',
      'Instant self-testing toggle blocks for active retrieval practice',
      'Milestone check-lists for structured revision cycles',
      '100% offline study without server latency or paywalls'
    ],
    usageGuide: [
      'Click "Clone into Workspace" to load this template into your local MANIAC database.',
      'Replace the high-yield questions with the core definitions and mechanisms of your current subject.',
      'During your study sessions, attempt to formulate the exact answer in your mind before toggling open the answer card.',
      'Mark items complete as you master each module, and let the local review queue handle repetition intervals.'
    ],
    faqs: [
      {
        q: 'How does Active Recall in MANIAC compare to Anki?',
        a: 'Anki forces you into isolated, disconnected cards. MANIAC embeds active recall directly into your hierarchical notes and databases, allowing you to retain context while practicing retrieval.'
      },
      {
        q: 'Can I study this template without an internet connection?',
        a: 'Yes. MANIAC is local-first. All questions, answers, and study streaks are saved in IndexedDB and work completely offline on airplanes, subways, or study halls.'
      }
    ]
  },
  {
    id: 'para-method-second-brain',
    title: 'PARA Method: Second Brain System',
    category: 'Productivity & PKM',
    icon: '🏛️',
    summary: 'Organize your entire digital life into Tiago Forte’s PARA framework: Projects, Areas, Resources, and Archives.',
    metaDescription: 'Free PARA Method Second Brain template for MANIAC. Organize Projects, Areas, Resources, and Archives with local-first speed and zero cloud tracking.',
    tags: ['PARA Method', 'Second Brain', 'Tiago Forte', 'PKM', 'Personal Knowledge Management', 'Organization'],
    difficulty: 'Beginner',
    estimatedSetupMinutes: 5,
    blocks: [
      { type: 'heading1', content: 'PARA Knowledge Architecture' },
      { type: 'callout', content: 'The PARA method organizes information by actionability rather than rigid subject taxonomy.', properties: { icon: '🎯' } },
      { type: 'heading2', content: '1. Active Projects (Definite Deadline)' },
      { type: 'bullet', content: '<strong>Project Apollo:</strong> Ship local-first encrypted workspace v2.0' },
      { type: 'bullet', content: '<strong>Personal Health:</strong> Complete half-marathon conditioning' },
      { type: 'heading2', content: '2. Areas of Responsibility (Continuous Standards)' },
      { type: 'bullet', content: 'System Architecture & Cryptographic Integrity' },
      { type: 'bullet', content: 'Personal Financial Independence & Capital Allocation' },
      { type: 'heading2', content: '3. Resources (Topics of Ongoing Interest)' },
      { type: 'bullet', content: 'Distributed Systems & CRDT Convergence Papers' },
      { type: 'bullet', content: 'Typography & Bespoke Digital Craft Principles' },
      { type: 'heading2', content: '4. Archives (Completed or Inactive)' },
      { type: 'bullet', content: '2025 Retrospective & System Log' }
    ],
    features: [
      'Four distinct structural tiers based on actionability',
      'Seamless drag-and-drop relocation between Projects and Archives',
      'Nested sub-page hierarchy for deep topic exploration',
      'Zero subscription fees and zero cloud data leaks'
    ],
    usageGuide: [
      'Add short-term goals with definite deliverables into the "Projects" section.',
      'List ongoing roles and responsibilities without end dates in "Areas".',
      'File reference guides, book notes, and learning materials under "Resources".',
      'Move completed projects or stale areas into "Archives" to maintain a decluttered workspace.'
    ],
    faqs: [
      {
        q: 'What is the PARA Method?',
        a: 'The PARA method is a universal organizational framework developed by Tiago Forte that structures all digital information into four categories: Projects, Areas of Responsibility, Resources, and Archives.'
      },
      {
        q: 'Why use MANIAC for a Second Brain instead of Notion?',
        a: 'Notion is slow and stores your personal life notes on third-party cloud servers. MANIAC boots in 0ms, keeps your entire second brain in your device IndexedDB with AES-256 encryption, and works 100% offline.'
      }
    ]
  },
  {
    id: 'engineering-roadmap',
    title: 'Engineering Sprint & Product Roadmap Tracker',
    category: 'Engineering & Dev',
    icon: '🚀',
    summary: 'Track milestones, epics, bug queues, and sprint tasks with relational databases and kanban status columns.',
    metaDescription: 'Free Engineering Sprint & Roadmap template for MANIAC. Manage technical backlogs, sprint tasks, and architectural decisions offline with zero latency.',
    tags: ['Engineering', 'Sprint Board', 'Roadmap', 'Kanban', 'Software Development', 'Agile'],
    difficulty: 'Intermediate',
    estimatedSetupMinutes: 4,
    blocks: [
      { type: 'heading1', content: 'Engineering Sprint Board' },
      { type: 'callout', content: 'Prioritize tasks based on leverage and user impact. Strive for zero-latency execution.', properties: { icon: '🛠️' } },
      { type: 'heading2', content: 'Sprint Objectives' },
      { type: 'todo', content: 'Implement client-side compressed snapshot sharing', properties: { checked: true } },
      { type: 'todo', content: 'Add offline pre-rendered semantic HTML for crawlers', properties: { checked: true } },
      { type: 'todo', content: 'Refactor sort key compaction in Web Worker', properties: { checked: false } },
      { type: 'heading2', content: 'Architecture Principles' },
      { type: 'bullet', content: '<strong>Local-First:</strong> All writes touch IndexedDB before any network negotiation.' },
      { type: 'bullet', content: '<strong>Privacy First:</strong> Plaintext data never leaves the client unencrypted.' },
      { type: 'bullet', content: '<strong>Zero Lag:</strong> Keep animation loops at locked 60fps with CSS hardware acceleration.' }
    ],
    features: [
      'Sprint milestone checklists and technical deliverables',
      'Architectural principles callout for team alignment',
      'Relational database views for bug tracking and sprint planning',
      'Offline-first zero server latency for hyper-fast keyboard navigation'
    ],
    usageGuide: [
      'Define your sprint focus and key technical deliverables for the iteration.',
      'Categorize tasks by urgency and architectural leverage.',
      'Track progress daily using interactive checkbox toggles.',
      'Maintain code snippets and RFC links right within the sprint notes.'
    ],
    faqs: [
      {
        q: 'Can software engineers use MANIAC for proprietary code notes?',
        a: 'Yes. MANIAC stores all data locally in IndexedDB and offers AES-256-GCM client-side encryption. Proprietary code and architectural designs never touch an external cloud.'
      },
      {
        q: 'Does it support Markdown code blocks?',
        a: 'Yes. MANIAC features syntax-highlighted code blocks with multi-language support (JavaScript, Python, Rust, Go, SQL, Bash, and more).'
      }
    ]
  },
  {
    id: 'daily-performance-tracker',
    title: 'Daily Habit & Metric Mastery Tracker',
    category: 'Personal Growth',
    icon: '⚡',
    summary: 'Build indestructible habits, log daily quantitative metrics, and maintain personal performance streaks.',
    metaDescription: 'Free Daily Habit & Performance Tracker template for MANIAC. Track daily rituals, deep work sprints, and habit streaks with local-first privacy.',
    tags: ['Habit Tracker', 'Daily Routine', 'Deep Work', 'Personal Growth', 'Productivity', 'Self Mastery'],
    difficulty: 'Beginner',
    estimatedSetupMinutes: 2,
    blocks: [
      { type: 'heading1', content: 'Daily Performance & Habit Log' },
      { type: 'callout', content: 'Consistency compounds exponentially. Win the morning, win the day.', properties: { icon: '🔥' } },
      { type: 'heading2', content: 'Non-Negotiable Morning Routine' },
      { type: 'todo', content: 'Hydration: 500ml water + electrolytes', properties: { checked: true } },
      { type: 'todo', content: '20 minutes deep reading / active recall practice', properties: { checked: true } },
      { type: 'todo', content: '30 minutes high-intensity physical movement', properties: { checked: false } },
      { type: 'heading2', content: 'Deep Work Sprint (90 Minutes)' },
      { type: 'todo', content: 'Execute top-priority engineering deliverable with zero distractions', properties: { checked: false } },
      { type: 'heading2', content: 'Evening Reflection & Shutdown' },
      { type: 'todo', content: 'Log quantitative metrics & plan tomorrow’s 3 primary objectives', properties: { checked: false } }
    ],
    features: [
      'Structured morning, deep work, and shutdown checklists',
      'Streak preservation without annoying notifications or ads',
      'Encrypted personal reflection log for total psychological safety',
      'Instant keyboard shortcuts to check off daily milestones'
    ],
    usageGuide: [
      'Review your morning checklist first thing upon waking.',
      'Check off your 90-minute deep work sprint when completed.',
      'Reflect on your daily performance before evening shutdown.',
      'Duplicate the page each day or log into a relational habit tracker database.'
    ],
    faqs: [
      {
        q: 'Why track habits in MANIAC instead of a mobile app?',
        a: 'Most mobile habit apps are filled with subscription paywalls, ads, and telemetry tracking. MANIAC is 100% private, free, and unified with your knowledge workspace.'
      },
      {
        q: 'Will my habit streak data be lost if I clear browser cache?',
        a: 'IndexedDB is persistent. Furthermore, MANIAC allows instant 1-click JSON backup export to keep your habit history permanently safe.'
      }
    ]
  },
  {
    id: 'student-study-hub',
    title: 'Student Semester Hub & Exam Revision Tracker',
    category: 'Learning & Exams',
    icon: '🎓',
    summary: 'Manage course syllabi, lecture summaries, assignment deadlines, and exam revision schedules in one unified student cockpit.',
    metaDescription: 'Free Student Semester & Exam Hub template for MANIAC. Organize college courses, assignment deadlines, and exam prep with local-first active recall.',
    tags: ['Student Hub', 'College', 'Exam Revision', 'University', 'Syllabus', 'Study Schedule'],
    difficulty: 'Beginner',
    estimatedSetupMinutes: 4,
    blocks: [
      { type: 'heading1', content: 'Semester Command Center' },
      { type: 'callout', content: 'Organize coursework by semester modules and tie lecture notes directly into active recall review queues.', properties: { icon: '📚' } },
      { type: 'heading2', content: 'Active Courses & Syllabi' },
      { type: 'bullet', content: '<strong>CS 301:</strong> Distributed Systems & Network Protocols (Mon/Wed 10:00 AM)' },
      { type: 'bullet', content: '<strong>BIO 210:</strong> Molecular Biology & Cellular Signaling (Tue/Thu 1:30 PM)' },
      { type: 'bullet', content: '<strong>MATH 240:</strong> Linear Algebra & Multivariable Calculus (Fri 9:00 AM)' },
      { type: 'heading2', content: 'Upcoming Assignment Deadlines' },
      { type: 'todo', content: 'Draft Distributed Consensus Lab Report', properties: { checked: true } },
      { type: 'todo', content: 'Review Cellular Respiration Active Recall Deck', properties: { checked: false } },
      { type: 'todo', content: 'Complete Eigenvectors & Matrix Transformation Problem Set', properties: { checked: false } },
      { type: 'heading2', content: 'Exam Revision Milestones' },
      { type: 'todo', content: 'Complete past papers 2023-2025 under timed exam conditions', properties: { checked: false } },
      { type: 'quote', content: 'Long-term retention is achieved not by re-reading notes, but by active retrieval and spaced practice.' }
    ],
    features: [
      'Multi-course syllabus and lecture schedule architecture',
      'Assignment deadline prioritization checklist',
      'Direct integration with MANIAC active recall review engine',
      'Fast offline access during lectures with spotty campus Wi-Fi'
    ],
    usageGuide: [
      'Fill in your active courses, professor contacts, and lecture times.',
      'Log assignment due dates and upcoming exam periods.',
      'Link your lecture notes directly into the course bullets.',
      'Run active recall sessions weekly to eliminate cramming.'
    ],
    faqs: [
      {
        q: 'Is MANIAC free for students?',
        a: 'Yes. MANIAC is completely free for everyone with no student verification needed, no cloud limits, and zero paywalls.'
      },
      {
        q: 'Can I take lecture notes offline without campus Wi-Fi?',
        a: 'Yes. MANIAC functions 100% offline in your browser. You can take notes throughout the entire day without an internet connection.'
      }
    ]
  },
  {
    id: 'project-management-board',
    title: 'Client Deliverables & Project Kanban Workspace',
    category: 'Productivity & PKM',
    icon: '📊',
    summary: 'Deliver client projects on time with structured stage gates, scope checklists, asset links, and status boards.',
    metaDescription: 'Free Client & Project Management Kanban template for MANIAC. Track deliverables, client communications, and milestones with zero latency.',
    tags: ['Project Management', 'Client Work', 'Kanban', 'Freelance', 'Deliverables', 'Agile'],
    difficulty: 'Intermediate',
    estimatedSetupMinutes: 5,
    blocks: [
      { type: 'heading1', content: 'Client Project Master Workspace' },
      { type: 'callout', content: 'Maintain clear scope boundaries, defined milestones, and rapid feedback loops.', properties: { icon: '🎯' } },
      { type: 'heading2', content: 'Active Phase Deliverables' },
      { type: 'todo', content: 'Finalize UX wireframes and interactive prototype', properties: { checked: true } },
      { type: 'todo', content: 'Implement core database schema & authentication layer', properties: { checked: true } },
      { type: 'todo', content: 'Conduct user acceptance testing and security review', properties: { checked: false } },
      { type: 'todo', content: 'Deploy production release and transfer sovereign assets', properties: { checked: false } },
      { type: 'heading2', content: 'Key Project Specifications' },
      { type: 'bullet', content: '<strong>Tech Stack:</strong> Local-first React, IndexedDB, Web Crypto AES-256' },
      { type: 'bullet', content: '<strong>Client SLA:</strong> 24-hour turnaround on critical revisions' },
      { type: 'bullet', content: '<strong>Repository:</strong> Sovereign git repository with automated CI/CD' }
    ],
    features: [
      'Milestone stage gate checklist for frictionless handoffs',
      'Project specification and technical requirement bullets',
      'Table, Kanban, and Calendar views for flexible tracking',
      'Client confidentiality guaranteed by local-first storage'
    ],
    usageGuide: [
      'Enter the project name, client details, and contract deliverable dates.',
      'Break large epics down into manageable checkbox tasks.',
      'Record meeting action items and technical constraints directly in the page.',
      'Check off milestones as deliverables are approved.'
    ],
    faqs: [
      {
        q: 'Can I use this for confidential client NDAs?',
        a: 'Yes. Because MANIAC stores all data locally in browser IndexedDB with optional AES-256 encryption, confidential client data is never transmitted to any third-party server.'
      },
      {
        q: 'Can I share a progress snapshot with my client?',
        a: 'Yes! MANIAC features instant URL-encoded snapshot sharing. You can generate a share link that allows your client to view the board instantly without registering.'
      }
    ]
  },
  {
    id: 'book-reading-journal',
    title: 'Smart Literature Notes & Book Reading Journal',
    category: 'Personal Growth',
    icon: '📖',
    summary: 'Transform reading into permanent knowledge with progressive summarization, key thesis extractions, and bi-directional concepts.',
    metaDescription: 'Free Book Reading Journal & Literature Notes template for MANIAC. Capture book summaries, smart quotes, and interconnected concepts in your second brain.',
    tags: ['Book Tracker', 'Reading Journal', 'Literature Notes', 'Zettelkasten', 'Knowledge Base', 'Book Summaries'],
    difficulty: 'Beginner',
    estimatedSetupMinutes: 3,
    blocks: [
      { type: 'heading1', content: 'Smart Reading Journal & Concept Vault' },
      { type: 'callout', content: 'Read actively. Extract atomic thoughts and synthesize concepts in your own words rather than passive highlighting.', properties: { icon: '💡' } },
      { type: 'heading2', content: 'Current Deep Read' },
      { type: 'bullet', content: '<strong>Title:</strong> The Design of Everyday Things — Don Norman' },
      { type: 'bullet', content: '<strong>Core Thesis:</strong> Good design bridges the gulf of execution and the gulf of evaluation through affordances and signifiers.' },
      { type: 'heading2', content: 'Key Atomic Insights' },
      { type: 'toggle', content: 'Insight: Affordances vs Signifiers', properties: { details: 'An affordance is the actual relationship between the properties of an object and the capabilities of the agent. A signifier is any perceivable cue that indicates what actions are possible.' } },
      { type: 'toggle', content: 'Insight: Feedback & System Visibility', properties: { details: 'Immediate, appropriate feedback prevents uncertainty and eliminates user frustration.' } },
      { type: 'heading2', content: 'Annual Reading Queue' },
      { type: 'todo', content: 'Make It Stick: The Science of Successful Learning (Completed)', properties: { checked: true } },
      { type: 'todo', content: 'The Design of Everyday Things (In Progress)', properties: { checked: false } },
      { type: 'todo', content: 'Gödel, Escher, Bach: An Eternal Golden Braid (Queued)', properties: { checked: false } }
    ],
    features: [
      'Progressive summarization structure for maximum insight retention',
      'Toggle blocks for active retrieval of book thesis and core principles',
      'Annual reading goal tracker with completed and queued states',
      'Connects with MANIAC 2D Knowledge Graph via bidirectional backlinks'
    ],
    usageGuide: [
      'Create a entry for each book you begin reading.',
      'Record bibliographic metadata and the central thesis.',
      'Synthesize 3-5 atomic insights into toggle cards.',
      'Link concepts to other relevant pages in your workspace.'
    ],
    faqs: [
      {
        q: 'How does this integrate with the Knowledge Graph?',
        a: 'You can link any concept to another page using @ or [[ notation, creating a web of interconnected ideas visible in the MANIAC 2D Force Graph.'
      },
      {
        q: 'Is my reading journal private?',
        a: 'Completely. Your personal reflections, critiques, and book notes are stored strictly on your local device.'
      }
    ]
  },
  {
    id: 'personal-finance-ledger',
    title: 'Private Personal Finance & Net Worth Ledger',
    category: 'Personal Growth',
    icon: '💰',
    summary: 'Track monthly cash flow, capital allocations, asset valuations, and financial milestones with total offline confidentiality.',
    metaDescription: 'Free Personal Finance & Net Worth Tracker template for MANIAC. Track budget, savings rate, and investments with 100% offline privacy and AES-256 security.',
    tags: ['Personal Finance', 'Net Worth', 'Budget Tracker', 'Investments', 'Offline Ledger', 'Privacy'],
    difficulty: 'Intermediate',
    estimatedSetupMinutes: 5,
    blocks: [
      { type: 'heading1', content: 'Personal Financial Independence Cockpit' },
      { type: 'callout', content: 'Confidentiality Warning: This ledger contains personal financial figures. MANIAC stores this strictly on your device with optional AES-256-GCM vault encryption.', properties: { icon: '🔒' } },
      { type: 'heading2', content: 'Monthly Allocation Targets' },
      { type: 'todo', content: 'Allocate 50% net income to fixed lifestyle & living essentials', properties: { checked: true } },
      { type: 'todo', content: 'Direct 30% to automated index fund & sovereign retirement investments', properties: { checked: true } },
      { type: 'todo', content: 'Reserve 20% for guilt-free discretionary spending & personal growth', properties: { checked: false } },
      { type: 'heading2', content: 'Asset & Capital Distribution' },
      { type: 'bullet', content: '<strong>Cash / High-Yield Reserves:</strong> 6 months of emergency baseline expenses' },
      { type: 'bullet', content: '<strong>Equities / Low-Cost Index Funds:</strong> Global broad-market allocation (VT / VTI)' },
      { type: 'bullet', content: '<strong>Sovereign Digital Assets:</strong> Long-term cold storage holdings' },
      { type: 'heading2', content: 'Quarterly Financial Health Checklist' },
      { type: 'todo', content: 'Audit recurring subscriptions and cancel unused services', properties: { checked: false } },
      { type: 'todo', content: 'Rebalance portfolio back to target percentage allocations', properties: { checked: false } }
    ],
    features: [
      'Zero server exposure — your net worth and banking notes never touch the cloud',
      'Client-side AES-256-GCM hardware encryption support',
      'Structured 50/30/20 monthly allocation framework',
      'Portfolio rebalancing and quarterly audit checklist'
    ],
    usageGuide: [
      'Set your emergency fund and monthly baseline expenses.',
      'Record your asset allocation percentages.',
      'Track quarterly financial checklists to maintain fiscal discipline.',
      'Lock your vault using MANIAC client-side AES-256 encryption for absolute peace of mind.'
    ],
    faqs: [
      {
        q: 'Why track personal finances in MANIAC instead of cloud apps?',
        a: 'Cloud financial tools frequently suffer data breaches or sell aggregated user spending data to advertisers. MANIAC keeps your financial ledger strictly inside your device IndexedDB.'
      },
      {
        q: 'Can anyone else see my net worth numbers?',
        a: 'Never. No telemetry, no cloud database, no tracking cookies. You have 100% data sovereignty.'
      }
    ]
  }
];

export const TEMPLATE_CATEGORIES = [
  'All',
  'Learning & Exams',
  'Productivity & PKM',
  'Engineering & Dev',
  'Personal Growth'
];

export function getTemplateById(id) {
  return TEMPLATES.find(t => t.id === id);
}
