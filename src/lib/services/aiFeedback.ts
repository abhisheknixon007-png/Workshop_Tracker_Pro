// AI Feedback Engine for student performance evaluations
import { StudentProgressSummary, Workshop } from '../types';

export interface AIFeedbackResponse {
  summary: string;
  strengths: string[];
  recommendations: string[];
}

export interface TrainerInsightsResponse {
  topPerformers: { name: string; score: number }[];
  atRiskStudents: { name: string; reason: string }[];
  attendanceTrends: string;
  actionableInsights: string[];
}

/**
 * Generate AI performance feedback for a specific student
 */
export async function generateStudentFeedback(
  studentProgress: StudentProgressSummary,
  workshopName: string
): Promise<AIFeedbackResponse> {
  // If an AI API Key is available, we could perform a network call here.
  // For the demonstration sandbox, we provide a sophisticated rule-based engine
  // that generates detailed, high-fidelity evaluations tailored to the user's statistics.

  const att = studentProgress.attendancePct;
  const score = studentProgress.averageScore;
  const pending = studentProgress.pendingActivities;
  
  let summary = "";
  const strengths: string[] = [];
  const recommendations: string[] = [];

  // 1. Analyze Attendance
  if (att >= 90) {
    summary += `Attendance is excellent at ${att}%, showing strong dedication to the sessions. `;
    strengths.push("Excellent lecture attendance and consistency");
  } else if (att >= 75) {
    summary += `Attendance is satisfactory at ${att}%. `;
    strengths.push("Good attendance rate");
    recommendations.push("Try to attend all upcoming sessions to avoid missing critical topics");
  } else {
    summary += `Attendance is currently critical at ${att}%, which is below the recommended threshold. `;
    recommendations.push("Schedule a one-on-one session to catch up on missed class discussions");
  }

  // 2. Analyze Scores
  if (score >= 85) {
    summary += `Practical performance is strong, and assessment scores indicate a deep, comprehensive understanding of the workshop concepts. `;
    strengths.push("Outstanding performance in assessments");
    strengths.push("High proficiency in practical assignments");
  } else if (score >= 70) {
    summary += `Assessment scores indicate a good average understanding of workshop concepts, though there are areas with room for refinement. `;
    strengths.push("Solid foundation in core topics");
    recommendations.push("Review graded tasks and trainer notes to resolve minor conceptual gaps");
  } else {
    summary += `Assessment scores average ${score}%, indicating difficulty with some of the core topics. `;
    recommendations.push("Re-run labs from earlier sessions to build stronger confidence");
  }

  // 3. Analyze Hands-on Activities
  if (pending === 0) {
    summary += "All hands-on practical activities have been successfully completed, reflecting excellent lab consistency.";
    strengths.push("100% completion of hands-on activities");
  } else if (pending <= 2) {
    summary += `There are only ${pending} pending activities. Completing these will solidify the practical skills.`;
    recommendations.push(`Complete the remaining ${pending} practical lab submissions`);
  } else {
    summary += `There are ${pending} outstanding practical activities. Practical training is highly hands-on and requires completion of these labs.`;
    recommendations.push(`Prioritize completing the ${pending} pending activities to catch up on course credit`);
  }

  // Workshop specific suggestions
  if (workshopName.toLowerCase().includes("iot")) {
    if (score >= 85) {
      recommendations.push("Explore advanced ESP32 register-level programming and RTOS multitasking.");
    } else {
      recommendations.push("Focus on circuit troubleshooting and verification of sensor hardware interfaces.");
    }
  } else if (workshopName.toLowerCase().includes("web") || workshopName.toLowerCase().includes("next")) {
    if (score >= 85) {
      recommendations.push("Examine Next.js middleware optimizations and advanced caching strategies.");
    } else {
      recommendations.push("Practice creating Server Actions and client-server loading skeletons.");
    }
  }

  return {
    summary,
    strengths,
    recommendations
  };
}

/**
 * Generate trainer insights for the entire workshop class
 */
export async function generateTrainerInsights(
  studentProgressList: StudentProgressSummary[],
  workshop: Workshop
): Promise<TrainerInsightsResponse> {
  // Extract top performers
  const topPerformers = [...studentProgressList]
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 3)
    .map(s => ({ name: s.studentName, score: s.averageScore }));

  // Extract at-risk students
  const atRiskStudents: { name: string; reason: string }[] = [];
  studentProgressList.forEach(s => {
    if (s.attendancePct < 75) {
      atRiskStudents.push({ name: s.studentName, reason: `Low attendance (${s.attendancePct}%)` });
    } else if (s.averageScore < 70) {
      atRiskStudents.push({ name: s.studentName, reason: `Low assessment average (${s.averageScore}%)` });
    } else if (s.pendingActivities > 1) {
      atRiskStudents.push({ name: s.studentName, reason: `Unfinished lab work (${s.pendingActivities} activities pending)` });
    }
  });

  // Calculate average attendance
  const totalAttendance = studentProgressList.reduce((acc, curr) => acc + curr.attendancePct, 0);
  const avgAttendance = studentProgressList.length > 0 ? Math.round(totalAttendance / studentProgressList.length) : 0;

  let attendanceTrends = `Average class attendance is standing at ${avgAttendance}%. `;
  if (avgAttendance >= 85) {
    attendanceTrends += "Engagement is high. Most students participate actively in sessions.";
  } else if (avgAttendance >= 70) {
    attendanceTrends += "Engagement is moderate. Minor dips in attendance during midweek sessions.";
  } else {
    attendanceTrends += "Warning: Overall attendance is low. Student retention strategies are required.";
  }

  // Construct actionable insights
  const actionableInsights: string[] = [];
  if (atRiskStudents.length > 0) {
    actionableInsights.push(`Arrange remedial review session for the ${atRiskStudents.length} students showing signs of falling behind.`);
  }
  
  if (workshop.name.toLowerCase().includes("iot")) {
    actionableInsights.push("Provide additional debugging multimeters in the laboratory to help students with wiring checks.");
    actionableInsights.push("Upload sample firmware calibration libraries to the reference folder.");
  } else if (workshop.name.toLowerCase().includes("web")) {
    actionableInsights.push("Run a brief Q&A on React Server Component boundaries, as some students struggled in quiz scores.");
  }

  return {
    topPerformers,
    atRiskStudents: atRiskStudents.slice(0, 3), // return max 3
    attendanceTrends,
    actionableInsights
  };
}
