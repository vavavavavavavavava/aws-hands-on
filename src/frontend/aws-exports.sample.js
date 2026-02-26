window.awsConfig = {
  Auth: {
    region: "ap-northeast-1",
    userPoolId: "ap-northeast-1_yourUserPoolId",
    userPoolWebClientId: "yourAppClientId",
    mandatorySignIn: true
  },
  apiBaseUrl: "https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev"
};
