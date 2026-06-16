// Local storage-backed Mock Database for out-of-the-box local developer demo
import { 
  Profile, Workshop, Session, Enrollment, Attendance, 
  Activity, ActivityScore, Assessment, AssessmentScore, 
  Feedback, WorkshopRules, Certificate, CertificateStatus, Notification, AuditLog,
  StudentProgressSummary, AttendanceStatus
} from './types';

// Default Seed Data
const DEFAULT_PROFILES: Profile[] = [
  { id: 'u-admin', full_name: 'Sarah Connor', email: 'admin@workshop.com', role: 'admin' },
  { id: 'u-trainer-1', full_name: 'Dr. Elena Rostova', email: 'trainer1@workshop.com', role: 'trainer', phone_number: '+1 (555) 123-4567', college_name: 'Global Tech Institute', department: 'Electrical Engineering' },
  { id: 'u-trainer-2', full_name: 'Prof. Alan Turing', email: 'trainer2@workshop.com', role: 'trainer', phone_number: '+1 (555) 987-6543', college_name: 'Systems Science Academy', department: 'Computer Science' },
  { id: 'u-student-1', full_name: 'Alice Cooper', email: 'student1@workshop.com', role: 'student', phone_number: '+1 (555) 111-2222', college_name: 'IIT Madras', department: 'Computer Science', academic_year: '3rd Year' },
  { id: 'u-student-2', full_name: 'Bob Marley', email: 'student2@workshop.com', role: 'student', phone_number: '+1 (555) 333-4444', college_name: 'IIT Delhi', department: 'Electronics', academic_year: '4th Year' },
  { id: 'u-student-3', full_name: 'Charlie Brown', email: 'student3@workshop.com', role: 'student', phone_number: '+1 (555) 555-6666', college_name: 'NIT Trichy', department: 'Electrical', academic_year: '2nd Year' },
  { id: 'u-student-4', full_name: 'David Gilmour', email: 'student4@workshop.com', role: 'student', phone_number: '+1 (555) 777-8888', college_name: 'BITS Pilani', department: 'Mechanical', academic_year: '3rd Year' },
  { id: 'u-student-5', full_name: 'Emily Watson', email: 'student5@workshop.com', role: 'student', phone_number: '+1 (555) 999-0000', college_name: 'IIIT Hyderabad', department: 'Computer Science', academic_year: '1st Year' }
];

const DEFAULT_WORKSHOPS: Workshop[] = [
  { id: 'w-iot', name: 'IoT & Embedded Systems Boot Camp', description: 'Hands-on training building physical electronics, programming sensors, and deploying IoT cloud gateways.', start_date: '2026-06-10', end_date: '2026-06-20', status: 'active', trainer_id: 'u-trainer-1' },
  { id: 'w-web', name: 'Advanced Web Development with Next.js', description: 'Comprehensive modern full-stack web architectures using React Server Components, Route Handlers, and Edge APIs.', start_date: '2026-06-01', end_date: '2026-06-14', status: 'completed', trainer_id: 'u-trainer-2' },
  { id: 'w-ml', name: 'Machine Learning Foundations', description: 'Introduction to classification, regression, clustering models, and deploying pre-trained models on edge hardware.', start_date: '2026-07-01', end_date: '2026-07-15', status: 'draft', trainer_id: 'u-trainer-2' }
];

