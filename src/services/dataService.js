// --- Funções Utilitárias e de Dados ---

// Hash de Segurança para o PIN
export const hashPin = async (pin) => {
  if (!pin) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Formatação de Telefone
export const formatPhone = (val) => {
  if (!val) return '';
  val = val.replace(/\D/g, "");
  if (val.length > 11) val = val.slice(0, 11);
  if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
  if (val.length > 7) val = `${val.slice(0, 7)}-${val.slice(7)}`;
  return val;
};

// Obter Nome do Dia
export const getDayName = (dateString) => {
    try {
        const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        let parts = dateString.split('/');
        const date = new Date(parts[2], parts[1] - 1, parts[0]);
        return days[date.getDay()];
    } catch (e) {
        return 'Dia da semana';
    }
};

// Processamento de CSV
export const parseCSV = (inputText, subscribers, msgConfig) => {
    if (!inputText) return [];
    const lines = inputText.split('\n');
    
    return lines.map((line, id) => {
      let parts = line.split(',');
      if (parts.length < 2 && line.includes(';')) parts = line.split(';');

      const [nome, tel, dataStr, hora, profissional] = parts;
      if (!nome || !tel) return null;
      
      const cleanPhone = tel.trim().replace(/\D/g, '');
      const subscriber = subscribers.find(s => s.phone === cleanPhone);
      const nomeProfissional = profissional ? profissional.trim() : 'Psicólogo(a)';
      
      let timeLabel = "Data Inválida";
      let reminderType = null;
      let messageBody = "";
      let isoDate = "";

      if (dataStr && hora) {
        try {
            isoDate = dataStr.trim();
            if (isoDate.includes('/')) {
                const [d, m, y] = isoDate.split('/');
                isoDate = `${y}-${m}-${d}`;
            }
            
            const sessionDate = new Date(`${isoDate}T${hora.trim()}:00`);
            const now = new Date();
            const diffHours = (sessionDate - now) / (1000 * 60 * 60);

            if (diffHours < 0) {
                timeLabel = "Já passou";
            } else if (diffHours <= 12) {
                timeLabel = "Faltam < 12h";
                reminderType = "12h";
                messageBody = msgConfig.msg12h.replace('{nome}', nome.split(' ')[0]).replace('{data}', dataStr).replace('{hora}', hora.trim()).replace('{profissional}', nomeProfissional);
            } else if (diffHours <= 30) { 
                timeLabel = "Faltam ~24h";
                reminderType = "24h";
                messageBody = msgConfig.msg24h.replace('{nome}', nome.split(' ')[0]).replace('{data}', dataStr).replace('{hora}', hora.trim()).replace('{profissional}', nomeProfissional);
            } else if (diffHours <= 54) {
                timeLabel = "Faltam ~48h";
                reminderType = "48h";
                messageBody = msgConfig.msg48h.replace('{nome}', nome.split(' ')[0]).replace('{data}', dataStr).replace('{hora}', hora.trim()).replace('{profissional}', nomeProfissional);
            } else {
                timeLabel = `Faltam ${Math.round(diffHours / 24)} dias`;
            }
        } catch (e) {
            timeLabel = "Erro Data";
        }
      }

      return { 
        id, nome, cleanPhone, data: dataStr, isoDate, hora, profissional: nomeProfissional,
        isSubscribed: !!subscriber, pushToken: subscriber?.pushToken,
        timeLabel, reminderType, messageBody
      };
    }).filter(Boolean);
};