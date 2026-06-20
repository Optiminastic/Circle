/**
 * Question banks for the online recruitment tests.
 *
 * IQ test: 50 logical-reasoning MCQs, 4 marks each (max 200). Score = correct
 * × 4; qualify at >= 100 (i.e. at least 25/50 correct). Difficulty is tiered —
 * IQ01–IQ10 easy, IQ11–IQ40 medium–hard, IQ41–IQ50 difficult.
 *
 * Assessments: one bank per department, 60-minute limit, pass >= 60%.
 * The bank is selected by the candidate's department (General as fallback).
 */

export interface TestQuestion {
  id: string;
  q: string;
  options: [string, string, string, string];
  /** Index (0-3) of the correct option. */
  answer: number;
}

export const IQ_DURATION_MIN = 30;
export const ASSESSMENT_DURATION_MIN = 60;
/** Days the candidate gets to submit the take-home assignment. */
export const ASSIGNMENT_DEADLINE_DAYS = 3;
/** Marks the assignment is graded out of; pass at 60%. */
export const ASSIGNMENT_MAX_MARKS = 100;
export const ASSIGNMENT_PASS_MARKS = 60;

/** Default take-home brief, tailored to the candidate's role/department. */
export function assignmentBriefFor(position: string, department: string): string {
  const role = position || department || 'the role';
  return [
    `This is the take-home assignment for ${role}.`,
    '',
    'What to do:',
    `• Complete a small, practical task that reflects real work for ${role}.`,
    '• Keep it focused — quality over quantity. Document any assumptions you make.',
    '• Package your work (code, document, or design) into a single file (PDF/ZIP/DOC).',
    '',
    'How you will be assessed: correctness, problem understanding, practical approach,',
    'quality, and clarity of communication.',
    '',
    'Upload your finished work below before the deadline.',
  ].join('\n');
}
export const IQ_MARKS_PER_QUESTION = 4;
export const IQ_TOTAL_MARKS = 200; // 50 questions × 4 marks
export const IQ_PASS_SCORE = 100; // out of 200
export const ASSESSMENT_PASS_PERCENT = 35; // candidate passes at 35% correct or more

/** Marks-based IQ score: 4 per correct answer (50 questions → 0–200). */
export const iqScoreFromCorrect = (correct: number, _total: number): number =>
  correct * IQ_MARKS_PER_QUESTION;

