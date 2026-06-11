/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  currentCompany: string;
  currentDesignation: string;
  totalExperienceYears: number;
  relevantExperienceYears: number;
  currentCtc: string; // e.g. "12 LPA"
  expectedCtc: string;
  noticePeriodDays: number;
  resumeUrl?: string;
  portfolioLink?: string;
  linkedInUrl?: string;
  appliedRole: string;
  department: string;
  sourceOfApplication: string;
  referralDetails?: string;
  hrRemarks?: string;
  status: CandidateStatus;
  appliedDate: string;

  // Set when the candidate applied through a public job posting link.
  jobId?: string;

  // Screening questionnaire answered at apply time (from the job's questions).
  screeningAnswers?: ScreeningAnswer[];
  /** Auto-computed from the answers (must-have fail = Unfit, etc.). */
  fitRating?: FitRating;
  /** HR's manual override of the computed rating, if any. */
  fitRatingOverride?: FitRating;
  /** HR's screening review recorded before/while reaching out to the candidate. */
  screeningReview?: ScreeningReview;

  // HR introductory call info (if completed or moved to HR Call)
  hrCall?: HRCallRecord;
}

/** HR's rating-based screening review (each criterion 1-5, plus a free remark). */
export interface ScreeningReview {
  /** How relevant the resume is to the role (1-5). */
  resumeRelevance: number;
  /** How well their experience matches (1-5). */
  experienceMatch: number;
  /** How well their skills match the role (1-5). */
  skillMatch: number;
  /** How much the candidate stands out / sounds different (1-5). */
  standoutFactor: number;
  /** Communication / profile clarity (1-5). */
  communication: number;
  /** Overall screening remarks (free text). */
  remarks: string;
  reviewedDate?: string;
}

export type QuestionCategory = 'Field' | 'Cultural Fit';
export type QuestionImportance = 'Must Have' | 'Good to Have';
export type FitRating = 'Fit' | 'Borderline' | 'Unfit';
/** 'yesno' = Yes/No · 'choice' = pick one option · 'text' = short free text. */
export type QuestionType = 'yesno' | 'choice' | 'text';

/** A screening question attached to a job posting. */
export interface ScreeningQuestion {
  id: string;
  text: string;
  category: QuestionCategory;
  importance: QuestionImportance;
  /** Answer format. Missing = legacy yes/no. */
  type?: QuestionType;
  /** yes/no: the answer (Yes=true / No=false) that counts as a pass. */
  expectedAnswer?: boolean;
  /** choice: the options to pick from. */
  options?: string[];
  /** choice: the option that counts as a pass. */
  expectedOption?: string;
}

/** A candidate's answer to one screening question, with the pass result. */
export interface ScreeningAnswer {
  questionId: string;
  text: string;
  category: QuestionCategory;
  importance: QuestionImportance;
  type: QuestionType;
  /** Normalised answer: 'Yes'/'No', the chosen option, or the typed text. */
  answer: string;
  /** Whether it counts as a pass (text questions are informational → always true). */
  passed: boolean;
}

/** A planned recruitment event (call/test/assessment/interview) shown on the calendar. */
export type ScheduleType = 'HR Call' | 'IQ Test' | 'Assessment' | 'Interview';

export interface ScheduleEvent {
  id: string;
  candidateId: string;
  candidateName: string;
  type: ScheduleType;
  title: string;
  dateTime: string; // ISO 8601 with time
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  createdAt: string;
}

/**
 * A secure invitation to take an online test (IQ or role assessment). The `id`
 * doubles as the unguessable token in the public test URL (/test/[id]).
 */
