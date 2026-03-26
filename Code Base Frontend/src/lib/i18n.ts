import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation
      'nav.dashboard': 'Dashboard',
      'nav.patients': 'Patients',
      'nav.beds': 'Beds',
      'nav.alerts': 'Alerts & Notifications',
      'nav.profile': 'Profile',
      'nav.settings': 'Settings',
      'nav.help': 'Help & Support',
      'nav.admin': 'Admin Panel',
      'nav.signOut': 'Sign Out',

      // Dashboard
      'dashboard.title': 'ER Command Center',
      'dashboard.triageQueue': 'Triage Queue',
      'dashboard.newArrival': 'New Arrival',
      'dashboard.allPatients': 'All Patients',
      'dashboard.myPatients': 'My Patients',
      'dashboard.analytics': 'Analytics',
      'dashboard.bedCapacity': 'Bed Capacity',
      'dashboard.aiPredictions': 'AI Predictions',
      'dashboard.erBeds': 'ER Beds',
      'dashboard.icuCritical': 'ICU/Critical',
      'dashboard.erUtilization': 'ER Utilization',
      'dashboard.icuUtilization': 'ICU Utilization',

      // Patient
      'patient.name': 'Patient Name',
      'patient.age': 'Age',
      'patient.gender': 'Gender',
      'patient.phone': 'Phone Number',
      'patient.complaint': 'Chief Complaint',
      'patient.bloodGroup': 'Blood Group',
      'patient.status': 'Status',
      'patient.department': 'Department',
      'patient.bed': 'Bed',
      'patient.vitals': 'Vitals',
      'patient.triage': 'Triage',
      'patient.notes': 'Nurse Notes',
      'patient.doctorNotes': 'Doctor Notes',
      'patient.prescriptions': 'Prescriptions',
      'patient.discharge': 'Discharge',
      'patient.edit': 'Edit Patient',

      // Vitals
      'vitals.heartRate': 'Heart Rate',
      'vitals.bloodPressure': 'Blood Pressure',
      'vitals.spo2': 'SpO2',
      'vitals.temperature': 'Temperature',
      'vitals.respiratoryRate': 'Respiratory Rate',
      'vitals.record': 'Record Vitals',

      // Triage
      'triage.runAI': 'Run AI Triage',
      'triage.critical': 'L1 - Critical',
      'triage.emergent': 'L2 - Emergent',
      'triage.urgent': 'L3 - Urgent',
      'triage.lessUrgent': 'L4 - Less Urgent',
      'triage.nonUrgent': 'L5 - Non-Urgent',

      // Actions
      'action.save': 'Save',
      'action.cancel': 'Cancel',
      'action.close': 'Close',
      'action.submit': 'Submit',
      'action.search': 'Search',
      'action.filter': 'Filter',
      'action.add': 'Add',
      'action.edit': 'Edit',
      'action.delete': 'Delete',

      // Auth
      'auth.login': 'Sign In',
      'auth.logout': 'Sign Out',
      'auth.email': 'Email Address',
      'auth.password': 'Password',
      'auth.forgotPassword': 'Forgot Password?',

      // Settings
      'settings.title': 'Settings',
      'settings.appearance': 'Appearance',
      'settings.notifications': 'Notifications',
      'settings.privacy': 'Privacy',
      'settings.security': 'Security',
      'settings.theme': 'Theme',
      'settings.language': 'Language',
      'settings.changePassword': 'Change Password',

      // Alerts
      'alert.critical': 'Critical',
      'alert.high': 'High',
      'alert.medium': 'Medium',
      'alert.low': 'Low',

      // Common
      'common.loading': 'Loading...',
      'common.noData': 'No data available',
      'common.error': 'An error occurred',
      'common.success': 'Success',
      'common.male': 'Male',
      'common.female': 'Female',
      'common.other': 'Other',
    },
  },
  hi: {
    translation: {
      // Navigation
      'nav.dashboard': 'डैशबोर्ड',
      'nav.patients': 'मरीज़',
      'nav.beds': 'बिस्तर',
      'nav.alerts': 'अलर्ट और सूचनाएं',
      'nav.profile': 'प्रोफ़ाइल',
      'nav.settings': 'सेटिंग्स',
      'nav.help': 'सहायता',
      'nav.admin': 'एडमिन पैनल',
      'nav.signOut': 'साइन आउट',

      // Dashboard
      'dashboard.title': 'ईआर कमांड सेंटर',
      'dashboard.triageQueue': 'ट्राइएज कतार',
      'dashboard.newArrival': 'नया मरीज़',
      'dashboard.allPatients': 'सभी मरीज़',
      'dashboard.myPatients': 'मेरे मरीज़',
      'dashboard.analytics': 'विश्लेषण',
      'dashboard.bedCapacity': 'बिस्तर क्षमता',
      'dashboard.aiPredictions': 'AI भविष्यवाणी',
      'dashboard.erBeds': 'ER बिस्तर',
      'dashboard.icuCritical': 'ICU/गंभीर',
      'dashboard.erUtilization': 'ER उपयोग',
      'dashboard.icuUtilization': 'ICU उपयोग',

      // Patient
      'patient.name': 'मरीज़ का नाम',
      'patient.age': 'उम्र',
      'patient.gender': 'लिंग',
      'patient.phone': 'फ़ोन नंबर',
      'patient.complaint': 'मुख्य शिकायत',
      'patient.bloodGroup': 'रक्त समूह',
      'patient.status': 'स्थिति',
      'patient.department': 'विभाग',
      'patient.bed': 'बिस्तर',
      'patient.vitals': 'जीवन संकेत',
      'patient.triage': 'ट्राइएज',
      'patient.notes': 'नर्स नोट्स',
      'patient.doctorNotes': 'डॉक्टर नोट्स',
      'patient.prescriptions': 'प्रेस्क्रिप्शन',
      'patient.discharge': 'डिस्चार्ज',
      'patient.edit': 'मरीज़ संपादन',

      // Vitals
      'vitals.heartRate': 'हृदय गति',
      'vitals.bloodPressure': 'रक्तचाप',
      'vitals.spo2': 'SpO2',
      'vitals.temperature': 'तापमान',
      'vitals.respiratoryRate': 'श्वसन दर',
      'vitals.record': 'जीवन संकेत दर्ज करें',

      // Triage
      'triage.runAI': 'AI ट्राइएज चलाएं',
      'triage.critical': 'L1 - गंभीर',
      'triage.emergent': 'L2 - आपातकालीन',
      'triage.urgent': 'L3 - तत्काल',
      'triage.lessUrgent': 'L4 - कम तत्काल',
      'triage.nonUrgent': 'L5 - सामान्य',

      // Actions
      'action.save': 'सहेजें',
      'action.cancel': 'रद्द करें',
      'action.close': 'बंद करें',
      'action.submit': 'जमा करें',
      'action.search': 'खोजें',
      'action.filter': 'फ़िल्टर',
      'action.add': 'जोड़ें',
      'action.edit': 'संपादित करें',
      'action.delete': 'हटाएं',

      // Auth
      'auth.login': 'साइन इन',
      'auth.logout': 'साइन आउट',
      'auth.email': 'ईमेल पता',
      'auth.password': 'पासवर्ड',
      'auth.forgotPassword': 'पासवर्ड भूल गए?',

      // Settings
      'settings.title': 'सेटिंग्स',
      'settings.appearance': 'प्रकटन',
      'settings.notifications': 'सूचनाएं',
      'settings.privacy': 'गोपनीयता',
      'settings.security': 'सुरक्षा',
      'settings.theme': 'थीम',
      'settings.language': 'भाषा',
      'settings.changePassword': 'पासवर्ड बदलें',

      // Alerts
      'alert.critical': 'गंभीर',
      'alert.high': 'उच्च',
      'alert.medium': 'मध्यम',
      'alert.low': 'निम्न',

      // Common
      'common.loading': 'लोड हो रहा है...',
      'common.noData': 'कोई डेटा उपलब्ध नहीं',
      'common.error': 'एक त्रुटि हुई',
      'common.success': 'सफल',
      'common.male': 'पुरुष',
      'common.female': 'महिला',
      'common.other': 'अन्य',
    },
  },
  te: {
    translation: {
      // Navigation
      'nav.dashboard': 'డాష్‌బోర్డ్',
      'nav.patients': 'రోగులు',
      'nav.beds': 'బెడ్లు',
      'nav.alerts': 'అలర్ట్‌లు & నోటిఫికేషన్లు',
      'nav.profile': 'ప్రొఫైల్',
      'nav.settings': 'సెట్టింగ్‌లు',
      'nav.help': 'సహాయం',
      'nav.admin': 'అడ్మిన్ ప్యానెల్',
      'nav.signOut': 'సైన్ అవుట్',

      // Dashboard
      'dashboard.title': 'ER కమాండ్ సెంటర్',
      'dashboard.triageQueue': 'ట్రైయేజ్ క్యూ',
      'dashboard.newArrival': 'కొత్త రోగి',
      'dashboard.allPatients': 'అందరు రోగులు',
      'dashboard.myPatients': 'నా రోగులు',
      'dashboard.analytics': 'విశ్లేషణలు',
      'dashboard.bedCapacity': 'బెడ్ సామర్థ్యం',
      'dashboard.aiPredictions': 'AI అంచనాలు',
      'dashboard.erBeds': 'ER బెడ్లు',
      'dashboard.icuCritical': 'ICU/క్రిటికల్',
      'dashboard.erUtilization': 'ER వినియోగం',
      'dashboard.icuUtilization': 'ICU వినియోగం',

      // Patient
      'patient.name': 'రోగి పేరు',
      'patient.age': 'వయస్సు',
      'patient.gender': 'లింగం',
      'patient.phone': 'ఫోన్ నంబర్',
      'patient.complaint': 'ప్రధాన ఫిర్యాదు',
      'patient.bloodGroup': 'రక్త గ్రూపు',
      'patient.status': 'స్థితి',
      'patient.department': 'విభాగం',
      'patient.bed': 'బెడ్',
      'patient.vitals': 'వైటల్స్',
      'patient.triage': 'ట్రైయేజ్',
      'patient.notes': 'నర్స్ నోట్స్',
      'patient.doctorNotes': 'డాక్టర్ నోట్స్',
      'patient.prescriptions': 'ప్రిస్క్రిప్షన్లు',
      'patient.discharge': 'డిశ్చార్జ్',
      'patient.edit': 'రోగిని సవరించు',

      // Vitals
      'vitals.heartRate': 'హృదయ స్పందన రేటు',
      'vitals.bloodPressure': 'రక్తపోటు',
      'vitals.spo2': 'SpO2',
      'vitals.temperature': 'ఉష్ణోగ్రత',
      'vitals.respiratoryRate': 'శ్వాసకోశ రేటు',
      'vitals.record': 'వైటల్స్ నమోదు',

      // Triage
      'triage.runAI': 'AI ట్రైయేజ్ అమలు',
      'triage.critical': 'L1 - క్రిటికల్',
      'triage.emergent': 'L2 - ఎమర్జెన్సీ',
      'triage.urgent': 'L3 - అత్యవసరం',
      'triage.lessUrgent': 'L4 - తక్కువ అత్యవసరం',
      'triage.nonUrgent': 'L5 - సాధారణ',

      // Actions
      'action.save': 'సేవ్',
      'action.cancel': 'రద్దు',
      'action.close': 'మూసివేయి',
      'action.submit': 'సమర్పించు',
      'action.search': 'వెతుకు',
      'action.filter': 'ఫిల్టర్',
      'action.add': 'జోడించు',
      'action.edit': 'సవరించు',
      'action.delete': 'తొలగించు',

      // Auth
      'auth.login': 'సైన్ ఇన్',
      'auth.logout': 'సైన్ అవుట్',
      'auth.email': 'ఇమెయిల్',
      'auth.password': 'పాస్‌వర్డ్',
      'auth.forgotPassword': 'పాస్‌వర్డ్ మర్చిపోయారా?',

      // Settings
      'settings.title': 'సెట్టింగ్‌లు',
      'settings.appearance': 'ప్రదర్శన',
      'settings.notifications': 'నోటిఫికేషన్లు',
      'settings.privacy': 'గోప్యత',
      'settings.security': 'భద్రత',
      'settings.theme': 'థీమ్',
      'settings.language': 'భాష',
      'settings.changePassword': 'పాస్‌వర్డ్ మార్చు',

      // Alerts
      'alert.critical': 'క్రిటికల్',
      'alert.high': 'ఎక్కువ',
      'alert.medium': 'మధ్యస్థం',
      'alert.low': 'తక్కువ',

      // Common
      'common.loading': 'లోడ్ అవుతోంది...',
      'common.noData': 'డేటా అందుబాటులో లేదు',
      'common.error': 'లోపం సంభవించింది',
      'common.success': 'విజయవంతం',
      'common.male': 'పురుషుడు',
      'common.female': 'స్త్రీ',
      'common.other': 'ఇతరం',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('appLanguage') || 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
