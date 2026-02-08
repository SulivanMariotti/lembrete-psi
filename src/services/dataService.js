// --- Funções Utilitárias e de Dados ---

// Hash de Segurança para o PIN
export const hashPin = async (pin) => {
  if (!pin) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

// Formatação de Telefone
export const formatPhone = (val) => {
  if (!val) return "";
  val = val.replace(/\D/g, "");
  if (val.length > 11) val = val.slice(0, 11);
  if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
  if (val.length > 7) val = `${val.slice(0, 7)}-${val.slice(7)}`;
  return val;
};

// Obter Nome do Dia
export const getDayName = (dateString) => {
  try {
    const days = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ];
    let parts = dateString.split("/");
    const date = new Date(parts[2], parts[1] - 1, parts[0]);
    return days[date.getDay()];
  } catch (e) {
    return "Dia da semana";
  }
};

const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

const normalizeISODate = (raw) => {
  let isoDate = String(raw || "").trim();
  if (!isoDate) return "";

  // Se vier DD/MM/YYYY -> YYYY-MM-DD
  if (isoDate.includes("/")) {
    const [d, m, y] = isoDate.split("/");
    if (y && m && d) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Se já vier YYYY-MM-DD, mantém
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;

  // Tentativa simples para "DD-MM-YYYY"
  if (/^\d{2}-\d{2}-\d{4}$/.test(isoDate)) {
    const [d, m, y] = isoDate.split("-");
    return `${y}-${m}-${d}`;
  }

  return isoDate;
};

const normalizeTime = (raw) => {
  const t = String(raw || "").trim();
  if (!t) return "";
  // aceita "9:00" -> "09:00"
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return `${String(m[1]).padStart(2, "0")}:${m[2]}`;
  return t;
};

const normalizeService = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return "";
  const low = s.toLowerCase();

  // normalizações comuns
  if (low.includes("psico")) return "psicologia";
  if (low.includes("fono")) return "fonoaudiologia";
  if (low.includes("nutri")) return "nutricao";
  if (low.includes("neuro")) return "neuropsicologia";

  // fallback: slug simples
  return low
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
};

// Processamento de CSV (aceita formato antigo e novo)
// Antigo: nome, tel, data, hora, profissional
// Novo:   id, nome, tel, data, hora, profissional, serviço, local
export const parseCSV = (inputText, subscribers, msgConfig) => {
  if (!inputText) return [];
  const lines = inputText.split("\n").map((l) => String(l || "").trim()).filter(Boolean);

  return lines
    .map((line, idx) => {
      // separador: , ou ;
      let parts = line.split(",");
      if (parts.length < 2 && line.includes(";")) parts = line.split(";");

      parts = parts.map((p) => String(p ?? "").trim());

      // ignora cabeçalho típico
      const headerProbe = parts.join(" ").toLowerCase();
      if (
        headerProbe.includes("telefone") ||
        headerProbe.includes("profissional") ||
        headerProbe.startsWith("id ") ||
        headerProbe.startsWith("id,") ||
        headerProbe.startsWith("id;")
      ) {
        // Se for a primeira linha e parecer header, ignora
        if (idx === 0) return null;
      }

      let externalId = "";
      let nome = "";
      let tel = "";
      let dataStr = "";
      let hora = "";
      let profissional = "";
      let serviceType = "";
      let location = "";

      // Novo formato (>= 8 colunas)
      if (parts.length >= 8) {
        [externalId, nome, tel, dataStr, hora, profissional, serviceType, location] = parts;
      } else {
        // Formato antigo
        [nome, tel, dataStr, hora, profissional] = parts;
      }

      if (!nome || !tel) return null;

      const cleanPhone = onlyDigits(tel);
      const subscriber = subscribers.find((s) => s.phone === cleanPhone);

      const nomeProfissional = profissional ? profissional.trim() : "Profissional";
      const isoDate = normalizeISODate(dataStr);
      const time = normalizeTime(hora);
      const service = normalizeService(serviceType);
      const place = String(location || "").trim();

      let timeLabel = "Data Inválida";
      let reminderType = null;
      let messageBody = "";

      if (isoDate && time) {
        try {
          const sessionDate = new Date(`${isoDate}T${time}:00`);
          const now = new Date();
          const diffHours = (sessionDate - now) / (1000 * 60 * 60);

          if (diffHours < 0) {
            timeLabel = "Já passou";
          } else if (diffHours <= 12) {
            timeLabel = "Faltam < 12h";
            reminderType = "12h";
            messageBody = msgConfig.msg12h
              .replace("{nome}", String(nome).split(" ")[0])
              .replace("{data}", dataStr)
              .replace("{hora}", time)
              .replace("{profissional}", nomeProfissional);
          } else if (diffHours <= 30) {
            timeLabel = "Faltam ~24h";
            reminderType = "24h";
            messageBody = msgConfig.msg24h
              .replace("{nome}", String(nome).split(" ")[0])
              .replace("{data}", dataStr)
              .replace("{hora}", time)
              .replace("{profissional}", nomeProfissional);
          } else if (diffHours <= 54) {
            timeLabel = "Faltam ~48h";
            reminderType = "48h";
            messageBody = msgConfig.msg48h
              .replace("{nome}", String(nome).split(" ")[0])
              .replace("{data}", dataStr)
              .replace("{hora}", time)
              .replace("{profissional}", nomeProfissional);
          } else {
            timeLabel = `Faltam ${Math.round(diffHours / 24)} dias`;
          }
        } catch (e) {
          timeLabel = "Erro Data";
        }
      }

      return {
        id: idx, // id interno da lista (UI)
        externalId: String(externalId || "").trim(), // ID vindo da planilha (se houver)
        nome,
        cleanPhone,
        data: dataStr,
        isoDate,
        hora: time,
        profissional: nomeProfissional,
        serviceType: service, // psicologia | fonoaudiologia | nutricao | neuropsicologia | etc
        location: place,
        isSubscribed: !!subscriber,
        pushToken: subscriber?.pushToken,
        timeLabel,
        reminderType,
        messageBody,
      };
    })
    .filter(Boolean);
};
