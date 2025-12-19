import http from "k6/http";
import { check } from "k6";

// Simple test to verify k6 setup
export default function () {
	// Test basic HTTP request
	const response = http.get("https://httpbin.org/get");

	check(response, {
		"status is 200": (r) => r.status === 200,
		"response time < 2000ms": (r) => r.timings.duration < 2000,
	});
}

// Test options
export const options = {
	vus: 1,
	duration: "10s",
};
