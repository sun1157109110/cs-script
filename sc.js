function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function exampleFunction() {
  console.log("Start");

  await delay(1000);
  console.log("Middle");
  
  await delay(1000);
  console.log("End");
}

exampleFunction();
console.log(1);
