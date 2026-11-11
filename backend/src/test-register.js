
const response = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fullName: 'Test User',
    email: 'testuser@example.com',
    password: 'TestPassword123',
  }),
})

console.log('HTTP Status:', response.status)
console.log('Response:', await response.json())