export const IQ_QUESTIONS: TestQuestion[] = [
  // ── Easy (IQ01–IQ10): warm-up — simple series & direct analogies ──────────
  {
    id: 'IQ01',
    q: 'What comes next in the series: 2, 4, 6, 8, 10, ... ?',
    options: ['11', '12', '14', '16'],
    answer: 1, // +2
  },
  {
    id: 'IQ02',
    q: 'Book is to Reading as Fork is to:',
    options: ['Drawing', 'Eating', 'Writing', 'Stirring'],
    answer: 1,
  },
  {
    id: 'IQ03',
    q: 'If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are definitely:',
    options: ['Razzies only', 'Lazzies', 'Neither', 'Cannot be determined'],
    answer: 1,
  },
  {
    id: 'IQ04',
    q: 'Which number is the odd one out: 3, 5, 11, 14, 17?',
    options: ['3', '5', '14', '17'],
    answer: 2, // only even number
  },
  {
    id: 'IQ05',
    q: 'What comes next in the series: 5, 10, 15, 20, ... ?',
    options: ['22', '24', '25', '30'],
    answer: 2, // +5
  },
  {
    id: 'IQ06',
    q: 'Complete the analogy — Flock : Sheep :: Swarm : ?',
    options: ['Cows', 'Bees', 'Wolves', 'Fish'],
    answer: 1,
  },
  {
    id: 'IQ07',
    q: 'What comes next: A, C, E, G, ... ?',
    options: ['H', 'I', 'J', 'K'],
    answer: 1, // every second letter
  },
  {
    id: 'IQ08',
    q: 'Which day comes immediately after Sunday?',
    options: ['Saturday', 'Monday', 'Friday', 'Tuesday'],
    answer: 1,
  },
  {
    id: 'IQ09',
    q: 'What comes next in the series: 1, 1, 2, 3, 5, 8, ... ?',
    options: ['11', '12', '13', '14'],
    answer: 2, // Fibonacci
  },
  {
    id: 'IQ10',
    q: 'A is taller than B. C is shorter than B. Who is the shortest?',
    options: ['A', 'B', 'C', 'Cannot be determined'],
    answer: 2,
  },

  // ── Medium–Hard (IQ11–IQ40): multi-step reasoning & trickier patterns ─────
  {
    id: 'IQ11',
    q: 'A clock shows 3:15. What is the angle between the hour and minute hands?',
    options: ['0°', '7.5°', '15°', '30°'],
    answer: 1,
  },
  {
    id: 'IQ12',
    q: 'What comes next in the series: 1, 4, 9, 16, 25, ... ?',
    options: ['30', '35', '36', '49'],
    answer: 2, // perfect squares
  },
  {
    id: 'IQ13',
    q: 'If 5 machines make 5 widgets in 5 minutes, how long do 100 machines take to make 100 widgets?',
    options: ['100 minutes', '50 minutes', '20 minutes', '5 minutes'],
    answer: 3,
  },
  {
    id: 'IQ14',
    q: 'If CAT = 24 and DOG = 26, what does PIG equal? (A=1 … Z=26, sum of letters)',
    options: ['30', '32', '34', '36'],
    answer: 1, // 16+9+7=32
  },
  {
    id: 'IQ15',
    q: 'What comes next: 81, 27, 9, 3, ... ?',
    options: ['0', '1', '2', '1.5'],
    answer: 1, // ÷3
  },
  {
    id: 'IQ16',
    q: 'If today is Friday, what day will it be 100 days from now?',
    options: ['Saturday', 'Sunday', 'Monday', 'Tuesday'],
    answer: 1, // 100 mod 7 = 2 → Sunday
  },
  {
    id: 'IQ17',
    q: 'What comes next: 5, 11, 23, 47, ... ?',
    options: ['71', '83', '95', '99'],
    answer: 2, // ×2 + 1
  },
  {
    id: 'IQ18',
    q: 'A person walks 5 km north, then 12 km east. How far are they from the start?',
    options: ['7 km', '13 km', '17 km', '60 km'],
    answer: 1, // 5-12-13 right triangle
  },
  {
    id: 'IQ19',
    q: 'What comes next in the series: 2, 6, 12, 20, 30, ... ?',
    options: ['36', '40', '42', '44'],
    answer: 2, // n(n+1): 42
  },
  {
    id: 'IQ20',
    q: 'Evaluate: 144 ÷ 12 + 3 × 2',
    options: ['18', '24', '30', '36'],
    answer: 0, // 12 + 6
  },
  {
    id: 'IQ21',
    q: 'Which number should replace the question mark: 7, 14, 28, 56, ... ?',
    options: ['84', '98', '112', '120'],
    answer: 2, // ×2
  },
  {
    id: 'IQ22',
    q: 'What comes next: 100, 96, 88, 76, 60, ... ?',
    options: ['40', '44', '48', '52'],
    answer: 0, // differences -4,-8,-12,-16,-20
  },
  {
    id: 'IQ23',
    q: 'Which number is the odd one out: 4, 8, 16, 24, 32?',
    options: ['8', '16', '24', '32'],
    answer: 2, // not a power of 2
  },
  {
    id: 'IQ24',
    q: 'If 3x = 12, then 5x = ?',
    options: ['15', '18', '20', '24'],
    answer: 2, // x=4
  },
  {
    id: 'IQ25',
    q: 'What comes next in the series: 1, 2, 6, 24, 120, ... ?',
    options: ['240', '360', '600', '720'],
    answer: 3, // ×2, ×3, ×4, ×5, ×6
  },
  {
    id: 'IQ26',
    q: 'What comes next in the series: Z, X, V, T, ... ?',
    options: ['S', 'R', 'Q', 'U'],
    answer: 1, // every second letter backwards
  },
  {
    id: 'IQ27',
    q: 'A bat and a ball cost ₹110 in total. The bat costs ₹100 more than the ball. How much is the ball?',
    options: ['₹5', '₹10', '₹15', '₹100'],
    answer: 0,
  },
  {
    id: 'IQ28',
    q: 'How many triangles are in a triangle divided by its three medians?',
    options: ['4', '6', '12', '16'],
    answer: 3,
  },
  {
    id: 'IQ29',
    q: 'Tuesday is two days after the day before yesterday. What day is it today?',
    options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    answer: 1, // (today−2)+2 = today = Tuesday
  },
  {
    id: 'IQ30',
    q: 'What comes next in the series: 3, 9, 27, 81, ... ?',
    options: ['162', '216', '243', '324'],
    answer: 2, // ×3
  },
  {
    id: 'IQ31',
    q: 'Pen is to Writer as Brush is to:',
    options: ['Sculptor', 'Painter', 'Carpenter', 'Singer'],
    answer: 1,
  },
  {
    id: 'IQ32',
    q: 'What comes next: 2, 3, 5, 7, 11, 13, ... ?',
    options: ['15', '16', '17', '19'],
    answer: 2, // primes
  },
  {
    id: 'IQ33',
    q: 'If you rearrange the letters "DIANI", you get the name of a(n):',
    options: ['City', 'River', 'Country', 'Mountain'],
    answer: 2, // INDIA
  },
  {
    id: 'IQ34',
    q: 'Which number is the odd one out: 121, 144, 169, 200?',
    options: ['121', '144', '169', '200'],
    answer: 3, // not a perfect square
  },
  {
    id: 'IQ35',
    q: 'What comes next in the series: 81, 64, 49, 36, ... ?',
    options: ['16', '25', '30', '32'],
    answer: 1, // 9²,8²,7²,6²,5²
  },
  {
    id: 'IQ36',
    q: 'A cube has how many edges?',
    options: ['6', '8', '10', '12'],
    answer: 3,
  },
  {
    id: 'IQ37',
    q: "If A=1, B=2, C=3 … what is the total value of the word 'CAB'?",
    options: ['5', '6', '7', '8'],
    answer: 1, // 3+1+2
  },
  {
    id: 'IQ38',
    q: "Pointing to a photo, a man says: 'She is the daughter of my grandfather's only son.' Who is she to him?",
    options: ['His mother', 'His sister', 'His daughter', 'His cousin'],
    answer: 1, // grandfather's only son = his father → father's daughter = sister
  },
  {
    id: 'IQ39',
    q: 'What comes next in the series: 1, 2, 4, 7, 11, 16, ... ?',
    options: ['20', '21', '22', '23'],
    answer: 2, // differences +1,+2,+3,+4,+5
  },
  {
    id: 'IQ40',
    q: 'Ocean is to Water as Desert is to:',
    options: ['Heat', 'Sand', 'Camel', 'Dry'],
    answer: 1,
  },

  // ── Difficult (IQ41–IQ50): coding, probability & advanced patterns ────────
  {
    id: 'IQ41',
    q: 'What comes next in the series: 2, 12, 36, 80, 150, ... ?',
    options: ['200', '220', '252', '300'],
    answer: 2, // n²(n+1): 1·2, 4·3, 9·4, 16·5, 25·6, 36·7 = 252
  },
  {
    id: 'IQ42',
    q: 'In a code, "MOUSE" is written as "PRXVH". How is "SHIFT" written?',
    options: ['VKLIW', 'VLKIW', 'UKLIW', 'VKMIW'],
    answer: 0, // each letter shifted +3
  },
  {
    id: 'IQ43',
    q: 'If some Argons are Bytes, and all Bytes are Crons, which statement is necessarily true?',
    options: [
      'All Argons are Crons',
      'Some Argons are Crons',
      'No Argons are Crons',
      'All Crons are Argons',
    ],
    answer: 1,
  },
  {
    id: 'IQ44',
    q: 'What comes next in the series: 4, 9, 25, 49, 121, 169, ... ?',
    options: ['225', '256', '289', '361'],
    answer: 2, // squares of primes: 2²,3²,5²,7²,11²,13²,17²=289
  },
  {
    id: 'IQ45',
    q: 'What comes next in the "look-and-say" series: 1, 11, 21, 1211, 111221, ... ?',
    options: ['112213', '312211', '311221', '13112221'],
    answer: 1, // 111221 → "three 1s, two 2s, one 1" → 312211
  },
  {
    id: 'IQ46',
    q: 'A bag has 3 red and 2 blue balls. Two are drawn without replacement. What is the probability both are red?',
    options: ['3/10', '2/5', '9/25', '1/2'],
    answer: 0, // 3/5 × 2/4 = 6/20 = 3/10
  },
  {
    id: 'IQ47',
    q: 'What comes next in the series: 5, 7, 12, 19, 31, 50, ... ?',
    options: ['68', '75', '81', '100'],
    answer: 2, // each term = sum of previous two
  },
  {
    id: 'IQ48',
    q: 'Which 3-digit number equals the sum of the cubes of its own digits?',
    options: ['125', '153', '248', '512'],
    answer: 1, // 1³+5³+3³ = 1+125+27 = 153
  },
  {
    id: 'IQ49',
    q: 'A can finish a job in 12 days and B in 18 days. Working together, how long do they take?',
    options: ['7.2 days', '6 days', '15 days', '30 days'],
    answer: 0, // 1/12 + 1/18 = 5/36 → 36/5 = 7.2
  },
  {
    id: 'IQ50',
    q: 'A snail climbs a 10 m well, going up 3 m each day and slipping 2 m each night. How many days to get out?',
    options: ['8 days', '9 days', '10 days', '11 days'],
    answer: 0, // reaches 7 m at start of day 8, then climbs 3 m → out
  },
];

