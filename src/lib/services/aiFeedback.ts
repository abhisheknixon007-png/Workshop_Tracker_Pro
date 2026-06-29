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

interface AISettings {
  provider: 'none' | 'openai' | 'gemini';
  apiKey: string;
}

// Retrieve AI settings from localStorage or environment variables
function getAISettings(): AISettings {
  if (typeof window === 'undefined') {
    return { provider: 'none', apiKey: '' };
  }
  
  // Try environment variables first
  const envProvider = process.env.NEXT_PUBLIC_AI_PROVIDER;
  const envOpenAIKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  const envGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  const storedProvider = localStorage.getItem('tracker_ai_provider') as any;
  const storedOpenAIKey = localStorage.getItem('tracker_openai_api_key');
  const storedGeminiKey = localStorage.getItem('tracker_gemini_api_key');

  const provider = storedProvider || envProvider || 'none';
  let apiKey = '';

  if (provider === 'openai') {
    apiKey = storedOpenAIKey || envOpenAIKey || '';
  } else if (provider === 'gemini') {
    apiKey = storedGeminiKey || envGeminiKey || '';
  }

  return { provider, apiKey };
}

// Clean up markdown block quotes returned by LLMs
function parseJSONResponse(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

// OpenAI API Caller
async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API failed with status ${response.status}`);
  }

  const result = await response.json();
  return result.choices[0].message.content || '';
}

// Gemini API Caller
async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API failed with status ${response.status}`);
  }

  const result = await response.json();
  return result.candidates[0].content.parts[0].text || '';
}

/**
 * Generate AI performance feedback for a specific student
 */
export async function generateStudentFeedback(
  studentProgress: StudentProgressSummary,
  workshopName: string
): Promise<AIFeedbackResponse> {
  // First generate baseline heuristics
  const att = studentProgress.attendancePct;
  const score = studentProgress.averageScore;
  const pending = studentProgress.pendingActivities;
  
  let summary = "";
  const strengths: string[] = [];
  const recommendations: string[] = [];

  // Heuristic logic for fallback
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

  const baseline: AIFeedbackResponse = { summary, strengths, recommendations };

  // Attempt smart suggestions upgrade if API keys are set
  const settings = getAISettings();
  if (settings.provider !== 'none' && settings.apiKey) {
    try {
      const prompt = `You are an expert educational AI assistant.
Refine the following raw, rule-based student progress feedback for a workshop named "${workshopName}" into a polished, professional, and encouraging summary.
Student Name: ${studentProgress.studentName}
Student Email: ${studentProgress.email}
Attendance: ${att}%
Completed Activities: ${studentProgress.completedActivities}/${studentProgress.totalActivities}
Pending Activities: ${pending}
Assessment Average Grade: ${score}%
Baseline Heuristic Summary: "${baseline.summary}"
Baseline Strengths: ${JSON.stringify(baseline.strengths)}
Baseline Recommendations: ${JSON.stringify(baseline.recommendations)}

Please return a valid JSON object ONLY. Do not wrap in markdown code blocks. The JSON must exactly match the schema:
{
  "summary": "encouraging paragraph highlighting progress and engagement",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

      let resultText = '';
      if (settings.provider === 'openai') {
        resultText = await callOpenAI(prompt, settings.apiKey);
      } else if (settings.provider === 'gemini') {
        resultText = await callGemini(prompt, settings.apiKey);
      }

      if (resultText) {
        const parsed = parseJSONResponse(resultText);
        if (parsed.summary && Array.isArray(parsed.strengths) && Array.isArray(parsed.recommendations)) {
          return parsed as AIFeedbackResponse;
        }
      }
    } catch (err) {
      console.warn("AI Upgrade failed. Falling back to rule-based logic.", err);
    }
  }

  return baseline;
}

/**
 * Generate trainer insights for the entire workshop class
 */
export async function generateTrainerInsights(
  studentProgressList: StudentProgressSummary[],
  workshop: Workshop
): Promise<TrainerInsightsResponse> {
  // Baseline heuristic metrics
  const topPerformers = [...studentProgressList]
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 3)
    .map(s => ({ name: s.studentName, score: s.averageScore }));

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

  const baseline: TrainerInsightsResponse = {
    topPerformers,
    atRiskStudents: atRiskStudents.slice(0, 3),
    attendanceTrends,
    actionableInsights
  };

  // Attempt smart suggestions upgrade if API keys are set
  const settings = getAISettings();
  if (settings.provider !== 'none' && settings.apiKey && studentProgressList.length > 0) {
    try {
      const prompt = `You are an expert class analytics assistant.
Refine the following raw class performance metrics for the workshop "${workshop.name}" into actionable insights and trends.
Top Performers: ${JSON.stringify(baseline.topPerformers)}
At-Risk Students: ${JSON.stringify(baseline.atRiskStudents)}
Attendance Trends: "${baseline.attendanceTrends}"
Baseline Actionable Insights: ${JSON.stringify(baseline.actionableInsights)}

Please return a valid JSON object ONLY. Do not wrap in markdown code blocks. The JSON must exactly match the schema:
{
  "topPerformers": [{"name": "Student Name", "score": 95}],
  "atRiskStudents": [{"name": "Student Name", "reason": "Reason details"}],
  "attendanceTrends": "Engaging class analysis summary",
  "actionableInsights": ["Action 1", "Action 2"]
}`;

      let resultText = '';
      if (settings.provider === 'openai') {
        resultText = await callOpenAI(prompt, settings.apiKey);
      } else if (settings.provider === 'gemini') {
        resultText = await callGemini(prompt, settings.apiKey);
      }

      if (resultText) {
        const parsed = parseJSONResponse(resultText);
        if (Array.isArray(parsed.topPerformers) && Array.isArray(parsed.atRiskStudents) && parsed.attendanceTrends && Array.isArray(parsed.actionableInsights)) {
          return parsed as TrainerInsightsResponse;
        }
      }
    } catch (err) {
      console.warn("AI Upgrade failed. Falling back to rule-based logic.", err);
    }
  }

  return baseline;
}