const DEFAULT_SESSIONS: Session[] = [
  // IoT Workshop Sessions (Active)
  { id: 's-iot-1', workshop_id: 'w-iot', name: 'Day 1: Microcontrollers & Circuit Assembly', session_date: '2026-06-14', duration_mins: 120, description: 'Introduction to ESP32 board, breadboarding basic circuits, resistor networks, and flashing firmware.' },
  { id: 's-iot-2', workshop_id: 'w-iot', name: 'Day 2: Sensor Wiring & Protocol APIs', session_date: '2026-06-15', duration_mins: 180, description: 'Interfacing DHT22 temperature sensors, ultrasonic sensors, and logging data on terminal.' },
  { id: 's-iot-3', workshop_id: 'w-iot', name: 'Day 3: MQTT & Cloud Server Integration', session_date: '2026-06-16', duration_mins: 150, description: 'Publishing sensor telemetry to MQTT brokers, building Adafruit IO visual dashboard.' },
  { id: 's-iot-4', workshop_id: 'w-iot', name: 'Day 4: Final Practical Assessment & Showcase', session_date: '2026-06-18', duration_mins: 240, description: 'Building an end-to-end telemetry system and demonstrating viva-voce.' },
  
  // Web Dev Sessions (Completed)
  { id: 's-web-1', workshop_id: 'w-web', name: 'RSC & App Router Layouts', session_date: '2026-06-02', duration_mins: 120, description: 'Layout hierarchies, server component boundaries, and nested routing patterns.' },
  { id: 's-web-2', workshop_id: 'w-web', name: 'State Management & Server Actions', session_date: '2026-06-05', duration_mins: 120, description: 'Mutating database state directly inside components with loading states and form validations.' },
  { id: 's-web-3', workshop_id: 'w-web', name: 'Edge APIs & Dynamic Caching', session_date: '2026-06-08', duration_mins: 120, description: 'Under the hood optimizations, dynamic path segments, revalidation patterns.' },
  { id: 's-web-4', workshop_id: 'w-web', name: 'Final Production Deployment', session_date: '2026-06-12', duration_mins: 180, description: 'Performance metrics, audit reviews, and final project hosting with Vercel.' }
];

const DEFAULT_ENROLLMENTS: Enrollment[] = [
  // IoT Students
  { id: 'e-1', student_id: 'u-student-1', workshop_id: 'w-iot' },
  { id: 'e-2', student_id: 'u-student-2', workshop_id: 'w-iot' },
  { id: 'e-3', student_id: 'u-student-3', workshop_id: 'w-iot' },
  // Web Dev Students
  { id: 'e-4', student_id: 'u-student-1', workshop_id: 'w-web' },
  { id: 'e-5', student_id: 'u-student-2', workshop_id: 'w-web' },
  { id: 'e-6', student_id: 'u-student-4', workshop_id: 'w-web' },
  { id: 'e-7', student_id: 'u-student-5', workshop_id: 'w-web' }
];

const DEFAULT_ATTENDANCE: Attendance[] = [
  // IoT Attendance
  { id: 'att-1', session_id: 's-iot-1', student_id: 'u-student-1', status: 'Present', recorded_by: 'u-trainer-1' },
  { id: 'att-2', session_id: 's-iot-1', student_id: 'u-student-2', status: 'Late', recorded_by: 'u-trainer-1' },
  { id: 'att-3', session_id: 's-iot-1', student_id: 'u-student-3', status: 'Present', recorded_by: 'u-trainer-1' },
  
  { id: 'att-4', session_id: 's-iot-2', student_id: 'u-student-1', status: 'Present', recorded_by: 'u-trainer-1' },
  { id: 'att-5', session_id: 's-iot-2', student_id: 'u-student-2', status: 'Absent', recorded_by: 'u-trainer-1' },
  { id: 'att-6', session_id: 's-iot-2', student_id: 'u-student-3', status: 'Present', recorded_by: 'u-trainer-1' },
  
  { id: 'att-7', session_id: 's-iot-3', student_id: 'u-student-1', status: 'Present', recorded_by: 'u-trainer-1' },
  { id: 'att-8', session_id: 's-iot-3', student_id: 'u-student-2', status: 'Present', recorded_by: 'u-trainer-1' },
  { id: 'att-9', session_id: 's-iot-3', student_id: 'u-student-3', status: 'Excused', recorded_by: 'u-trainer-1' },

  // Web Dev Attendance
  { id: 'att-10', session_id: 's-web-1', student_id: 'u-student-1', status: 'Present', recorded_by: 'u-trainer-2' },
  { id: 'att-11', session_id: 's-web-1', student_id: 'u-student-2', status: 'Present', recorded_by: 'u-trainer-2' },
  { id: 'att-12', session_id: 's-web-1', student_id: 'u-student-4', status: 'Present', recorded_by: 'u-trainer-2' },
  { id: 'att-13', session_id: 's-web-1', student_id: 'u-student-5', status: 'Present', recorded_by: 'u-trainer-2' },
  
  { id: 'att-14', session_id: 's-web-2', student_id: 'u-student-1', status: 'Present', recorded_by: 'u-trainer-2' },
  { id: 'att-15', session_id: 's-web-2', student_id: 'u-student-2', status: 'Present', recorded_by: 'u-trainer-2' },
  { id: 'att-16', session_id: 's-web-2', student_id: 'u-student-4', status: 'Late', recorded_by: 'u-trainer-2' },
  { id: 'att-17', session_id: 's-web-2', student_id: 'u-student-5', status: 'Present', recorded_by: 'u-trainer-2' },
  
  { id: 'att-18', session_id: 's-web-3', student_id: 'u-student-1', status: 'Present', recorded_by: 'u-trainer-2' },
  { id: 'att-19', session_id: 's-web-3', student_id: 'u-student-2', status: 'Present', recorded_by: 'u-trainer-2' },
  { id: 'att-20', session_id: 's-web-3', student_id: 'u-student-4', status: 'Present', recorded_by: 'u-trainer-2' },
  { id: 'att-21', session_id: 's-web-3', student_id: 'u-student-5', status: 'Absent', recorded_by: 'u-trainer-2' },
  
  { id: 'att-22', session_id: 's-web-4', student_id: 'u-student-1', status: 'Present', recorded_by: 'u-trainer-2' },
  { id: 'att-23', session_id: 's-web-4', student_id: 'u-student-2', status: 'Present', recorded_by: 'u-trainer-2' },
  { id: 'att-24', session_id: 's-web-4', student_id: 'u-student-4', status: 'Present', recorded_by: 'u-trainer-2' },
  { id: 'att-25', session_id: 's-web-4', student_id: 'u-student-5', status: 'Present', recorded_by: 'u-trainer-2' }
];