/** Role-specific assessment banks, keyed by department. */
export const ASSESSMENT_BANKS: Record<string, TestQuestion[]> = {
  Engineering: [
    {
      id: 'EN01',
      q: 'What is the time complexity of binary search on a sorted array of n elements?',
      options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
      answer: 1,
    },
    {
      id: 'EN02',
      q: 'Which HTTP status code means "resource created successfully"?',
      options: ['200', '201', '204', '301'],
      answer: 1,
    },
    {
      id: 'EN03',
      q: 'In Git, which command combines fetching remote changes and merging them?',
      options: ['git push', 'git clone', 'git pull', 'git rebase'],
      answer: 2,
    },
    {
      id: 'EN04',
      q: 'Which data structure uses FIFO (first in, first out) ordering?',
      options: ['Stack', 'Queue', 'Tree', 'Hash map'],
      answer: 1,
    },
    {
      id: 'EN05',
      q: 'What does an SQL LEFT JOIN return?',
      options: [
        'Only rows that match in both tables',
        'All rows from the left table plus matches from the right',
        'All rows from the right table plus matches from the left',
        'The cartesian product of both tables',
      ],
      answer: 1,
    },
    {
      id: 'EN06',
      q: 'Which of these is NOT a principle of SOLID?',
      options: [
        'Single Responsibility',
        'Open/Closed',
        'Dependency Inversion',
        'Rapid Iteration',
      ],
      answer: 3,
    },
    {
      id: 'EN07',
      q: 'An index on a database column primarily speeds up:',
      options: ['Inserts', 'Reads/lookups', 'Deletes', 'Schema migrations'],
      answer: 1,
    },
    {
      id: 'EN08',
      q: 'What does idempotent mean for an API endpoint?',
      options: [
        'It requires authentication',
        'Calling it multiple times has the same effect as calling it once',
        'It responds in under 100ms',
        'It can only be called once',
      ],
      answer: 1,
    },
    {
      id: 'EN09',
      q: 'Which protocol underpins HTTPS encryption?',
      options: ['SSH', 'TLS', 'FTP', 'SMTP'],
      answer: 1,
    },
    {
      id: 'EN10',
      q: 'A race condition occurs when:',
      options: [
        'Code runs slower than expected',
        'Two processes access shared state concurrently with unpredictable ordering',
        'A loop never terminates',
        'Memory is leaked over time',
      ],
      answer: 1,
    },
  ],
  Product: [
    {
      id: 'PR01',
      q: 'An MVP (Minimum Viable Product) is primarily for:',
      options: [
        'Maximizing initial revenue',
        'Learning from real users with the least effort',
        'Impressing investors',
        'Replacing user research',
      ],
      answer: 1,
    },
    {
      id: 'PR02',
      q: 'Which metric best measures user retention?',
      options: [
        'Total downloads',
        'Day-30 returning-user rate',
        'Page views per session',
        'Net Promoter Score',
      ],
      answer: 1,
    },
    {
      id: 'PR03',
      q: 'In RICE prioritization, the letters stand for:',
      options: [
        'Reach, Impact, Confidence, Effort',
        'Revenue, Innovation, Cost, Efficiency',
        'Research, Ideate, Create, Evaluate',
        'Risk, Impact, Customers, Engineering',
      ],
      answer: 0,
    },
    {
      id: 'PR04',
      q: 'An A/B test should be stopped when:',
      options: [
        'One variant looks better after a day',
        'The predetermined sample size / significance threshold is reached',
        'Stakeholders ask for results',
        'Traffic drops',
      ],
      answer: 1,
    },
    {
      id: 'PR05',
      q: 'A user story is best written as:',
      options: [
        'A technical spec',
        '"As a [user], I want [goal] so that [benefit]"',
        'A list of UI screens',
        'A Gantt chart entry',
      ],
      answer: 1,
    },
    {
      id: 'PR06',
      q: 'Churn rate measures:',
      options: [
        'New users per month',
        'The percentage of customers who stop using the product',
        'Revenue growth rate',
        'Feature adoption speed',
      ],
      answer: 1,
    },
    {
      id: 'PR07',
      q: 'The North Star metric of a product should:',
      options: [
        'Be revenue, always',
        'Capture the core value users get from the product',
        'Change every sprint',
        'Be set by engineering',
      ],
      answer: 1,
    },
    {
      id: 'PR08',
      q: 'Which is a leading (not lagging) indicator for a subscription product?',
      options: ['Annual revenue', 'Weekly active usage of the core feature', 'Churned accounts last quarter', 'Total lifetime signups'],
      answer: 1,
    },
    {
      id: 'PR09',
      q: 'Jobs-to-be-Done framework focuses on:',
      options: [
        'User demographics',
        'The progress a user is trying to make in a circumstance',
        'Competitor feature lists',
        'Internal OKRs',
      ],
      answer: 1,
    },
    {
      id: 'PR10',
      q: 'When usage data and user interviews conflict, the best first step is to:',
      options: [
        'Trust the data, always',
        'Trust the interviews, always',
        'Dig into segmentation/instrumentation to reconcile the two',
        'Run the feature anyway',
      ],
      answer: 2,
    },
  ],
  Design: [
    {
      id: 'DS01',
      q: 'Which Gestalt principle explains why nearby elements are perceived as grouped?',
      options: ['Similarity', 'Proximity', 'Closure', 'Continuity'],
      answer: 1,
    },
    {
      id: 'DS02',
      q: 'The minimum recommended contrast ratio for normal body text (WCAG AA) is:',
      options: ['2:1', '3:1', '4.5:1', '7:1'],
      answer: 2,
    },
    {
      id: 'DS03',
      q: "Fitts's law states that the time to acquire a target depends on:",
      options: [
        'Color and font of the target',
        'Distance to and size of the target',
        'Number of pixels on screen',
        'User age',
      ],
      answer: 1,
    },
    {
      id: 'DS04',
      q: 'A design system primarily provides:',
      options: [
        'Marketing assets',
        'Reusable components and shared standards across products',
        'Wireframes for every screen',
        'A replacement for user testing',
      ],
      answer: 1,
    },
    {
      id: 'DS05',
      q: 'Which fidelity is most appropriate for early concept validation?',
      options: ['Pixel-perfect mockups', 'Low-fidelity wireframes', 'Production code', 'Motion prototypes'],
      answer: 1,
    },
    {
      id: 'DS06',
      q: 'Serif fonts are generally characterized by:',
      options: [
        'Uniform stroke width',
        'Small finishing strokes at the ends of letters',
        'Being unsuitable for print',
        'Always being decorative',
      ],
      answer: 1,
    },
    {
      id: 'DS07',
      q: 'In usability testing, 5 users typically uncover roughly what share of usability problems?',
      options: ['~10%', '~30%', '~80%', '100%'],
      answer: 2,
    },
    {
      id: 'DS08',
      q: 'Whitespace in UI design:',
      options: [
        'Is wasted space to be minimized',
        'Improves scanability and hierarchy',
        'Only matters in print',
        'Slows users down',
      ],
      answer: 1,
    },
    {
      id: 'DS09',
      q: 'A "dark pattern" is:',
      options: [
        'A dark-mode color scheme',
        'A UI deliberately designed to trick users into unintended actions',
        'A low-contrast layout',
        'An accessibility feature',
      ],
      answer: 1,
    },
    {
      id: 'DS10',
      q: 'The 60-30-10 rule in visual design refers to:',
      options: [
        'Spacing scale',
        'Color proportion balance',
        'Grid columns',
        'Type scale ratios',
      ],
      answer: 1,
    },
  ],
  Sales: [
    {
      id: 'SL01',
      q: 'BANT qualification stands for:',
      options: [
        'Budget, Authority, Need, Timeline',
        'Brand, Audience, Numbers, Targets',
        'Buyer, Account, Negotiation, Terms',
        'Budget, Account, Network, Trust',
      ],
      answer: 0,
    },
    {
      id: 'SL02',
      q: 'The best response to "your product is too expensive" is to:',
      options: [
        'Immediately offer a discount',
        'Reframe the conversation around value and ROI',
        'End the call',
        'Compare competitor prices',
      ],
      answer: 1,
    },
    {
      id: 'SL03',
      q: 'A sales pipeline "conversion rate" measures:',
      options: [
        'Calls made per day',
        'The share of opportunities that advance between stages',
        'Total revenue',
        'Emails opened',
      ],
      answer: 1,
    },
    {
      id: 'SL04',
      q: 'Active listening in a discovery call means:',
      options: [
        'Pitching while the prospect talks',
        'Asking open questions and reflecting back what you heard',
        'Reading from a script',
        'Taking no notes',
      ],
      answer: 1,
    },
    {
      id: 'SL05',
      q: 'Churn risk in an account is best detected early through:',
      options: [
        'Waiting for the renewal date',
        'Monitoring product usage and engagement signals',
        'Quarterly invoices',
        'Cold outreach',
      ],
      answer: 1,
    },
    {
      id: 'SL06',
      q: 'An ideal customer profile (ICP) describes:',
      options: [
        'Any company with budget',
        'The type of account that gets the most value and retains best',
        'The largest enterprise logos',
        'Existing customers only',
      ],
      answer: 1,
    },
    {
      id: 'SL07',
      q: 'The primary goal of a discovery call is to:',
      options: [
        'Close the deal',
        'Understand the prospect’s problem, impact, and buying process',
        'Demo every feature',
        'Send pricing',
      ],
      answer: 1,
    },
    {
      id: 'SL08',
      q: 'MRR stands for:',
      options: [
        'Maximum Revenue Reached',
        'Monthly Recurring Revenue',
        'Marginal Rate of Return',
        'Monthly Retention Rate',
      ],
      answer: 1,
    },
    {
      id: 'SL09',
      q: 'When a deal stalls, the most effective next step is to:',
      options: [
        'Send daily follow-ups',
        'Re-engage the champion and re-confirm the business case and timeline',
        'Drop the price immediately',
        'Mark it closed-lost',
      ],
      answer: 1,
    },
    {
      id: 'SL10',
      q: 'Cross-selling means:',
      options: [
        'Selling to a competitor’s customer',
        'Offering complementary products to an existing customer',
        'Lowering price for volume',
        'Selling through partners',
      ],
      answer: 1,
    },
  ],
  'Human Resources': [
    {
      id: 'HR01',
      q: 'A structured interview is one where:',
      options: [
        'Questions vary per candidate',
        'All candidates get the same predetermined questions scored on a rubric',
        'Only the hiring manager attends',
        'No notes are taken',
      ],
      answer: 1,
    },
    {
      id: 'HR02',
      q: 'Time-to-fill measures:',
      options: [
        'Hours interviewers spend per week',
        'Days from opening a requisition to an accepted offer',
        'Length of onboarding',
        'Notice period of a new hire',
      ],
      answer: 1,
    },
    {
      id: 'HR03',
      q: 'Halo bias in interviews means:',
      options: [
        'Preferring internal candidates',
        'Letting one positive trait color the whole evaluation',
        'Scoring late candidates lower',
        'Favoring referred candidates',
      ],
      answer: 1,
    },
    {
      id: 'HR04',
      q: 'An offer acceptance rate that is dropping most likely signals:',
      options: [
        'Too many applicants',
        'Misalignment in compensation, speed, or candidate experience',
        'A strong employer brand',
        'Low attrition',
      ],
      answer: 1,
    },
    {
      id: 'HR05',
      q: 'BGV in hiring refers to:',
      options: [
        'Background verification',
        'Base grade variance',
        'Benefits and grants validation',
        'Behavioral group evaluation',
      ],
      answer: 0,
    },
    {
      id: 'HR06',
      q: 'The primary purpose of a probation period is to:',
      options: [
        'Delay benefits',
        'Mutually evaluate fit with a defined review point',
        'Reduce salary costs',
        'Extend notice periods',
      ],
      answer: 1,
    },
    {
      id: 'HR07',
      q: 'eNPS measures:',
      options: [
        'Employee likelihood to recommend the company as a place to work',
        'Net profit share',
        'New position openings',
        'Engineering productivity',
      ],
      answer: 0,
    },
    {
      id: 'HR08',
      q: 'Which is a leading indicator of attrition risk?',
      options: [
        'Exit interviews',
        'Sustained drops in engagement and 1:1 frequency',
        'Last year’s turnover rate',
        'Headcount reports',
      ],
      answer: 1,
    },
    {
      id: 'HR09',
      q: 'A competency matrix maps:',
      options: [
        'Salaries to grades',
        'Skills and proficiency levels across roles',
        'Office seating',
        'Reporting lines',
      ],
      answer: 1,
    },
    {
      id: 'HR10',
      q: 'Inclusive job descriptions should:',
      options: [
        'List 15+ mandatory requirements',
        'Use gender-neutral language and focus on must-have outcomes',
        'Require photos',
        'Specify age ranges',
      ],
      answer: 1,
    },
  ],
};

