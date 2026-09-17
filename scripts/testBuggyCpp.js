import axios from 'axios';

const buggyCode = `#include <iostream>
#include <vector>
using namespace std;

int countEvens(const vector<int>& numbers) {
    int count = 0;
    for (size_t i = 0; i <= numbers.size(); i++) {
        if (numbers[i] % 2 == 0) {
            count++;
        }
    }
    return count;
}

int main() {
    vector<int> nums = {12, 7, 18, 21, 24, 33};
    int evens = countEvens(nums);
    cout << "Even Numbers Count: " << evens << endl;
    return 0;
}`;

async function runTest() {
  console.log('Testing OnlineCompiler.io with Buggy C++ Code...');
  try {
    const res = await axios.post('https://api.onlinecompiler.io/api/run-code-sync/', {
      compiler: 'g++-15',
      code: buggyCode,
      input: ''
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'ccb79ad09699924cb025d0ba0b6690ed',
        'ApiKey': 'ccb79ad09699924cb025d0ba0b6690ed'
      },
      timeout: 15000
    });
    console.log('OnlineCompiler Response:', res.data);
  } catch (err) {
    console.log('OnlineCompiler Failed:', err?.response?.data || err?.message);
  }

  // Also test JDoodle fallback for this buggy C++ code
  console.log('\nTesting JDoodle with Buggy C++ Code...');
  try {
    const res2 = await axios.post('https://api.jdoodle.com/v1/execute', {
      clientId: "4a9a6038b2a7e33b9a6b3739d857f178",
      clientSecret: "af69762f1a3185158b2feb6d50efc3255662084d3d3767c9614bc877bc4e9be",
      script: buggyCode,
      language: "cpp17",
      versionIndex: "1"
    });
    console.log('JDoodle Response:', res2.data);
  } catch (err) {
    console.log('JDoodle Failed:', err?.response?.data || err?.message);
  }
}

runTest();
