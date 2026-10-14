/**
 * Envia uma mensagem (HTML) pelo bot do Telegram.
 * Retorna true quando a API do Telegram confirmou o envio.
 */
export async function sendTelegramMessage(botToken: string, chatId: number, text: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    return response.ok;
  } catch (err) {
    console.error('Erro ao enviar mensagem Telegram:', err);
    return false;
  }
}

/** Escapa texto dinâmico (descrições, nomes) para uso seguro em parse_mode HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
