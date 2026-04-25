import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 1000 }, // Ramp up to 1k users
    { duration: '5m', target: 50000 }, // Scale to 50k users
    { duration: '10m', target: 100000 }, // Peak at 100k users
    { duration: '5m', target: 0 }, // Scale down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

const BASE_URL = 'https://api.scs-platform.com/api';

export default function () {
  // Simulate AI Usage
  const aiRes = http.post(`${BASE_URL}/ai/execute`, JSON.stringify({
    prompt: 'Explain hyperscale architecture',
    model: 'gpt-4'
  }), { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' } });
  check(aiRes, { 'AI status is 200': (r) => r.status === 200 });

  // Simulate Payment
  const payRes = http.post(`${BASE_URL}/payments/process`, JSON.stringify({
    courseId: 'course-123',
    amount: 199.99,
    paymentMethodId: 'pm_card_test'
  }), { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' } });
  check(payRes, { 'Payment status is 200': (r) => r.status === 200 });

  // Simulate Download
  const dlRes = http.post(`${BASE_URL}/courses/download-token`, JSON.stringify({
    resourceType: 'COURSE',
    resourceId: 'course-123'
  }), { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' } });
  check(dlRes, { 'Download status is 200': (r) => r.status === 200 });

  sleep(1);
}