const DEFAULT_ACTIVITIES: Activity[] = [
  // IoT Activities
  { id: 'act-iot-1', workshop_id: 'w-iot', name: 'Circuit Assembly (Breadboarding)', description: 'Correctly wire an LED, tactile push button, and potentiometer to ESP32 development board.' },
  { id: 'act-iot-2', workshop_id: 'w-iot', name: 'Sensor Telemetry Readout', description: 'Write C++ firmware to sample analog signals and print raw vs calibrated sensor data.' },
  { id: 'act-iot-3', workshop_id: 'w-iot', name: 'MQTT Cloud Dashboard Setup', description: 'Publish sensor payloads via MQTT protocols and construct widgets on Adafruit dashboard.' },
  
  // Web Dev Activities
  { id: 'act-web-1', workshop_id: 'w-web', name: 'Nested Routing & Sidebar Layouts', description: 'Construct responsive navigation headers with page layouts dynamically reflecting sub-routes.' },
  { id: 'act-web-2', workshop_id: 'w-web', name: 'Next.js Forms & Action Mutation', description: 'Integrate standard forms with loading spinners, validation, and optimistic state updates.' },
  { id: 'act-web-3', workshop_id: 'w-web', name: 'Full-stack Vercel Deployment', description: 'Configuring custom error bounds, loading skeleton interfaces, and linking dynamic domain.' }
];

