import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";

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

const demoQuestions = [
  {
    title: "C Bug: Uninitialized Pointer Dereference",
    phase: "c",
    description: "The program attempts to assign a value to an uninitialized pointer, causing undefined behavior or segmentation fault. Fix it so it prints the correct number.",
    points: 100,
    expectedOutput: "Result: 42",
    variants: {
      c: {
        initialCode: `#include <stdio.h>\n\nint main() {\n    int *ptr;\n    *ptr = 42;\n    printf("Result: %d\\n", *ptr);\n    return 0;\n}`,
        correctCode: `#include <stdio.h>\n\nint main() {\n    int val = 42;\n    int *ptr = &val;\n    printf("Result: %d\\n", *ptr);\n    return 0;\n}`,
        errorLines: "4, 5|6",
        errorLinesArray: [4, 5, 6]
      }
    }
  },
  {
    title: "C Bug: Array Sum Loop Off-by-One",
    phase: "c",
    description: "The function calculates the sum of elements in an array, but the loop goes out of bounds and accesses garbage memory. Fix the loop boundary.",
    points: 100,
    expectedOutput: "Total Sum = 150",
    variants: {
      c: {
        initialCode: `#include <stdio.h>\n\nint calculateSum(int arr[], int n) {\n    int sum = 0;\n    for (int i = 0; i <= n; i++) {\n        sum += arr[i];\n    }\n    return sum;\n}\n\nint main() {\n    int numbers[] = {10, 20, 30, 40, 50};\n    int total = calculateSum(numbers, 5);\n    printf("Total Sum = %d\\n", total);\n    return 0;\n}`,
        correctCode: `#include <stdio.h>\n\nint calculateSum(int arr[], int n) {\n    int sum = 0;\n    for (int i = 0; i < n; i++) {\n        sum += arr[i];\n    }\n    return sum;\n}\n\nint main() {\n    int numbers[] = {10, 20, 30, 40, 50};\n    int total = calculateSum(numbers, 5);\n    printf("Total Sum = %d\\n", total);\n    return 0;\n}`,
        errorLines: "5",
        errorLinesArray: [5]
      }
    }
  },
  {
    title: "C Bug: String Reverse Missing Null-Terminator",
    phase: "c",
    description: "The string reversal logic fails to null-terminate the reversed string, producing garbage characters when printed. Fix the reverse loop and null character placement.",
    points: 100,
    expectedOutput: "Reversed: OLLEH",
    variants: {
      c: {
        initialCode: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[] = "HELLO";\n    char rev[10];\n    int len = strlen(str);\n    for (int i = 0; i < len; i++) {\n        rev[i] = str[len - 1 - i];\n    }\n    printf("Reversed: %s\\n", rev);\n    return 0;\n}`,
        correctCode: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[] = "HELLO";\n    char rev[10];\n    int len = strlen(str);\n    for (int i = 0; i < len; i++) {\n        rev[i] = str[len - 1 - i];\n    }\n    rev[len] = '\\0';\n    printf("Reversed: %s\\n", rev);\n    return 0;\n}`,
        errorLines: "11|12",
        errorLinesArray: [11, 12]
      }
    }
  },
  {
    title: "C++ Bug: Student Grade Calculator Reference Pass",
    phase: "cpp",
    description: "The applyBonus function takes parameters by value instead of reference, so the object's bonus is never applied. Fix the function signature.",
    points: 100,
    expectedOutput: "Student: Alex | Final Score: 95",
    variants: {
      cpp: {
        initialCode: `#include <iostream>\n#include <string>\nusing namespace std;\n\nclass Student {\npublic:\n    string name;\n    int score;\n    Student(string n, int s) : name(n), score(s) {}\n};\n\nvoid applyBonus(Student s, int bonus) {\n    s.score += bonus;\n}\n\nint main() {\n    Student s("Alex", 85);\n    applyBonus(s, 10);\n    cout << "Student: " << s.name << " | Final Score: " << s.score << endl;\n    return 0;\n}`,
        correctCode: `#include <iostream>\n#include <string>\nusing namespace std;\n\nclass Student {\npublic:\n    string name;\n    int score;\n    Student(string n, int s) : name(n), score(s) {}\n};\n\nvoid applyBonus(Student &s, int bonus) {\n    s.score += bonus;\n}\n\nint main() {\n    Student s("Alex", 85);\n    applyBonus(s, 10);\n    cout << "Student: " << s.name << " | Final Score: " << s.score << endl;\n    return 0;\n}`,
        errorLines: "12",
        errorLinesArray: [12]
      }
    }
  },
  {
    title: "C++ Bug: Vector Element Filter and Count",
    phase: "cpp",
    description: "The countEvens function has an off-by-one boundary bug in vector indexing, causing an out-of-range memory access. Fix the loop bounds.",
    points: 100,
    expectedOutput: "Even Numbers Count: 3",
    variants: {
      cpp: {
        initialCode: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint countEvens(const vector<int>& numbers) {\n    int count = 0;\n    for (size_t i = 0; i <= numbers.size(); i++) {\n        if (numbers[i] % 2 == 0) {\n            count++;\n        }\n    }\n    return count;\n}\n\nint main() {\n    vector<int> nums = {12, 7, 18, 21, 24, 33};\n    int evens = countEvens(nums);\n    cout << "Even Numbers Count: " << evens << endl;\n    return 0;\n}`,
        correctCode: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint countEvens(const vector<int>& numbers) {\n    int count = 0;\n    for (size_t i = 0; i < numbers.size(); i++) {\n        if (numbers[i] % 2 == 0) {\n            count++;\n        }\n    }\n    return count;\n}\n\nint main() {\n    vector<int> nums = {12, 7, 18, 21, 24, 33};\n    int evens = countEvens(nums);\n    cout << "Even Numbers Count: " << evens << endl;\n    return 0;\n}`,
        errorLines: "7",
        errorLinesArray: [7]
      }
    }
  }
];

async function seed() {
  console.log("Seeding 5 demo questions into Firebase Firestore...");
  const questionsCol = collection(db, "questions");
  
  for (const q of demoQuestions) {
    const docRef = await addDoc(questionsCol, {
      ...q,
      createdAt: serverTimestamp()
    });
    console.log(`✓ Added [${q.phase.toUpperCase()}] ${q.title} (ID: ${docRef.id})`);
  }
  
  const snap = await getDocs(questionsCol);
  console.log(`\n🎉 Success! Total questions now in Firestore: ${snap.size}`);
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