/** Generic bank used when a department has no specific assessment. */
export const GENERAL_ASSESSMENT: TestQuestion[] = [
  {
    id: 'GN01',
    q: 'You receive two urgent tasks with the same deadline. The best first step is to:',
    options: [
      'Do the easier one first',
      'Clarify priority and impact with the stakeholders',
      'Work overtime silently',
      'Delegate both',
    ],
    answer: 1,
  },
  {
    id: 'GN02',
    q: 'A teammate disagrees with your approach in a meeting. You should:',
    options: [
      'Defend your idea until they concede',
      'Understand their reasoning and evaluate both options on merits',
      'Escalate to a manager immediately',
      'Withdraw your proposal',
    ],
    answer: 1,
  },
  {
    id: 'GN03',
    q: 'Which is the clearest professional email subject line?',
    options: [
      'Hello',
      'Quick thing',
      'Q3 budget review — approval needed by Friday',
      'IMPORTANT!!!',
    ],
    answer: 2,
  },
  {
    id: 'GN04',
    q: 'If a project is going to miss its deadline, the right time to inform stakeholders is:',
    options: [
      'After the deadline passes',
      'As soon as the risk is identified, with a revised plan',
      'Only if they ask',
      'Never — work weekends instead',
    ],
    answer: 1,
  },
  {
    id: 'GN05',
    q: '15% of 240 is:',
    options: ['24', '32', '36', '40'],
    answer: 2,
  },
  {
    id: 'GN06',
    q: 'A process you follow daily seems inefficient. The best action is to:',
    options: [
      'Keep following it — it’s the process',
      'Quietly stop doing it',
      'Document the issue and propose an improvement to the owner',
      'Complain to colleagues',
    ],
    answer: 2,
  },
  {
    id: 'GN07',
    q: 'When you make a mistake that affects others, you should first:',
    options: [
      'Wait to see if anyone notices',
      'Own it, inform those affected, and fix or contain the impact',
      'Find who else contributed',
      'Update your resume',
    ],
    answer: 1,
  },
  {
    id: 'GN08',
    q: 'A meeting could have been an email when:',
    options: [
      'It has an agenda and decisions to make',
      'It is purely one-way status sharing with no discussion needed',
      'Stakeholders disagree',
      'It involves brainstorming',
    ],
    answer: 1,
  },
  {
    id: 'GN09',
    q: 'If revenue grew from ₹80 lakh to ₹1 crore, the growth percentage is:',
    options: ['20%', '25%', '30%', '125%'],
    answer: 1,
  },
  {
    id: 'GN10',
    q: 'The most reliable way to handle multiple recurring responsibilities is to:',
    options: [
      'Memory',
      'A prioritized system you review regularly (lists/calendar)',
      'Doing whatever is asked last',
      'Working longer hours',
    ],
    answer: 1,
  },
];