const DEFAULT_ACTIVITY_SCORES: ActivityScore[] = [
  // IoT scores
  { id: 'acts-1', activity_id: 'act-iot-1', student_id: 'u-student-1', score: 95, feedback: 'Perfect schematic layout and neat wiring.', submission_date: '2026-06-14', recorded_by: 'u-trainer-1' },
  { id: 'acts-2', activity_id: 'act-iot-1', student_id: 'u-student-2', score: 80, feedback: 'A few overlapping wires, but circuit works.', submission_date: '2026-06-14', recorded_by: 'u-trainer-1' },
  { id: 'acts-3', activity_id: 'act-iot-1', student_id: 'u-student-3', score: 85, feedback: 'Solid assembly, took slightly longer to troubleshoot.', submission_date: '2026-06-14', recorded_by: 'u-trainer-1' },
  
  { id: 'acts-4', activity_id: 'act-iot-2', student_id: 'u-student-1', score: 98, feedback: 'Excellent calibration code and clean structure.', submission_date: '2026-06-15', recorded_by: 'u-trainer-1' },
  { id: 'acts-5', activity_id: 'act-iot-2', student_id: 'u-student-3', score: 90, feedback: 'Accurate data readout, code requires better commenting.', submission_date: '2026-06-15', recorded_by: 'u-trainer-1' },
  
  // Web Dev scores
  { id: 'acts-6', activity_id: 'act-web-1', student_id: 'u-student-1', score: 90, feedback: 'Very clean folder structure and animation transitions.', submission_date: '2026-06-03', recorded_by: 'u-trainer-2' },
  { id: 'acts-7', activity_id: 'act-web-1', student_id: 'u-student-2', score: 85, feedback: 'Great routing, minor CSS alignment issue on mobile screens.', submission_date: '2026-06-03', recorded_by: 'u-trainer-2' },
  { id: 'acts-8', activity_id: 'act-web-1', student_id: 'u-student-4', score: 75, feedback: 'Layout works, folder organization can be cleaner.', submission_date: '2026-06-04', recorded_by: 'u-trainer-2' },
  { id: 'acts-9', activity_id: 'act-web-1', student_id: 'u-student-5', score: 88, feedback: 'Excellent responsive sidebar.', submission_date: '2026-06-03', recorded_by: 'u-trainer-2' },
  
  { id: 'acts-10', activity_id: 'act-web-2', student_id: 'u-student-1', score: 95, feedback: 'Perfect client action mutation with error toast controls.', submission_date: '2026-06-06', recorded_by: 'u-trainer-2' },
  { id: 'acts-11', activity_id: 'act-web-2', student_id: 'u-student-2', score: 90, feedback: 'Optimistic state handles updates instantly.', submission_date: '2026-06-06', recorded_by: 'u-trainer-2' },
  { id: 'acts-12', activity_id: 'act-web-2', student_id: 'u-student-4', score: 80, feedback: 'Validation errors catch well, minor layout shift during load.', submission_date: '2026-06-07', recorded_by: 'u-trainer-2' },
  { id: 'acts-13', activity_id: 'act-web-2', student_id: 'u-student-5', score: 70, feedback: 'Submit button remains active during submit lifecycle, please fix.', submission_date: '2026-06-06', recorded_by: 'u-trainer-2' },
  
  { id: 'acts-14', activity_id: 'act-web-3', student_id: 'u-student-1', score: 92, feedback: 'Fast loading score of 98/100 on audits.', submission_date: '2026-06-09', recorded_by: 'u-trainer-2' },
  { id: 'acts-15', activity_id: 'act-web-3', student_id: 'u-student-2', score: 88, feedback: 'Domain connects and loads quickly.', submission_date: '2026-06-09', recorded_by: 'u-trainer-2' },
  { id: 'acts-16', activity_id: 'act-web-3', student_id: 'u-student-4', score: 85, feedback: 'Responsive layout and good loading speeds.', submission_date: '2026-06-10', recorded_by: 'u-trainer-2' },
  { id: 'acts-17', activity_id: 'act-web-3', student_id: 'u-student-5', score: 80, feedback: 'Deployed successfully, missing description tags in metadata.', submission_date: '2026-06-09', recorded_by: 'u-trainer-2' }
];

const DEFAULT_ASSESSMENTS: Assessment[] = [
  // IoT Assessments
  { id: 'as-iot-1', workshop_id: 'w-iot', name: 'Quiz 1: Hardware Registers & Protocols', type: 'Quiz', max_score: 50, pass_score: 35, weightage: 30 },
  { id: 'as-iot-2', workshop_id: 'w-iot', name: 'IoT Architecture Practical Build', type: 'Practical Assessment', max_score: 100, pass_score: 70, weightage: 70 },
  
  // Web Dev Assessments
  { id: 'as-web-1', workshop_id: 'w-web', name: 'Theoretical Web Architectures Quiz', type: 'Quiz', max_score: 100, pass_score: 60, weightage: 30 },
  { id: 'as-web-2', workshop_id: 'w-web', name: 'Final Project: E-commerce Panel with Next.js', type: 'Final Project', max_score: 100, pass_score: 70, weightage: 70 }
];

