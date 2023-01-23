import { Item } from "./item.js";
import { isEmpty } from "./utils.js";

function getTrackerAuthHeader() {
  const app_id = chrome.runtime.id;
  const client_type = "chrome_extension";

  const toEncode = `app_id=${app_id}&client_type=${client_type}`;
  return btoa(toEncode);
}

export async function crawler({ referenceNumber, userData }) {
  const url = `https://trackerit.fly.dev/api/tracker/correios/${referenceNumber}`;

  let objeto = new Item(referenceNumber);

  let response;

  try {
    response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-tracker-auth": getTrackerAuthHeader(),
      },
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
