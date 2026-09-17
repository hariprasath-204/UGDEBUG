import axios from 'axios';

async function test() {
  const apiKey = 'ccb79ad09699924cb025d0ba0b6690ed';
  console.log('Testing OnlineCompiler.io with API Key:', apiKey);

  // Test C compilation
  try {
    const resC = await axios.post('https://api.onlinecompiler.io/api/run-code-sync/', {
      compiler: 'gcc-15',
      code: '#include <stdio.h>\nint main() {\n    printf("Hello from C Engine\\n");\n    return 0;\n}',
      input: ''
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'ApiKey': apiKey
      },
      timeout: 15000
    });
    console.log('C Compiler Result:', resC.data);
  } catch (err) {
    console.error('C Compilation Failed:', err?.response?.data || err?.message);
  }

  // Test C++ compilation
  try {
    const resCpp = await axios.post('https://api.onlinecompiler.io/api/run-code-sync/', {
      compiler: 'g++-15',
      code: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello from C++ Engine" << endl;\n    return 0;\n}',
      input: ''
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'ApiKey': apiKey
      },
      timeout: 15000
    });
    console.log('C++ Compiler Result:', resCpp.data);
  } catch (err) {
    console.error('C++ Compilation Failed:', err?.response?.data || err?.message);
  }
}

test();
