
fetch("http://localhost:5001/api/contact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "SelfTest", email: "methukuakash092@gmail.com", message: "Test Message!" })
}).then(r => r.json()).then(console.log).catch(console.error);