export interface TestInvite {
  id: string; // e.g. 'TIV-8F3K2P'
  /** 'iq' = MCQ reasoning test. 'assignment' = take-home task the candidate
   *  submits a file for, graded manually by HR. ('assessment' is the legacy
   *  MCQ stage, superseded by 'assignment'.) */
  kind: 'iq' | 'assessment' | 'assignment';
  candidateId: string;
  candidateName: string;
  email: string;
  position: string; // applied role (drives which assessment bank is used)
  department: string;
  jobId?: string;
  durationMin: number; // iq: 20, assessment: 60
  scheduledFor?: string; // ISO — from the schedule event
  status: 'Pending' | 'In Progress' | 'Completed' | 'Auto-Submitted' | 'Submitted' | 'Graded';
  startedAt?: string;
  completedAt?: string;
  /* ----- assignment (take-home) fields ----- */
  /** Brief shown to the candidate on the submission page. */
  instructions?: string;
  /** ISO deadline for the take-home assignment. */
  deadlineIso?: string;
  /** Document id (in the documents store) of the candidate's uploaded work. */
  submissionDocId?: string;
  submissionFileName?: string;
  /** HR grading notes recorded when the assignment is graded. */
  gradeComments?: string;
  correct?: number;
  total?: number;
  /** IQ tests: IQ-scale score (pass >= 100). Assessments: percentage (pass >= 60). */
  score?: number;
  passed?: boolean;
  /** True when the attempt was voided for rule violations (e.g. 3 tab switches):
   *  the score is not counted and the candidate is not accepted. */
  disqualified?: boolean;
  violations?: number;
  /** Question id -> selected option index, recorded at submit for HR analysis. */
  answers?: Record<string, number>;
  createdAt: string;
}

/** A dashboard login account. Stored server-side; `id` is the email. */
export interface AuthUser {
  id: string; // email (primary key)
  email: string;
  password: string;
  role: 'admin' | 'hr';
  name: string;
}

/** A job opening that HR posts and shares via a public link. */
export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  minExperienceYears: number;
  salaryMin: string; // e.g. "12 LPA"
  salaryMax: string;
  description: string; // detailed role description
  requirements: string; // skills / must-haves, one per line
  status: JobStatus;
  postedBy: string;
  postedDate: string;
  /** Yes/No screening questions candidates answer when applying. */
  screeningQuestions?: ScreeningQuestion[];
}

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Temporary';

export type WorkMode = 'Onsite' | 'Remote' | 'Hybrid';

export type JobStatus = 'Open' | 'Closed' | 'Draft' | 'On Hold';

export type CandidateStatus =
  | 'New Application'
  | 'Under Review'
  | 'Shortlisted'
  | 'Rejected'
  | 'On Hold'
  | 'Moved to HR Call'
  | 'Selected'
  | 'Duplicate Profile';

export interface HRCallRecord {
  completed: boolean;
  candidateAvailability: string;
  communicationRating: number; // 1-5
  professionalBackgroundSummary: string;
  reasonForJobChange: string;
  currentCtc: string;
  expectedCtc: string;
  noticePeriodDays: number;
  workModePreference: 'Onsite' | 'Remote' | 'Hybrid';
  roleUnderstanding: string;
  interestLevel: number; // 1-5
  culturalFitRemarks: string;
  hrRecommendation: string;
  nextStep:
    | 'Proceed to Interview'
    | 'Reject'
    | 'Keep on Hold'
    | 'Request More Information'
    | 'Schedule Follow-Up Call';
  completedDate?: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  appliedRole: string;
  department: string;
  interviewRound: string; // e.g., 'Technical Round 1', 'Systems Design', 'Director Fit'
  interviewerName: string;
  dateTime: string;
  meetingMode: 'Google Meet' | 'Zoom' | 'In-Person';
  meetingLink: string;
  durationMinutes: number;
  status: InterviewStatus;
  interviewerRemarks?: string;
  hrRemarks?: string;

  // Grading details
  grading?: InterviewGrading;
}

export type InterviewStatus =
  | 'Scheduled'
  | 'Rescheduled'
  | 'Completed'
  | 'Candidate No-Show'
  | 'Interviewer No-Show'
  | 'Cancelled'
  | 'Pending Feedback';

export interface InterviewGrading {
  grades: {
    subjectKnowledge: number; // 1-5
    clarityOfCommunication: number;
    confidence: number;
    practicalExperience: number;
    problemSolvingAbility: number;
    attitude: number;
    teamFit: number;
    learningAbility: number;
    overallSuitability: number;
  };
  interviewerComments: string;
  recommendation: 'Strong Hire' | 'Hire' | 'Hold' | 'Reject' | 'Re-Interview Required';
  gradedAt: string;
}

export interface IQTest {
  id: string;
  candidateId: string;
  candidateName: string;
  appliedRole: string;
  testDate: string;
  totalQuestions: number;
  questionsAttempted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  scorePercentage: number;
  timeTakenMinutes: number;
  qualificationStatus: 'Passed' | 'Failed' | 'Borderline' | 'Retest Required';
  remarks?: string;
}

