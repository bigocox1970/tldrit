exports.handler = async function(event, context) {
  console.log('Hello function invoked');
  return {
    statusCode: 200,
    body: "Hello from Netlify Functions!"
  };
}; 