const DEFAULT_ASSESSMENT_SCORES: AssessmentScore[] = [
  // IoT Scores (partially graded)
  { id: 'asss-1', assessment_id: 'as-iot-1', student_id: 'u-student-1', score: 48, feedback: 'Outstanding theoretical understanding.', evaluation_date: '2026-06-15', recorded_by: 'u-trainer-1' },
  { id: 'asss-2', assessment_id: 'as-iot-1', student_id: 'u-student-2', score: 38, feedback: 'Decent, missed out on ESP32 interrupt questions.', evaluation_date: '2026-06-15', recorded_by: 'u-trainer-1' },
  { id: 'asss-3', assessment_id: 'as-iot-1', student_id: 'u-student-3', score: 42, feedback: 'Solid grasp of registers.', evaluation_date: '2026-06-15', recorded_by: 'u-trainer-1' },
  
  // Web Dev Scores (fully graded)
  { id: 'asss-4', assessment_id: 'as-web-1', student_id: 'u-student-1', score: 95, feedback: 'Excellent quiz result.', evaluation_date: '2026-06-04', recorded_by: 'u-trainer-2' },
  { id: 'asss-5', assessment_id: 'as-web-1', student_id: 'u-student-2', score: 82, feedback: 'Good score, minor issues on caching behavior.', evaluation_date: '2026-06-04', recorded_by: 'u-trainer-2' },
  { id: 'asss-6', assessment_id: 'as-web-1', student_id: 'u-student-4', score: 70, feedback: 'Passable, needs deeper study of caching.', evaluation_date: '2026-06-04', recorded_by: 'u-trainer-2' },
  { id: 'asss-7', assessment_id: 'as-web-1', student_id: 'u-student-5', score: 65, feedback: 'Barely passed, review client-side hook differences.', evaluation_date: '2026-06-04', recorded_by: 'u-trainer-2' },

  { id: 'asss-8', assessment_id: 'as-web-2', student_id: 'u-student-1', score: 94, feedback: 'Excellent UI layout and clean server action database bindings.', evaluation_date: '2026-06-13', recorded_by: 'u-trainer-2' },
  { id: 'asss-9', assessment_id: 'as-web-2', student_id: 'u-student-2', score: 88, feedback: 'Fully functional, includes dynamic filters and checkout system.', evaluation_date: '2026-06-13', recorded_by: 'u-trainer-2' },
  { id: 'asss-10', assessment_id: 'as-web-2', student_id: 'u-student-4', score: 82, feedback: 'Good implementation, code is modular and clean.', evaluation_date: '2026-06-13', recorded_by: 'u-trainer-2' },
  { id: 'asss-11', assessment_id: 'as-web-2', student_id: 'u-student-5', score: 55, feedback: 'Failed to meet criteria: checkout functionality broke, average assessment fails pass mark.', evaluation_date: '2026-06-13', recorded_by: 'u-trainer-2' }
];

const DEFAULT_WORKSHOP_RULES: WorkshopRules[] = [
  { id: 'r-iot', workshop_id: 'w-iot', min_attendance_pct: 80, min_assessment_score: 70, mandatory_activities_completed: true, final_project_mandatory: false },
  { id: 'r-web', workshop_id: 'w-web', min_attendance_pct: 75, min_assessment_score: 60, mandatory_activities_completed: true, final_project_mandatory: true }
];

const DEFAULT_FEEDBACK: Feedback[] = [
  { id: 'fb-1', workshop_id: 'w-iot', student_id: 'u-student-1', feedback_text: 'Alice has performed exceptionally well in hands-on tasks. Attendance is 100%. Code structures are clean and logical.', created_by: 'u-trainer-1', created_at: '2026-06-15T10:00:00Z' },
  { id: 'fb-2', workshop_id: 'w-web', student_id: 'u-student-1', feedback_text: 'Excellent performance! Final project was highly creative and well documented. Fully qualified for advanced roles.', created_by: 'u-trainer-2', created_at: '2026-06-14T15:00:00Z' },
  { id: 'fb-3', workshop_id: 'w-web', student_id: 'u-student-5', feedback_text: 'Emily has high potential, but attendance has dropped slightly (75%). She struggled to connect the API endpoints in the final assessment project. Recommendation: Review Server Actions.', created_by: 'u-trainer-2', created_at: '2026-06-14T15:10:00Z' }
];

const DEFAULT_CERTIFICATES: Certificate[] = [
  { id: 'c-web-alice', student_id: 'u-student-1', workshop_id: 'w-web', issued_at: '2026-06-14T18:00:00Z', certificate_number: 'CERT-WEB-991A3', qr_code: 'VERIFY_CERT-WEB-991A3', status: 'Issued' },
  { id: 'c-web-bob', student_id: 'u-student-2', workshop_id: 'w-web', issued_at: '2026-06-14T18:05:00Z', certificate_number: 'CERT-WEB-773B2', qr_code: 'VERIFY_CERT-WEB-773B2', status: 'Issued' },
  { id: 'c-web-david', student_id: 'u-student-4', workshop_id: 'w-web', issued_at: '2026-06-14T18:10:00Z', certificate_number: 'CERT-WEB-442C5', qr_code: 'VERIFY_CERT-WEB-442C5', status: 'Issued' }
];

