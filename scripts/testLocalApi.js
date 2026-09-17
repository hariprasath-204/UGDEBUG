import axios from 'axios';

async function testLocal() {
  try {
    const res = await axios.post('http://localhost:3000/api/compile', {
      compiler: 'c',
      code: '#include <stdio.h>\nint main() {\n    int numbers[] = {10, 20, 30, 40, 50};\n    int sum = 0;\n    for (int i = 0; i < 5; i++) sum += numbers[i];\n    printf("Total Sum = %d\\n", sum);\n    return 0;\n}'
    });
    console.log('Backend /api/compile Response:', res.data);
  } catch (err) {
    console.error('Backend /api/compile Error:', err?.response?.data || err?.message);
  }
}

testLocal();
