import { Item } from "./item.js";
import { isEmpty } from "./utils.js";

// const BASE_URL = "https://trackerit.fly.dev";
const BASE_URL = "http://localhost:4000";

function getClientHeader() {
  const browserClients = {
    ["chrome-extension"]: "chrome_extension",
  };

  const [extension] = chrome.runtime.getURL("").split("://");

  const client_type = browserClients[extension];
  const app_id = chrome.runtime.id;

  const toEncode = `app_id=${app_id}&client_type=${client_type}`;
  return btoa(toEncode);
}

function getBaseHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-tracker-client": getClientHeader(),
  };
}

export async function crawler({ referenceNumber, userData, token = "" }) {
  const url = new URL(`/api/tracker/correios/${referenceNumber}`, BASE_URL);

  let objeto = new Item(referenceNumber);

  let response;

  try {
    response = await fetch(url, {
      headers: { ...getBaseHeaders(), Authorization: `Bearer ${token}` },
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (!response?.ok) {
      objeto.lastStatus = `Erro ao verificar status do objeto: ${response.status} ${response.statusText}`;
      return objeto;
    }

    const item = await response.json();
    objeto.lastStatus = item.mensagem;
    objeto.isSuccess = true;

    if (item.eventos) {
      objeto.eventos = prepareEventos(item.eventos);
    }

    return objeto;
  } catch (error) {
    console.error("Error on getting objeto from server", error);
    objeto.lastStatus = `Não foi possível verificar o status do objeto: ${error.message}`;
    return objeto;
  }
}

function prepareEventos(eventos = []) {
  const events = eventos.map((e) => ({
    data: e.dtHrCriado,
    situacao: e.descricao,
    local: getLocal(e.unidade),
    detalhes: getLocal(e.unidadeDestino),
  }));

  return events;
}

function getLocal(unidade) {
  if (!unidade) return "";

  if (isEmpty(unidade.endereco)) {
    return `${unidade.tipo}: ${unidade.nome}`;
  }

  const { logradouro, numero, bairro, cep, cidade, uf } = unidade.endereco;

  const endereco = [logradouro, numero, bairro, cep, cidade, uf]
    .filter((item) => item)
    .join(", ");

  return `${unidade.tipo}: ${endereco}`;
}

export async function googleSignin({ token = "" }) {
  if (!token) {
    throw new Error("Invalid token");
  }

  const url = new URL("/api/tracker/auth/google", BASE_URL);

  const response = await fetch(url, {
    headers: getBaseHeaders(),
    method: "POST",
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(
      `Unable to get a success response from our server! Status is: ${response.status}`
    );
  }

  const apiToken = await response.json();

  return apiToken;
}
