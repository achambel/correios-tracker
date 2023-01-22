import { isEmpty } from "./utils.js";

function getTrackerAuthHeader() {
  const app_id = "nemepngjloclnhiflpcgkcbggnfbhjni"; //chrome.runtime.id;
  const client_type = "chrome_extension";

  const toEncode = `app_id=${app_id}&client_type=${client_type}`;
  return btoa(toEncode);
}

async function getUserProfile() {
  return chrome.identity.getProfileUserInfo();
}

export async function crawler({ referenceNumber, user_stats }) {
  const url = `https://trackerit.fly.dev/api/tracker/correios/${referenceNumber}`;
  const { email, id } = await getUserProfile();
  const data = {
    user: {
      name: id,
      email,
    },
    user_stats,
  };

  let objeto = {
    codigo: referenceNumber,
    historico: [],
  };
  let response;

  try {
    response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-tracker-auth": getTrackerAuthHeader(),
      },
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response?.ok) {
      console.warn(`Server returned a non-success status`, response);
      return objeto;
    }

    const item = await response.json();
    objeto.historico = item.eventos ? prepareHistory(item.eventos) : [];

    return objeto;
  } catch (error) {
    console.error("Error on getting objeto from server", error);
  }
}

function prepareHistory(eventos) {
  const historico = eventos.map((e) => ({
    data: e.dtHrCriado,
    situacao: e.descricao,
    local: getLocal(e.unidade),
    detalhes: getLocal(e.unidadeDestino),
  }));

  return historico;
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
