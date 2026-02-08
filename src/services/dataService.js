

// PASSO 16/45: normalização de telefone (BR) para reduzir duplicidade/colisão
// - Mantém somente dígitos
// - Remove zeros à esquerda
// - Se vier com 10/11 dígitos (DDD+Número), prefixa 55
// - Se já vier com 12/13 (55+DDD+Número), mantém

export function normalizePhoneBR(input) {
  // Canonical: DDD + número (10/11 dígitos), sem prefixo 55
  let d = String(input || "").replace(/\D/g, "");
  d = d.replace(/^0+/, "");
  if (!d) return "";

  // Se vier com 55+DDD+Número (12/13), remove o 55 e mantém DDD+Número
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    d = d.slice(2);
  }

  // Agora deve ficar 10/11 (DDD + número). Se vier diferente, devolve como está.
  return d;
}
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
  const lines = inputText
    .split("\n")
    .map((l) => String(l || "").trim())
    .filter(Boolean);

  const detectDelimiter = (line) => {
    const c = (line.match(/,/g) || []).length;
    const s = (line.match(/;/g) || []).length;
    const t = (line.match(/\t/g) || []).length;
    if (s > c && s >= t) return ";";
    if (t > c && t > s) return "\t";
    return ",";
  };

  const splitLine = (line, delim) => {
    // CSV simples com suporte a aspas (não é um parser completo RFC, mas cobre o básico)
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        // alterna estado de aspas (suporta "" como escape)
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && ch === delim) {
        out.push(cur.trim());
        cur = "";
        continue;
      }

      cur += ch;
    }

    out.push(cur.trim());
    return out.map((p) => String(p ?? "").trim());
  };

  const isHeaderLine = (parts) => {
    const probe = parts.join(" ").toLowerCase();
    return (
      probe.includes("telefone") ||
      probe.includes("celular") ||
      probe.includes("phone") ||
      probe.includes("profissional") ||
      probe.includes("terapeuta") ||
      probe.includes("hor") ||
      probe.includes("data") ||
      probe.includes("serv") ||
      probe.includes("local") ||
      probe.startsWith("id") ||
      probe.includes("external")
    );
  };

  const normalizeHeaderKey = (k) =>
    String(k || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");

  const headerToField = (key) => {
    const k = normalizeHeaderKey(key);

    if (["id", "codigo", "cod", "externalid", "idexterno", "idsessao"].includes(k)) return "externalId";
    if (["nome", "paciente", "cliente"].includes(k)) return "nome";
    if (["telefone", "celular", "whatsapp", "fone", "phone"].includes(k)) return "tel";
    if (["data", "date", "dia"].includes(k)) return "dataStr";
    if (["hora", "horario", "time"].includes(k)) return "hora";
    if (["profissional", "terapeuta", "psicologo", "fono", "nutri", "medico"].includes(k)) return "profissional";
    if (["servico", "servico", "servicotype", "service", "especialidade"].includes(k)) return "serviceType";
    if (["local", "sala", "unidade", "location"].includes(k)) return "location";

    return null;
  };

  // Detecta delimiter e header (primeira linha)
  const firstLine = lines[0] || "";
  const delim = detectDelimiter(firstLine);
  const firstParts = splitLine(firstLine, delim);

  let headerMap = null;
  let dataStartIndex = 0;

  if (isHeaderLine(firstParts)) {
    headerMap = {};
    firstParts.forEach((col, i) => {
      const field = headerToField(col);
      if (field) headerMap[field] = i;
    });
    dataStartIndex = 1;
  }

  const getBy = (parts, field, fallbackIndex) => {
    if (headerMap && headerMap[field] !== undefined) {
      return parts[headerMap[field]] ?? "";
    }
    return parts[fallbackIndex] ?? "";
  };

  return lines
    .slice(dataStartIndex)
    .map((line, idx) => {
      const parts = splitLine(line, delim);

      let externalId = "";
      let nome = "";
      let tel = "";
      let dataStr = "";
      let hora = "";
      let profissional = "";
      let serviceType = "";
      let location = "";

      if (headerMap) {
        // Mapeado por cabeçalho
        externalId = getBy(parts, "externalId", 0);
        nome = getBy(parts, "nome", 1);
        tel = getBy(parts, "tel", 2);
        dataStr = getBy(parts, "dataStr", 3);
        hora = getBy(parts, "hora", 4);
        profissional = getBy(parts, "profissional", 5);
        serviceType = getBy(parts, "serviceType", 6);
        location = getBy(parts, "location", 7);
      } else {
        // Sem cabeçalho: mantemos compatibilidade com os dois formatos conhecidos
        if (parts.length >= 8) {
          [externalId, nome, tel, dataStr, hora, profissional, serviceType, location] = parts;
        } else {
          [nome, tel, dataStr, hora, profissional] = parts;
        }
      }

      if (!nome || !tel) return null;

      const cleanPhone = normalizePhoneBR(tel);

      // Matching por telefone (padrão)
      let subscriber = subscribers.find((s) => s.phone === cleanPhone);

      // Fallback por email no CSV (se existir no row) — mantém compatível sem quebrar
      const maybeEmail = String(getBy(parts, "email", "") || "").toLowerCase().trim();
      if (!subscriber && maybeEmail) {
        subscriber = subscribers.find((s) => String(s.email || "").toLowerCase().trim() === maybeEmail);
      }

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
        id: idx + dataStartIndex, // id interno da lista (UI)
        externalId: String(externalId || "").trim(),
        nome,
        cleanPhone,
        data: dataStr,
        isoDate,
        hora: time,
        profissional: nomeProfissional,
        serviceType: service,
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