const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: 'n-1', user_id: 'u-student-1', message: 'Your certificate for Advanced Next.js is now available for download!', is_read: false, created_at: '2026-06-14T18:00:00Z' },
  { id: 'n-2', user_id: 'u-trainer-1', message: 'You have been assigned to IoT & Embedded Systems Boot Camp.', is_read: true, created_at: '2026-06-10T09:00:00Z' }
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  { id: 'l-1', user_id: 'u-admin', action: 'CREATE_WORKSHOP', details: 'Created workshop: Machine Learning Foundations', created_at: '2026-06-11T12:00:00Z' }
];

// Helper to initialize and retrieve database from Local Storage
class MockDatabase {
  private getStorageItem<T>(key: string, defaultValue: T[]): T[] {
    if (typeof window === 'undefined') return defaultValue;
    const item = localStorage.getItem(`tracker_${key}`);
    if (!item) {
      localStorage.setItem(`tracker_${key}`, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(item);
  }

  private setStorageItem<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`tracker_${key}`, JSON.stringify(data));
  }

  // Getters
  get profiles() { return this.getStorageItem<Profile>('profiles', DEFAULT_PROFILES); }
  get workshops() { return this.getStorageItem<Workshop>('workshops', DEFAULT_WORKSHOPS); }
  get sessions() { return this.getStorageItem<Session>('sessions', DEFAULT_SESSIONS); }
  get enrollments() { return this.getStorageItem<Enrollment>('enrollments', DEFAULT_ENROLLMENTS); }
  get attendance() { return this.getStorageItem<Attendance>('attendance', DEFAULT_ATTENDANCE); }
  get activities() { return this.getStorageItem<Activity>('activities', DEFAULT_ACTIVITIES); }
  get activityScores() { return this.getStorageItem<ActivityScore>('activity_scores', DEFAULT_ACTIVITY_SCORES); }
  get assessments() { return this.getStorageItem<Assessment>('assessments', DEFAULT_ASSESSMENTS); }
  get assessmentScores() { return this.getStorageItem<AssessmentScore>('assessment_scores', DEFAULT_ASSESSMENT_SCORES); }
  get feedback() { return this.getStorageItem<Feedback>('feedback', DEFAULT_FEEDBACK); }
  get workshopRules() { return this.getStorageItem<WorkshopRules>('workshop_rules', DEFAULT_WORKSHOP_RULES); }
  get certificates() { return this.getStorageItem<Certificate>('certificates', DEFAULT_CERTIFICATES); }
  get notifications() { return this.getStorageItem<Notification>('notifications', DEFAULT_NOTIFICATIONS); }
  get auditLogs() { return this.getStorageItem<AuditLog>('audit_logs', DEFAULT_AUDIT_LOGS); }

  // Setters/Update handlers
  set profiles(val) { this.setStorageItem('profiles', val); }
  set workshops(val) { this.setStorageItem('workshops', val); }
  set sessions(val) { this.setStorageItem('sessions', val); }
  set enrollments(val) { this.setStorageItem('enrollments', val); }
  set attendance(val) { this.setStorageItem('attendance', val); }
  set activities(val) { this.setStorageItem('activities', val); }
  set activityScores(val) { this.setStorageItem('activity_scores', val); }
  set assessments(val) { this.setStorageItem('assessments', val); }
  set assessmentScores(val) { this.setStorageItem('assessment_scores', val); }
  set feedback(val) { this.setStorageItem('feedback', val); }
  set workshopRules(val) { this.setStorageItem('workshop_rules', val); }
  set certificates(val) { this.setStorageItem('certificates', val); }
  set notifications(val) { this.setStorageItem('notifications', val); }
  set auditLogs(val) { this.setStorageItem('audit_logs', val); }

  // ---------------------------------------------------------------------------
  // Advanced Queries and Calculations
  // ---------------------------------------------------------------------------

