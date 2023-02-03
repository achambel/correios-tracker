import { getGoogleAuthToken } from "./auth/google.js";
import { setUserToken } from "./backend.js";
import { googleSignin } from "./service.js";

async function authorizeGoogle() {
  try {
    const gToken = await getGoogleAuthToken();
    const { token } = await googleSignin({ token: gToken });
    await setUserToken({ token });
    window.location.href = chrome.runtime.getURL("index.html");
  } catch (err) {
    document.querySelector(".message").classList.remove("hidden");
    document.querySelector(".error-message").textContent = err.message;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const googleAuthBtn = document.querySelector("#google-auth-btn");
  googleAuthBtn.addEventListener("click", authorizeGoogle);
});
