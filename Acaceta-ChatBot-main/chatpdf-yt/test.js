const Replicate = require('replicate');

// Ensure the API token is set in your environment
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function testModel() {
  try {
    const output = await replicate.run(
      "meta/meta-llama-3-8b",
      {
        input: {
          // Your model input here
          prompt: "Translate the following English text to French: 'Hello, how are you?'"
        }
      }
    );
    console.log(output);
  } catch (error) {
    console.error("Error calling Replicate API", error);
  }
}

testModel();