  // Calculate Student Progress Summary in a Workshop
  getStudentProgress(studentId: string, workshopId: string): StudentProgressSummary {
    const profile = this.profiles.find(p => p.id === studentId);
    if (!profile) throw new Error('Student profile not found');

    const workshopSessions = this.sessions.filter(s => s.workshop_id === workshopId);
    const sessionIds = workshopSessions.map(s => s.id);
    
    // Attendance calculations
    const studentAttendance = this.attendance.filter(a => a.student_id === studentId && sessionIds.includes(a.session_id));
    const totalSessions = workshopSessions.length;
    const attendedCount = studentAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
    
    let attendancePct = 100;
    if (totalSessions > 0) {
      attendancePct = Math.round((attendedCount / totalSessions) * 100);
    }

    // Activities
    const workshopActivities = this.activities.filter(a => a.workshop_id === workshopId);
    const activityIds = workshopActivities.map(a => a.id);
    const gradedActivityScores = this.activityScores.filter(s => s.student_id === studentId && activityIds.includes(s.activity_id));
    
    const completedActivities = gradedActivityScores.length;
    const totalActivities = workshopActivities.length;
    const pendingActivities = totalActivities - completedActivities;

    // Assessments
    const workshopAssessments = this.assessments.filter(a => a.workshop_id === workshopId);
    const assessmentIds = workshopAssessments.map(a => a.id);
    const gradedAssessmentScores = this.assessmentScores.filter(s => s.student_id === studentId && assessmentIds.includes(s.assessment_id));
    
    let averageScore = 0;
    let finalProjectPassed = true;
    let allAssessmentsPassed = true;

    if (workshopAssessments.length > 0) {
      let weightedScoreSum = 0;
      let totalWeight = 0;

      workshopAssessments.forEach(ass => {
        const scoreRecord = gradedAssessmentScores.find(s => s.assessment_id === ass.id);
        const scoreValue = scoreRecord ? scoreRecord.score : 0;
        
        // Check pass thresholds
        if (scoreValue < ass.pass_score) {
          allAssessmentsPassed = false;
        }
        
        if (ass.type === 'Final Project' && scoreValue < ass.pass_score) {
          finalProjectPassed = false;
        }

        weightedScoreSum += (scoreValue / ass.max_score) * 100 * (ass.weightage / 100);
        totalWeight += ass.weightage;
      });

      // If weightages do not add up to 100 or 0, compute simple average
      if (totalWeight === 0) {
        const sum = gradedAssessmentScores.reduce((acc, curr) => acc + curr.score, 0);
        averageScore = Math.round(gradedAssessmentScores.length > 0 ? sum / gradedAssessmentScores.length : 0);
      } else {
        averageScore = Math.round(weightedScoreSum * (100 / (totalWeight || 100)));
      }
    }

    const rules = this.workshopRules.find(r => r.workshop_id === workshopId) || {
      min_attendance_pct: 80,
      min_assessment_score: 70,
      mandatory_activities_completed: true,
      final_project_mandatory: false
    };

    // Evaluate certificate eligibility
    let isEligible = true;
    if (attendancePct < rules.min_attendance_pct) isEligible = false;
    if (averageScore < rules.min_assessment_score) isEligible = false;
    if (rules.mandatory_activities_completed && pendingActivities > 0) isEligible = false;
    if (rules.final_project_mandatory && !finalProjectPassed) isEligible = false;

    // Check certificate status
    const certRecord = this.certificates.find(c => c.student_id === studentId && c.workshop_id === workshopId);
    let certStatus: CertificateStatus = 'Not Eligible';
    if (certRecord) {
      certStatus = certRecord.status;
    } else if (isEligible) {
      certStatus = 'Eligible';
    }

    // Overall Progress calculation (average of attendance % and activity completion %)
    const activityCompletionPct = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 100;
    const overallProgress = Math.round((attendancePct + activityCompletionPct) / 2);

    return {
      studentId,
      studentName: profile.full_name,
      email: profile.email,
      collegeName: profile.college_name,
      attendancePct,
      sessionsAttended: attendedCount,
      totalSessions,
      completedActivities,
      totalActivities,
      pendingActivities,
      averageScore,
      assessmentStatus: allAssessmentsPassed && gradedAssessmentScores.length === workshopAssessments.length ? 'Pass' : 'Fail',
      overallProgress,
      isEligibleForCertificate: isEligible,
      certificateStatus: certStatus
    };
  }

  // Create notifications helper
  notify(userId: string, message: string) {
    const list = this.notifications;
    list.unshift({
      id: `n-${Date.now()}`,
      user_id: userId,
      message,
      is_read: false,
      created_at: new Date().toISOString()
    });
    this.notifications = list;
  }

  // Log audit helper
  logAudit(userId: string | null, action: string, details: string) {
    const list = this.auditLogs;
    list.unshift({
      id: `l-${Date.now()}`,
      user_id: userId,
      action,
      details,
      created_at: new Date().toISOString()
    });
    this.auditLogs = list;
  }
}

export const mockDb = new MockDatabase();
export default mockDb;
