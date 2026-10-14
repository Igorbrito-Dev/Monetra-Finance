# TELEGRAM_SETUP.md — Guia de Configuração do Bot do Telegram com IA & Voz

Este documento explica como criar seu bot no Telegram, configurar a transcrição de voz com OpenAI Whisper, ativar o pareamento por código de 6 dígitos e vincular o webhook à sua aplicação.

---

## 1. Criar o Bot no Telegram

1. Abra o Telegram e pesquise pelo usuário oficial **`@BotFather`**.
2. Envie o comando `/newbot`.
3. Escolha um nome amigável para o seu bot (ex: `Monetra Finance Assistant`).
4. Escolha um username único terminado em `bot` (ex: `MonetraFinanceOficialBot`).
5. O `@BotFather` responderá com uma mensagem contendo seu **Token de Acesso da API**:
   ```text
   Use this token to access the HTTP API:
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
   Guarde este token para configurar nas variáveis de ambiente (`TELEGRAM_BOT_TOKEN`).

---

## 2. Personalizar o Bot (Opcional, mas Recomendado)

No `@BotFather`:
- `/setdescription`: Defina a descrição que os usuários verão antes de iniciar a conversa.
  - *Exemplo:* "Assistente inteligente de gestão financeira pessoal com IA e reconhecimento de voz."
- `/setuserpic`: Envie um avatar/logo para seu bot.
- `/setcommands`: Configure a lista de comandos rápidos:
  ```text
  saldo - Consulta o saldo consolidado de suas contas
  gastos - Resumo de despesas e receitas do mês atual
  limite - Consulta o teto orçamentário e gastos acumulados
  vincular - Vincula sua conta usando o código de 6 dígitos
  ```

---

## 3. Como Funciona a Sincronização por Código de 6 Dígitos

1. O usuário acessa a aplicação web do **Monetra Finance** e clica no ícone do Telegram na barra superior.
2. O sistema gera automaticamente um **código numérico aleatório de 6 dígitos** (ex: `839201`), válido por 15 minutos.
3. O usuário tem duas opções simples:
   - **Opção A (1 Clique):** Clicar no botão **"Abrir no Telegram"**. O link direto abrirá o Telegram já com o comando `/start 839201`.
   - **Opção B:** Copiar o código e simplesmente digitar `839201` na conversa do bot.
4. O webhook serverless intercepta a mensagem, valida o código na tabela `telegram_link_tokens` e vincula o `telegram_chat_id` ao perfil do usuário no Supabase.
5. O bot envia uma mensagem de confirmação e libera todas as operações com IA.

---

## 4. Transcrição de Áudio com OpenAI Whisper

O bot possui suporte nativo a mensagens de voz (`voice`) e arquivos de áudio (`audio`):

1. **Gravação de Áudio:** O usuário aperta o microfone no Telegram e fala normalmente:
   - *"Gastei 45 reais na farmácia no débito"*
   - *"Quanto gastei na fatura deste mês e do mês que vem?"*
   - *"Definir meu teto de gastos mensal em R$ 3.500"*
   - *"Qual é o meu saldo hoje?"*
2. **Processamento Serverless em Memória:**
   - O webhook na Vercel recebe o payload do Telegram.
   - Faz o download do stream de áudio diretamente em buffer de memória (sem salvar em disco).
   - Envia o áudio para a API do OpenAI Whisper (`whisper-1`) em português (`language: 'pt'`).
   - Retorna o texto transcrito com alta precisão fonética e gramatical.
3. **Execução pelo Agente:**
   - O bot responde mostrando o que compreendeu do áudio (`🎙️ "Gastei 45 reais na farmácia no débito"`).
   - Executa a ferramenta financeira correspondente via LangChain (`criar_transacao`, `consultar_saldo`, etc.).
   - Emite alertas proativos caso o usuário atinja mais de 80% do seu orçamento mensal.

---

## 5. Como Ativar o Webhook na Vercel

Após o deploy da aplicação na Vercel:

Substitua `<SEU_TOKEN>`, `<SUA_URL_VERCEL>` e `<SEU_SEGREDO>` e execute a requisição:

```bash
curl -F "url=https://seu-projeto.vercel.app/api/telegram/webhook" \
     -F "secret_token=seu_segredo_aleatorio" \
     https://api.telegram.org/bot<SEU_TOKEN>/setWebhook
```

Para verificar o status do webhook a qualquer momento:
```bash
https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo
```
