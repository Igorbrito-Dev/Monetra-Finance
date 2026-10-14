import OpenAI, { toFile } from 'openai';

/**
 * Faz o download do arquivo de voz/áudio a partir dos servidores do Telegram em memória (Zero-VPS)
 */
export async function downloadTelegramVoiceBuffer(
  botToken: string,
  fileId: string
): Promise<{ buffer: Buffer; filename: string }> {
  // 1. Obtém o file_path através do getFile
  const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
  const fileRes = await fetch(getFileUrl);
  if (!fileRes.ok) {
    throw new Error(`Falha ao obter metadados do arquivo no Telegram: ${fileRes.statusText}`);
  }

  const fileData = await fileRes.json();
  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error('Telegram não retornou o caminho do arquivo de áudio.');
  }

  const filePath: string = fileData.result.file_path;
  const ext = filePath.split('.').pop() || 'oga';
  const filename = `voice_${Date.now()}.${ext}`;

  // 2. Faz o download do binário em memória
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const downloadRes = await fetch(downloadUrl);
  if (!downloadRes.ok) {
    throw new Error(`Falha ao baixar arquivo de áudio do Telegram: ${downloadRes.statusText}`);
  }

  const arrayBuffer = await downloadRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer, filename };
}

/**
 * Transcreve áudio em português utilizando a OpenAI API com o modelo Whisper
 */
export async function transcribeAudioWithWhisper(
  audioBuffer: Buffer,
  filename: string,
  apiKey?: string
): Promise<string> {
  const token = apiKey || process.env.OPENAI_API_KEY;
  if (!token) {
    throw new Error('Chave OPENAI_API_KEY não configurada para transcrição com Whisper.');
  }

  const openai = new OpenAI({ apiKey: token });

  // Converte o buffer em um arquivo compatível com o cliente OpenAI sem gravar no disco
  const file = await toFile(audioBuffer, filename);

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'pt',
    temperature: 0.2,
  });

  return transcription.text.trim();
}
