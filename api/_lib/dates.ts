/**
 * Retorna componentes de data e hora rigorosamente calculados no fuso horário oficial de Brasília (America/Sao_Paulo).
 * Garante que lançamentos, consultas e lembretes coincidam com o dia civil do usuário no Brasil,
 * independente da localização dos servidores da Vercel (geralmente UTC).
 */
export function getBrasiliaDateParts(now: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = parseInt(get('year'), 10);
  const month = parseInt(get('month'), 10);
  const day = parseInt(get('day'), 10);
  // Intl pode devolver "24" para meia-noite em alguns ambientes
  const hour = parseInt(get('hour'), 10) % 24;
  const monthFormatted = get('month');
  const dayFormatted = get('day');
  const timeStr = `${String(hour).padStart(2, '0')}:${get('minute')}`;
  const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;
  const formattedDate = `${dayFormatted}/${monthFormatted}/${year}`;

  return { dateStr, formattedDate, timeStr, year, month, day, hour, monthFormatted };
}
