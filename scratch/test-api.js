async function test() {
  const res = await fetch('http://localhost:3000/api/sales?clientId=client-1&store=Combined');
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text.substring(0, 200));
}
test();
