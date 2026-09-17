import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD4hDWNgk8reyqoKZH5dOC4KYBjNaR2GiU",
  authDomain: "miniproject-de696.firebaseapp.com",
  projectId: "miniproject-de696",
  storageBucket: "miniproject-de696.firebasestorage.app",
  messagingSenderId: "852239142056",
  appId: "1:852239142056:web:b294da9bf22950f120069d",
  measurementId: "G-YQLYL5XEYV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_BRANDING = {
  collegeName: 'Ayya Nadar Janaki Ammal College',
  departmentName: 'Department of Computer Applications',
  mainTitle: 'SOFTTECH',
  associationTitle: 'ASSOCIATION',
  tagline: 'THE ULTIMATE DEBUGGING CHALLENGE',
  buttonText: 'START_SYSTEM',
  footerText: '© 2026 Ayya Nadar Janaki Ammal College. Dept. of Computer Applications. All rights reserved.',
  roundsText: 'ROUND 1: C \u00a0➔\u00a0 ROUND 2: C++',
  modalTitle: 'SYSTEM ACCESS'
};

async function seed() {
  await setDoc(doc(db, 'settings', 'branding'), DEFAULT_BRANDING, { merge: true });
  console.log('Successfully seeded default branding settings to Firestore!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