export interface Assignment {
  id: string;
  assignmentTitle: string;
  role: string;
  department: string;
  difficultyLevel: 'Easy' | 'Medium' | 'Hard';
  instructions: string;
  submissionDeadline: string;
  fileUploadRequirement: boolean;
  evaluationCriteria: string;
  maximumMarks: number;
  passingMarks: number;

  // Evaluation instances (Candidate submissions)
  submissions: AssignmentSubmission[];
}

export interface AssignmentSubmission {
  id: string;
  candidateId: string;
  candidateName: string;
  submittedAt: string;
  fileName?: string;
  fileSize?: string;
  status: AssignmentSubmissionStatus;
  grading?: {
    accuracy: number; // 1-10
    understandingOfProblem: number;
    creativity: number;
    practicalApproach: number;
    technicalQuality: number;
    communication: number;
    timeliness: number;
    overallScore: number; // calculated
    evaluatorComments: string;
  };
}

export type AssignmentSubmissionStatus =
  | 'Assigned'
  | 'Opened'
  | 'Submitted'
  | 'Auto-Graded'
  | 'Pending Manual Review'
  | 'Passed'
  | 'Failed'
  | 'Rework Requested'
  | 'Expired';

export interface BGVRequirement {
  id: string;
  candidateId: string;
  candidateName: string;
  appliedRole: string;
  documents: {
    type: BGVDocumentType;
    status: BGVDocumentStatus;
    uploadedAt?: string;
    fileUrl?: string;
    remarks?: string;
  }[];
  overallStatus: BGVOverallStatus;
  verificationTimeline: {
    date: string;
    action: string;
    performedBy: string;
  }[];
}

export type BGVDocumentType =
  | 'Aadhaar card'
  | 'PAN card'
  | 'Address proof'
  | 'Education certificates'
  | 'Previous employment proof'
  | 'Salary slips'
  | 'Bank details'
  | 'Cancelled cheque'
  | 'Passport-size photograph'
  | 'Experience letters'
  | 'Relieving letter'
  | 'Signed offer letter'
  | 'NDA'
  | 'Employment agreement'
  | 'Emergency contact details';

export type BGVDocumentStatus =
  | 'Pending'
  | 'Partially Submitted'
  | 'Submitted'
  | 'Under Verification'
  | 'Verified'
  | 'Rejected'
  | 'Resubmission Required';

export type BGVOverallStatus = BGVDocumentStatus;

export interface OnboardingChecklist {
  candidateId: string;
  candidateName: string;
  onboardingStatus: OnboardingStatus;
  progressPercentage: number;
  tasks: {
    id: string;
    title: string;
    isChecked: boolean;
    category: 'Documentation' | 'IT Setup' | 'Admin & Assets' | 'HR & Induction' | 'Manager & Team';
  }[];
}

export type OnboardingStatus =
  | 'Offer Accepted'
  | 'Documentation Pending'
  | 'Documentation Completed'
  | 'BGV Pending'
  | 'BGV Completed'
  | 'Ready to Join'
  | 'Joined'
  | 'Onboarding Completed';

export interface Employee {
  id: string; // Employee ID e.g., 'EMP-1024'
  fullName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  reportingManager: string;
  joiningDate: string;
  workLocation: string;
  status: 'Active' | 'On Leave' | 'Suspended' | 'Offboarded';
  personalDetails: {
    address: string;
    emergencyContact: string;
    bankAccount: string;
  };

  // Performance: how well the employee communicates (1-5), rated by HR/managers.
  communicationRating?: number;
  communicationNotes?: string;

  // Modules associated
  credentials?: CredentialRecord[];
  assets?: AssetRecord[];
  appraisalHistory?: AppraisalRecord[];
  offboarding?: OffboardingWorkflow;
}

export interface CredentialRecord {
  id: string;
  systemName: string; // e.g. 'Slack', 'GitHub', 'AWS', 'HRIS Portal'
  assignedEmail: string;
  accessLevel: 'Admin' | 'Standard' | 'Restricted' | 'Read-Only';
  dateGranted: string;
  grantedBy: string;
  status: 'Pending Creation' | 'Active' | 'Restricted' | 'Suspended' | 'Revoked';
}

