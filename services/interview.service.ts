import { Candidate, Interview, SentEmailLog } from '@/types';
import { nowISO, randomId, todayISO } from '@/lib/utils';

export interface ScheduleInput {
  round: string;
  interviewer: string;
  dateTime: string;
  mode: string;
}

export function buildScheduledInterview(candidate: Candidate, input: ScheduleInput): Interview {
  return {
    id: randomId('INT'),
    candidateId: candidate.id,
    candidateName: candidate.fullName,
    appliedRole: candidate.appliedRole,
    department: candidate.department,
    interviewRound: input.round,
    interviewerName: input.interviewer,
    dateTime: input.dateTime,
    meetingMode: input.mode as Interview['meetingMode'],
    // Left empty: an online Meet link is populated by the Google Calendar push
    // (lib/api/calendar), and an in-person location is entered by the scheduler.
    meetingLink: '',
    durationMinutes: 45,
    status: 'Scheduled',
  };
}

export function buildInterviewInviteEmail(candidate: Candidate, round: string): SentEmailLog {
  return {
    id: randomId('LOG', 9000, 1000),
    recipientName: candidate.fullName,
    recipientEmail: candidate.email,
    templateTitle: 'Interview scheduled email',
    subject: `Scheduled: ${round} Interview - ${candidate.fullName}`,
    dateSent: nowISO(),
    status: 'Delivered',
    relatedEntity: candidate.fullName,
  };
}

export function applyGrading(
  interview: Interview,
  recommendation: string,
  comments: string,
  summary?: string,
): Interview {
  // Derive a representative score from the interviewer's actual recommendation
  // rather than hardcoding a fixed scorecard.
  const base = /strong/i.test(recommendation)
    ? 5
    : /no\s*hire|reject/i.test(recommendation)
      ? 2
      : /hold|maybe|consider/i.test(recommendation)
        ? 3
        : 4;
  return {
    ...interview,
    status: 'Completed',
    grading: {
      grades: {
        subjectKnowledge: base,
        clarityOfCommunication: base,
        confidence: base,
        practicalExperience: base,
        problemSolvingAbility: base,
        attitude: base,
        teamFit: base,
        learningAbility: base,
        overallSuitability: base,
      },
      interviewerComments: comments,
      ...(summary && summary.trim() ? { summary: summary.trim() } : {}),
      recommendation: recommendation as any,
      gradedAt: todayISO(),
    },
  };
}