/**
 * Role-specific assessment banks, keyed by a lowercase role keyword found in the
 * candidate's applied position (e.g. "Senior React Engineer" → "react"). These
 * take priority over the department bank.
 */
export const ROLE_ASSESSMENT_BANKS: Record<string, TestQuestion[]> = {
  react: [
    {
      id: 'RE01',
      q: 'Which hook adds local state to a function component?',
      options: ['useEffect', 'useState', 'useRef', 'useMemo'],
      answer: 1,
    },
    {
      id: 'RE02',
      q: 'Where should side effects (data fetching, subscriptions) go in a function component?',
      options: ['Directly in the render body', 'In useEffect', 'In useState', 'In the JSX'],
      answer: 1,
    },
    {
      id: 'RE03',
      q: 'Why does React need a "key" prop on list items?',
      options: [
        'To style each item',
        'To help React identify which items changed for efficient reconciliation',
        'It is required for accessibility',
        'To set the item order in CSS',
      ],
      answer: 1,
    },
    {
      id: 'RE04',
      q: 'What does useMemo do?',
      options: [
        'Memoizes a function reference',
        'Caches an expensive computed value between renders',
        'Stores state that survives unmount',
        'Forces a re-render',
      ],
      answer: 1,
    },
    {
      id: 'RE05',
      q: 'Which of these will cause a component to re-render?',
      options: [
        'Mutating a variable outside state',
        'A change to its state or props',
        'Logging to the console',
        'Adding a comment',
      ],
      answer: 1,
    },
    {
      id: 'RE06',
      q: 'Per the Rules of Hooks, hooks must be called:',
      options: [
        'Inside loops for each item',
        'At the top level of a component, not inside conditions or loops',
        'Only inside event handlers',
        'After an early return',
      ],
      answer: 1,
    },
    {
      id: 'RE07',
      q: 'What does useCallback return?',
      options: [
        'A memoized value',
        'A memoized callback function with a stable identity',
        'A ref object',
        'A piece of state',
      ],
      answer: 1,
    },
    {
      id: 'RE08',
      q: '"Lifting state up" means:',
      options: [
        'Storing state in localStorage',
        'Moving shared state to the closest common ancestor of the components that need it',
        'Using a global variable',
        'Wrapping state in useRef',
      ],
      answer: 1,
    },
    {
      id: 'RE09',
      q: 'What is the purpose of React.Fragment (<>…</>)?',
      options: [
        'To add a styled wrapper div',
        'To group children without adding an extra DOM node',
        'To memoize a component',
        'To create a portal',
      ],
      answer: 1,
    },
    {
      id: 'RE10',
      q: 'useRef is commonly used to:',
      options: [
        'Trigger re-renders when its value changes',
        'Hold a mutable value or DOM reference that persists across renders without re-rendering',
        'Replace useState entirely',
        'Fetch data on mount',
      ],
      answer: 1,
    },
  ],
};

/** Match a role keyword from the candidate's applied position. */
function roleKeyFor(position: string): string | null {
  const p = (position || '').toLowerCase();
  for (const key of Object.keys(ROLE_ASSESSMENT_BANKS)) {
    if (p.includes(key)) return key;
  }
  return null;
}

/**
 * The assessment/interview question bank for a candidate — a role-specific bank
 * (e.g. React) takes priority, otherwise the department bank, otherwise General.
 */
export function assessmentBankFor(department: string, position = ''): TestQuestion[] {
  const roleKey = roleKeyFor(position);
  if (roleKey) return ROLE_ASSESSMENT_BANKS[roleKey];
  return ASSESSMENT_BANKS[department] ?? GENERAL_ASSESSMENT;
}