export interface AssetRecord {
  id: string; // e.g. 'AST-405'
  serialNumber: string;
  assetName: string; // e.g. 'Apple MacBook Pro 16"'
  assetType:
    | 'Laptop'
    | 'Desktop'
    | 'Monitor'
    | 'Keyboard'
    | 'Mouse'
    | 'Headphones'
    | 'Mobile phone'
    | 'SIM card'
    | 'Office chair'
    | 'ID card'
    | 'Access card'
    | 'Storage device'
    | 'Other company equipment';
  purchaseDate: string;
  conditionAtAssignment: string;
  conditionAtReturn?: string;
  assignedToEmployeeId?: string;
  assignedToEmployeeName?: string;
  assignmentDate?: string;
  assignedBy?: string;
  returnDate?: string;
  repairStatus: 'None' | 'Pending Repair' | 'In Progress' | 'Repaired';
  replacementStatus: 'None' | 'Requested' | 'Approved' | 'Replaced';
  status: 'Available' | 'Assigned' | 'Under Repair' | 'Lost' | 'Damaged' | 'Returned' | 'Retired';
  remarks?: string;
}

export interface AppraisalRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  currentRole: string;
  currentSalary: string;
  reviewPeriod: string; // e.g., 'H1 2026', 'Annual 2025'
  reportingManager: string;
  performanceScore: number; // 1-5 scale or 1-100%
  targetAchievement: string; // text description
  attendanceSummary: string;
  productivitySummary: string;
  managerFeedback: string;
  hrFeedback: string;
  strengths: string;
  improvementAreas: string;
  recommendedSalaryRevision: string;
  recommendedPromotion: string;
  finalDecision: string;
  effectiveDate: string;
  status: AppraisalStatus;
}

export type AppraisalStatus =
  | 'Not Started'
  | 'Self Review Pending'
  | 'Manager Review Pending'
  | 'HR Review Pending'
  | 'Leadership Approval Pending'
  | 'Approved'
  | 'Rejected'
  | 'Completed';

export interface OffboardingWorkflow {
  employeeId: string;
  employeeName: string;
  triggerReason:
    | 'Resignation'
    | 'Termination'
    | 'Contract completion'
    | 'Absconding'
    | 'Role redundancy'
    | 'Mutual separation';
  status: OffboardingStatus;
  initiatedDate: string;
  lastWorkingDay: string;
  checklist: {
    id: string;
    title: string;
    isChecked: boolean;
    category:
      | 'Notice Period'
      | 'Asset Return'
      | 'Access Revocation'
      | 'Finance Clearance'
      | 'Knowledge Transfer'
      | 'Settlement';
  }[];
  deliverables?: {
    id: string;
    title: string;
    isSubmitted: boolean;
    owner?: string;
  }[];
  ktRecord?: KnowledgeTransferRecord;
}

export type OffboardingStatus =
  | 'Exit Initiated'
  | 'Notice Period Active'
  | 'Clearance Pending'
  | 'Asset Return Pending'
  | 'Access Revocation Pending'
  | 'Knowledge Transfer Pending'
  | 'Final Settlement Pending'
  | 'Completed';

export interface KnowledgeTransferRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  currentProjects: string;
  pendingTasks: string;
  importantFilesUrl: string;
  clientDetails: string;
  vendorDetails: string;
  processNotes: string;
  loginAccessHandoverStatus: string;
  importantContacts: string;
  reportingManagerConfirmation: boolean;
  replacementEmployeeName: string;
  ktSessionDate: string;
  ktCompletionStatus: KnowledgeTransferStatus;
}

export type KnowledgeTransferStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Submitted'
  | 'Reviewed'
  | 'Rework Required'
  | 'Completed';

export interface EmailTemplate {
  id: string;
  subject: string;
  title: string;
  bodyTemplate: string; // markdown or plaintext blocks
  variables: string[]; // e.g. ['{{CANDIDATE_NAME}}', '{{ROLE}}', '{{DATE}}']
}

export interface SentEmailLog {
  id: string;
  recipientName: string;
  recipientEmail: string;
  templateTitle: string;
  subject: string;
  dateSent: string;
  status: 'Sent' | 'Delivered' | 'Opened' | 'Bounced';
  relatedEntity: string; // e.g., Candidate or Employee
}
