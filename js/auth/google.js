const clientID =
  "571056409163-ca22fgdlbeu99nprshf9kvufeqdpj123.apps.googleusercontent.com";

function authorize() {
  const redirectURL = chrome.identity.getRedirectURL("index.html");
  const scopes = ["email", "profile"];
  const endpoint = "https://accounts.google.com/o/oauth2/auth";

  const url = new URL(endpoint);
  url.searchParams.set("client_id", clientID);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("redirect_uri", redirectURL);
  url.searchParams.set("scope", scopes.join(" "));

  return chrome.identity.launchWebAuthFlow({
    interactive: true,
    url: url.toString(),
  });
}

export async function getGoogleAuthToken() {
  try {
    const response = await authorize();
    const url = new URL(response);
    const params = new URLSearchParams(url.hash);
    const token = params.get("#access_token");

    return token;
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
}
